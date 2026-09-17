// Планировщик севооборота — docs/sevooborot.html.
// Ванильный контроллер (Alpine на статических страницах сайта нет, см.
// page-shell.js). Логику подбора/проверок держит общий модуль
// rotation-logic.js; данные культур и семейств инлайнит build-sevooborot.js
// в window.ROTATION_DATA ({ plants:[...], families:[...] }).
//
// НЕ редактировать sevooborot.<hash>.js — это сгенерированная копия
// (version-assets.js). Править этот файл.

(function () {
  'use strict';
  var RL = window.RotationLogic;
  var DATA = window.ROTATION_DATA || { plants: [], families: [] };
  var ctx = RL.makeContext(DATA.plants, DATA.families);
  var EMPTY = RL.EMPTY, SIDER = RL.SIDER, START_YEAR = RL.START_YEAR;

  var LETTERS = ['A', 'Б', 'В', 'Г'];
  var LIMITS = { beds: [1, 10], secs: [1, 4], years: [3, 6] };
  var LS_KEY = 'garden.rotation';
  // sevooborot.html лежит в docs/sevooborot/ — иконки культур на уровень выше.
  var ICON_BASE = '../icons/plants/';

  // набор по умолчанию — распространённый огород, разные семейства
  var DEFAULT_POOL = ['kapusta', 'kartofel', 'morkov', 'gorokh', 'ogurets', 'luk', 'svekla', 'tomat']
    .filter(function (id) { return ctx.cropById[id]; });

  var FAM_ORDER = DATA.families.map(function (f) { return f.id; });

  var state = load();

  // ---------- state ----------
  function poolSig(pool) { return pool.slice().sort().join(','); }

  function clampDim(k, v) {
    var lo = LIMITS[k][0], hi = LIMITS[k][1];
    v = parseInt(v, 10);
    if (isNaN(v)) return { beds: 4, secs: 1, years: 4 }[k];
    return Math.min(hi, Math.max(lo, v));
  }

  function load() {
    var p = new URLSearchParams(location.search);
    var src = null;
    if (p.get('beds') || p.get('cells')) {
      src = {
        beds: p.get('beds'), secs: p.get('secs'), years: p.get('years'),
        pool: (p.get('pool') || '').split(',').filter(Boolean),
        cells: (p.get('cells') || '').split(','),
      };
    } else {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (raw) src = JSON.parse(raw);
      } catch (e) { /* ignore */ }
    }
    var beds = clampDim('beds', src && src.beds), secs = clampDim('secs', src && src.secs),
      years = clampDim('years', src && src.years);
    var pool = (src && src.pool || []).filter(function (id) { return ctx.cropById[id]; });
    if (!pool.length) pool = DEFAULT_POOL.slice();

    var st = { beds: beds, secs: secs, years: years, pool: pool, plan: RL.blankPlan(beds, secs, years), builtFrom: poolSig(pool) };

    var flat = src && src.cells;
    if (flat && flat.length > 1) {
      var i = 0;
      for (var b = 0; b < beds; b++) for (var s = 0; s < secs; s++) for (var y = 0; y < years; y++) {
        var v = flat[i++];
        if (v === 's') v = SIDER;
        if (v === '-' || v === undefined) v = EMPTY;
        if (v !== EMPTY && v !== SIDER && !ctx.cropById[v]) v = EMPTY;
        st.plan[b][s][y] = v;
      }
    } else {
      RL.buildFull(ctx, st.plan, dims(st), st.pool);
    }
    return st;
  }

  function dims(st) { return { beds: st.beds, secs: st.secs, years: st.years }; }

  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        beds: state.beds, secs: state.secs, years: state.years,
        pool: state.pool, cells: flatCells(),
      }));
    } catch (e) { /* ignore */ }
  }

  function flatCells() {
    var out = [];
    for (var b = 0; b < state.beds; b++) for (var s = 0; s < state.secs; s++) for (var y = 0; y < state.years; y++) {
      var v = state.plan[b][s][y];
      out.push(v === EMPTY ? '-' : v === SIDER ? 's' : v);
    }
    return out;
  }

  // ---------- helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function famVar(fk) { return fk === 'none' ? '--fam-none' : fk === 'sider' ? '--fam-sider' : ('--fam-' + fk); }
  function famName(v) {
    if (v === EMPTY) return 'пар';
    if (v === SIDER) return 'сидераты · отдых';
    var f = ctx.families[RL.famOf(ctx, v)];
    return f ? f.name : '';
  }
  function iconImg(cropId, cls) {
    var c = ctx.cropById[cropId];
    var ic = c ? c.icon : 'sprout';
    return '<img class="' + (cls || 'pl-ic') + '" src="' + ICON_BASE + ic + '.svg" alt="" width="20" height="20" loading="lazy">';
  }

  // ---------- render ----------
  function setTrackCols() {
    document.documentElement.style.setProperty('--track-cols', 'repeat(' + state.years + ', minmax(104px, 1fr))');
  }

  function renderPalette() {
    var byFam = {};
    ctx.crops.forEach(function (c) { (byFam[c.fam] = byFam[c.fam] || []).push(c); });
    var html = FAM_ORDER.map(function (fk) {
      var f = ctx.families[fk], list = byFam[fk];
      if (!f || !list) return '';
      var chips = list.map(function (c) {
        var on = state.pool.indexOf(c.id) !== -1;
        return '<button class="rp-chip" type="button" aria-pressed="' + on + '" data-crop="' + c.id +
          '" style="--fam:var(' + famVar(fk) + ')">' + iconImg(c.id) + '<span>' + esc(c.name) + '</span></button>';
      }).join('');
      return '<div class="rp-fam-row"><span class="rp-fam-lbl"><span class="rp-dot" style="background:var(' +
        famVar(fk) + ')"></span>' + esc(f.name) + '</span>' + chips + '</div>';
    }).join('');
    $('rpPalette').innerHTML = html;
    $('rpPalCount').textContent = 'выбрано: ' + state.pool.length;
    $('rpBuild').disabled = state.pool.length === 0;
    $('rpFill').disabled = state.pool.length === 0;
    var planEmpty = true;
    for (var b = 0; b < state.beds && planEmpty; b++)
      for (var s = 0; s < state.secs && planEmpty; s++)
        for (var y = 0; y < state.years; y++) if (state.plan[b][s][y] !== EMPTY) { planEmpty = false; break; }
    $('rpDirty').classList.toggle('on', poolSig(state.pool) !== state.builtFrom && !planEmpty);
  }

  function renderLegend() {
    var used = {};
    for (var b = 0; b < state.beds; b++) for (var s = 0; s < state.secs; s++) for (var y = 0; y < state.years; y++) {
      var fk = RL.famOf(ctx, state.plan[b][s][y]);
      if (fk !== 'none' && fk !== 'sider') used[fk] = true;
    }
    var keys = FAM_ORDER.filter(function (k) { return used[k]; });
    $('rpLegend').innerHTML = keys.length
      ? keys.map(function (fk) {
        var f = ctx.families[fk];
        return '<span><span class="rp-dot" style="background:var(' + famVar(fk) + ')"></span>' +
          esc(f.name) + ' · возврат ≥ ' + f.gap + ' лет</span>';
      }).join('')
      : '<span class="rp-muted">Отметьте культуры и нажмите «Построить севооборот»</span>';
  }

  function renderHead() {
    var out = '';
    for (var y = 0; y < state.years; y++) {
      out += '<div class="rp-yh' + (y === 0 ? ' now' : '') + '">' + (START_YEAR + y) +
        '<small>' + (y === 0 ? 'сейчас' : 'год ' + (y + 1)) + '</small></div>';
    }
    $('rpHead').innerHTML = out;
  }

  function optionsHtml(sel) {
    var byFam = {};
    ctx.crops.forEach(function (c) { (byFam[c.fam] = byFam[c.fam] || []).push(c); });
    var h = '<option value="">— пусто / пар —</option>' +
      '<option value="' + SIDER + '"' + (sel === SIDER ? ' selected' : '') + '>Сидераты</option>';
    if (state.pool.length) {
      h += '<optgroup label="— мои культуры —">' +
        state.pool.map(function (id) { return ctx.cropById[id]; }).filter(Boolean)
          .sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); })
          .map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '</optgroup>';
    }
    h += FAM_ORDER.map(function (fk) {
      var f = ctx.families[fk], list = byFam[fk];
      if (!f || !list) return '';
      return '<optgroup label="' + esc(f.name) + '">' +
        list.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '</optgroup>';
    }).join('');
    return h;
  }

  function renderBoard() {
    var res = RL.analyse(ctx, state.plan, dims(state));
    var html = '';
    for (var b = 0; b < state.beds; b++) {
      var lanes = '';
      for (var s = 0; s < state.secs; s++) {
        var tag = state.secs > 1 ? '<span class="rp-lane-tag">часть ' + LETTERS[s] + '</span>' : '';
        var cells = '';
        for (var y = 0; y < state.years; y++) {
          var v = state.plan[b][s][y];
          var fk = RL.famOf(ctx, v);
          var isClash = res.clash.has(b + ':' + s + ':' + y);
          var cls = 'rp-cell' + (v === EMPTY ? ' empty' : '') + (y === 0 ? ' now' : '') + (isClash ? ' clash' : '');
          var yLabel = y === 0 ? (START_YEAR + ' · сейчас') : ((START_YEAR + y) + ' · год ' + (y + 1));
          cells += '<div class="' + cls + '" data-year="' + yLabel + '" style="--fam:var(' + famVar(fk) + ')">' +
            '<select data-b="' + b + '" data-s="' + s + '" data-y="' + y + '" aria-label="Грядка ' + (b + 1) +
            (state.secs > 1 ? ' часть ' + LETTERS[s] : '') + ', ' + (START_YEAR + y) + '">' + optionsHtml(v) + '</select>' +
            '<span class="rp-fam">' + esc(famName(v)) + '</span>' +
            (isClash ? '<span class="rp-flag">проверьте</span>' : '') + '</div>';
        }
        lanes += '<div class="rp-lane">' + tag + cells + '</div>';
      }
      var notes = res.bedNotes[b] && res.bedNotes[b].length
        ? res.bedNotes[b].map(function (t) { return '<span class="bad">' + esc(t) + '</span>'; }).join('')
        : '<span class="ok">севооборот выдержан</span>';
      html += '<div class="rp-bed">' +
        '<div class="rp-bed-label"><span class="bn">Грядка ' + (b + 1) + '</span>' +
        (state.secs > 1 ? '<span class="bs">' + state.secs + ' части</span>' : '') + '</div>' +
        '<div class="rp-lanes">' + lanes + '</div>' +
        '<div class="rp-bed-note">' + notes + '</div></div>';
    }
    $('rpBeds').innerHTML = html;
    var sels = $('rpBeds').querySelectorAll('select');
    for (var i = 0; i < sels.length; i++) {
      sels[i].addEventListener('change', function (e) {
        var el = e.target;
        state.plan[+el.dataset.b][+el.dataset.s][+el.dataset.y] = el.value;
        render();
      });
    }
  }

  // Сообщение, если выбранных культур больше, чем помещается в план.
  function renderFit() {
    var el = $('rpFit');
    if (!el) return;
    var r = RL.fitReport(ctx, state.plan, dims(state), state.pool);
    if (!r.unplaced.length) { el.hidden = true; el.textContent = ''; return; }
    var names = r.unplaced.map(function (id) { return ctx.cropById[id].name; });
    var head = esc(names.slice(0, 4).join(', '));
    var more = names.length > 4 ? ' и ещё ' + (names.length - 4) : '';
    if (r.emptyCells > 0) {
      el.innerHTML = 'Не все выбранные культуры расставлены: <b>' + head + '</b>' + more +
        '. Нажмите «Дозаполнить пустые» или «Построить севооборот».';
    } else {
      el.innerHTML = 'В план не поместились: <b>' + head + '</b>' + more +
        '. Мест под посадку ' + r.totalCells + ', а культур в наборе ' + r.poolSize +
        ' — уберите часть культур из набора, добавьте грядок или увеличьте горизонт.';
    }
    el.hidden = false;
  }

  function render() {
    state.plan = RL.resizePlan(state.plan, state.beds, state.secs, state.years);
    setTrackCols();
    $('rpBeds') && $('rpOutBeds') && ($('rpOutBeds').textContent = state.beds);
    $('rpOutSecs').textContent = state.secs;
    $('rpOutYears').textContent = state.years;
    $('rpCount').textContent = 'мест под посадку: ' + (state.beds * state.secs);
    renderPalette();
    renderLegend();
    renderHead();
    renderBoard();
    renderFit();
    $('rpShareOut').hidden = true;
    persist();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- events ----------
  function bind() {
    var incs = document.querySelectorAll('[data-rp-inc]');
    for (var i = 0; i < incs.length; i++) {
      incs[i].addEventListener('click', function (e) {
        var k = e.currentTarget.dataset.rpInc, d = +e.currentTarget.dataset.rpD;
        state[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], state[k] + d));
        render();
      });
    }
    $('rpPalette').addEventListener('click', function (e) {
      var chip = e.target.closest('.rp-chip');
      if (!chip) return;
      var id = chip.dataset.crop, idx = state.pool.indexOf(id);
      if (idx !== -1) state.pool.splice(idx, 1); else state.pool.push(id);
      render();
    });
    $('rpBuild').addEventListener('click', function () { RL.buildFull(ctx, state.plan, dims(state), state.pool); state.builtFrom = poolSig(state.pool); render(); });
    $('rpFill').addEventListener('click', function () { RL.fillCells(ctx, state.plan, dims(state), state.pool); state.builtFrom = poolSig(state.pool); render(); });
    $('rpClearFuture').addEventListener('click', function () {
      for (var b = 0; b < state.beds; b++) for (var s = 0; s < state.secs; s++) for (var y = 1; y < state.years; y++) state.plan[b][s][y] = EMPTY;
      render();
    });
    $('rpPrint').addEventListener('click', function () { window.print(); });
    $('rpReset').addEventListener('click', function () {
      state = { beds: 4, secs: 1, years: 4, pool: DEFAULT_POOL.slice(), plan: RL.blankPlan(4, 1, 4), builtFrom: '' };
      RL.buildFull(ctx, state.plan, dims(state), state.pool);
      render();
    });
    $('rpShare').addEventListener('click', onShare);
  }

  function onShare() {
    var qs = new URLSearchParams({
      beds: state.beds, secs: state.secs, years: state.years,
      pool: state.pool.join(','), cells: flatCells().join(','),
    }).toString();
    var url = location.origin + location.pathname + '?' + qs;
    try { history.replaceState(null, '', '?' + qs); } catch (e) { /* ignore */ }
    var box = $('rpShareUrl');
    $('rpShareOut').hidden = false;
    box.textContent = url;
    var sel = window.getSelection(), rng = document.createRange();
    rng.selectNodeContents(box); sel.removeAllRanges(); sel.addRange(rng);
    var ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { flash(true); }, function () { flash(fallbackCopy()); });
    } else { flash(fallbackCopy()); }
    function fallbackCopy() { try { return document.execCommand('copy'); } catch (e) { return false; } }
    function flash(good) {
      var btn = $('rpShare');
      btn.textContent = good ? 'Ссылка скопирована' : 'Выделено — скопируйте (Ctrl+C)';
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = 'Поделиться'; }, 2600);
    }
    if (ok) { /* handled via flash */ }
  }

  // ---------- go ----------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  function start() {
    if (!$('rpBeds')) return;
    bind();
    render();
  }
})();
