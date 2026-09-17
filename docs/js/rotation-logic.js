// Логика планировщика севооборота (docs/sevooborot.html).
// Общий модуль: подключается и в браузере (глобаль RotationLogic, через
// sevooborot.js), и в Node (build-sevooborot.js для SSR-снимка, тесты).
// Данные приходят снаружи — из docs/data/plants.json + rotation.json
// (в браузер инлайнятся build-sevooborot.js как window.ROTATION_DATA).
//
// Алгоритм «Построить»: жадный подбор со сдвигом по дорожкам.
// Дорожка = грядка × секция; для каждой ячейки перебираем набор культур,
// пока не найдём такую, чьё семейство: (1) не нарушает срок возврата на этой
// дорожке, (2) не повторяет семейство в этой же грядке за этот год,
// (3) не образует пару «плохие соседи» в грядке. Не нашлось — сидераты.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RotationLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EMPTY = '';
  var SIDER = 'siderat';
  var START_YEAR = new Date().getFullYear();

  // --- контекст из данных сайта ---
  // plants: массив из plants.json (нужны id, name, family, feed, perennial, icon)
  // familiesArr: rotation.families из rotation.json ([{id,name,gap,badWith[]}])
  function makeContext(plants, familiesArr) {
    var families = {};
    familiesArr.forEach(function (f) {
      families[f.id] = { id: f.id, name: f.name, gap: f.gap || 3, badWith: f.badWith || [] };
    });
    var crops = plants
      .filter(function (p) { return p.family && !p.perennial && families[p.family]; })
      .map(function (p) {
        return { id: p.id, name: p.name, fam: p.family, feed: p.feed || 2, icon: p.icon || 'sprout' };
      });
    var cropById = {};
    crops.forEach(function (c) { cropById[c.id] = c; });
    return { crops: crops, cropById: cropById, families: families };
  }

  function famOf(ctx, v) {
    if (v === EMPTY) return 'none';
    if (v === SIDER) return 'sider';
    return ctx.cropById[v] ? ctx.cropById[v].fam : 'none';
  }
  function isBad(ctx, a, b) {
    var fa = ctx.families[a], fb = ctx.families[b];
    return !!((fa && fa.badWith.indexOf(b) !== -1) || (fb && fb.badWith.indexOf(a) !== -1));
  }

  function blankPlan(beds, secs, years) {
    var p = [];
    for (var b = 0; b < beds; b++) {
      p[b] = [];
      for (var s = 0; s < secs; s++) {
        p[b][s] = [];
        for (var y = 0; y < years; y++) p[b][s][y] = EMPTY;
      }
    }
    return p;
  }

  // подрезать/дорастить план под новые размеры, сохранив что можно
  function resizePlan(plan, beds, secs, years) {
    var np = blankPlan(beds, secs, years);
    for (var b = 0; b < beds; b++)
      for (var s = 0; s < secs; s++)
        for (var y = 0; y < years; y++)
          if (plan[b] && plan[b][s] && plan[b][s][y] !== undefined) np[b][s][y] = plan[b][s][y];
    return np;
  }

  function orderedPool(ctx, poolIds) {
    return poolIds
      .map(function (id) { return ctx.cropById[id]; })
      .filter(Boolean)
      .slice()
      .sort(function (a, b) { return a.feed - b.feed || a.fam.localeCompare(b.fam); });
  }

  function famClashInLane(ctx, lane, y, fam, gap) {
    for (var k = 1; k <= gap; k++) {
      var a = lane[y - k], c = lane[y + k];
      if (a !== undefined && a !== EMPTY && a !== SIDER && famOf(ctx, a) === fam) return true;
      if (c !== undefined && c !== EMPTY && c !== SIDER && famOf(ctx, c) === fam) return true;
    }
    return false;
  }

  // Подбор культуры в ячейку. Сначала — из тех, что ещё нигде не стоят
  // (usedGlobal), чтобы задействовать весь выбранный набор, и только потом
  // допускать повтор. Не нашлось без нарушений — сидераты.
  function pickCrop(ctx, lane, y, laneIdx, pool, inBedFams, usedGlobal) {
    var fallback = null;
    for (var t = 0; t < pool.length; t++) {
      var cand = pool[(y + laneIdx + t) % pool.length];
      var gap = ctx.families[cand.fam] ? ctx.families[cand.fam].gap : 3;
      if (famClashInLane(ctx, lane, y, cand.fam, gap)) continue;   // срок возврата
      if (inBedFams.indexOf(cand.fam) !== -1) continue;            // родня в грядке
      var bad = false;
      for (var i = 0; i < inBedFams.length; i++) if (isBad(ctx, inBedFams[i], cand.fam)) { bad = true; break; }
      if (bad) continue;                                           // плохие соседи
      if (usedGlobal && usedGlobal[cand.id]) { if (!fallback) fallback = cand.id; continue; }
      return cand.id;
    }
    return fallback || SIDER;
  }

  // Заполняет ТОЛЬКО пустые ячейки (buildFull перед этим очищает всё).
  function fillCells(ctx, plan, dims, poolIds) {
    var pool = orderedPool(ctx, poolIds.length ? poolIds : ctx.crops.map(function (c) { return c.id; }));
    if (!pool.length) return plan;
    var usedGlobal = {};
    for (var bb = 0; bb < dims.beds; bb++)
      for (var ss = 0; ss < dims.secs; ss++)
        for (var yy = 0; yy < dims.years; yy++) {
          var vv = plan[bb][ss][yy];
          if (vv !== EMPTY && vv !== SIDER) usedGlobal[vv] = true;
        }
    for (var y = 0; y < dims.years; y++) {
      for (var b = 0; b < dims.beds; b++) {
        var inBedFams = [];
        for (var s0 = 0; s0 < dims.secs; s0++) {
          var v0 = plan[b][s0][y];
          if (v0 !== EMPTY && v0 !== SIDER) inBedFams.push(famOf(ctx, v0));
        }
        for (var s = 0; s < dims.secs; s++) {
          if (plan[b][s][y] !== EMPTY) continue;
          var pick = pickCrop(ctx, plan[b][s], y, b * dims.secs + s, pool, inBedFams, usedGlobal);
          plan[b][s][y] = pick;
          if (pick !== EMPTY && pick !== SIDER) { inBedFams.push(famOf(ctx, pick)); usedGlobal[pick] = true; }
        }
      }
    }
    return plan;
  }

  function buildFull(ctx, plan, dims, poolIds) {
    for (var b = 0; b < dims.beds; b++)
      for (var s = 0; s < dims.secs; s++)
        for (var y = 0; y < dims.years; y++) plan[b][s][y] = EMPTY;
    return fillCells(ctx, plan, dims, poolIds);
  }

  // Проверки: срок возврата по дорожке + соседство в грядке за год.
  // -> { bedNotes: string[][], clash: Set<"b:s:y"> }
  function analyse(ctx, plan, dims) {
    var bedNotes = [];
    var clash = new Set();
    for (var b = 0; b < dims.beds; b++) {
      var notes = [];
      for (var s = 0; s < dims.secs; s++) {
        var lane = plan[b][s];
        for (var y = 0; y < dims.years; y++) {
          var v = lane[y];
          if (v === EMPTY || v === SIDER) continue;
          var fam = famOf(ctx, v);
          var need = ctx.families[fam] ? ctx.families[fam].gap : 3;
          for (var k = 1; k <= need && y - k >= 0; k++) {
            var prev = lane[y - k];
            if (prev !== EMPTY && prev !== SIDER && famOf(ctx, prev) === fam) {
              clash.add(b + ':' + s + ':' + y);
              notes.push(ctx.families[fam].name.toLowerCase() + ' снова в ' + (START_YEAR + y) +
                ' — разрыв ' + k + ' г. вместо ' + need);
              break;
            }
          }
        }
      }
      for (var yy = 0; yy < dims.years; yy++) {
        for (var s1 = 0; s1 < dims.secs; s1++) {
          for (var s2 = s1 + 1; s2 < dims.secs; s2++) {
            var a = plan[b][s1][yy], c = plan[b][s2][yy];
            if (a === EMPTY || a === SIDER || c === EMPTY || c === SIDER) continue;
            var fa = famOf(ctx, a), fc = famOf(ctx, c);
            if (isBad(ctx, fa, fc)) {
              clash.add(b + ':' + s1 + ':' + yy); clash.add(b + ':' + s2 + ':' + yy);
              notes.push(ctx.cropById[a].name + ' и ' + ctx.cropById[c].name + ' рядом в ' +
                (START_YEAR + yy) + ' — плохие соседи');
            } else if (fa === fc) {
              clash.add(b + ':' + s1 + ':' + yy); clash.add(b + ':' + s2 + ':' + yy);
              notes.push(ctx.cropById[a].name + ' и ' + ctx.cropById[c].name + ' — родня в одной грядке (' +
                (START_YEAR + yy) + ')');
            }
          }
        }
      }
      bedNotes[b] = notes.filter(function (n, i) { return notes.indexOf(n) === i; });
    }
    return { bedNotes: bedNotes, clash: clash };
  }

  // Помещается ли выбранный набор в план целиком.
  // -> { unplaced: string[] (id культур из набора, не попавших в план),
  //      emptyCells, totalCells, poolSize }
  function fitReport(ctx, plan, dims, poolIds) {
    poolIds = poolIds || [];
    var placed = {}, empty = 0, total = 0;
    for (var b = 0; b < dims.beds; b++)
      for (var s = 0; s < dims.secs; s++)
        for (var y = 0; y < dims.years; y++) {
          total++;
          var v = plan[b][s][y];
          if (v === EMPTY) empty++;
          else if (v !== SIDER) placed[v] = true;
        }
    var unplaced = poolIds.filter(function (id) { return ctx.cropById[id] && !placed[id]; });
    return { unplaced: unplaced, emptyCells: empty, totalCells: total, poolSize: poolIds.length };
  }

  return {
    EMPTY: EMPTY, SIDER: SIDER, START_YEAR: START_YEAR,
    makeContext: makeContext,
    famOf: famOf, isBad: isBad,
    blankPlan: blankPlan, resizePlan: resizePlan,
    fillCells: fillCells, buildFull: buildFull, analyse: analyse,
    fitReport: fitReport,
  };
});
