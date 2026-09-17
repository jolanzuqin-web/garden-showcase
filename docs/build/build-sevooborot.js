// Генерирует docs/sevooborot/index.html — интерактивный планировщик севооборота.
// Данные культур/семейств: docs/data/plants.json + rotation.json (из
// garden-data.xlsx через build-from-xlsx.js). Логику подбора держит общий
// модуль docs/js/rotation-logic.js; клиентский контроллер — docs/js/sevooborot.js.
// Здесь: HTML-обвязка через page-shell.js, инлайн данных в window.ROTATION_DATA
// и SSR-снимок дефолтного плана (чтобы страница была наполнена до гидрации).
//
// Порядок сборки: build-from-xlsx.js -> build-sevooborot.js -> build-sitemap.js.

const fs = require('fs');
const path = require('path');
const { escapeHtml, SITE_URL, pageShell } = require('./page-shell');
const { rotationLogicFile, sevooborotFile } = require('./version-assets');
const RL = require('../js/rotation-logic.js');

const DOCS = path.resolve(__dirname, '..');
const DATA = path.join(DOCS, 'data');
const OUT_DIR = path.join(DOCS, 'sevooborot');

const plants = JSON.parse(fs.readFileSync(path.join(DATA, 'plants.json'), 'utf8'));
const rotation = JSON.parse(fs.readFileSync(path.join(DATA, 'rotation.json'), 'utf8'));

// Тримим до нужного планировщику: id/name/family/feed/perennial/icon.
const rotPlants = plants
  .filter(p => p.family)
  .map(p => {
    const o = { id: p.id, name: p.name, family: p.family, feed: p.feed || 2, icon: p.icon || 'sprout' };
    if (p.perennial) o.perennial = true;
    return o;
  });
const ROTATION_DATA = { plants: rotPlants, families: rotation.families };

const ctx = RL.makeContext(rotPlants, rotation.families);
const START_YEAR = RL.START_YEAR;
const LETTERS = ['A', 'Б', 'В', 'Г'];
const FAM_ORDER = rotation.families.map(f => f.id);
const famVar = fk => fk === 'none' ? '--fam-none' : fk === 'sider' ? '--fam-sider' : ('--fam-' + fk);
const famName = v => v === '' ? 'пар' : v === RL.SIDER ? 'сидераты · отдых'
  : (ctx.families[RL.famOf(ctx, v)] ? ctx.families[RL.famOf(ctx, v)].name : '');
const iconImg = id => {
  const c = ctx.cropById[id];
  return `<img class="pl-ic" src="../icons/plants/${(c ? c.icon : 'sprout')}.svg" alt="" width="20" height="20" loading="lazy">`;
};

// --- дефолтный план для SSR-снимка ---
const DEFAULT_POOL = ['kapusta', 'kartofel', 'morkov', 'gorokh', 'ogurets', 'luk', 'svekla', 'tomat']
  .filter(id => ctx.cropById[id]);
const DIMS = { beds: 4, secs: 1, years: 4 };
const plan = RL.blankPlan(DIMS.beds, DIMS.secs, DIMS.years);
RL.buildFull(ctx, plan, DIMS, DEFAULT_POOL);
const analysis = RL.analyse(ctx, plan, DIMS);

// --- SSR-фрагменты (эквивалент sevooborot.js) ---
function ssrPalette() {
  const byFam = {};
  ctx.crops.forEach(c => (byFam[c.fam] = byFam[c.fam] || []).push(c));
  return FAM_ORDER.map(fk => {
    const f = ctx.families[fk], list = byFam[fk];
    if (!f || !list) return '';
    const chips = list.map(c => {
      const on = DEFAULT_POOL.indexOf(c.id) !== -1;
      return `<button class="rp-chip" type="button" aria-pressed="${on}" data-crop="${c.id}" style="--fam:var(${famVar(fk)})">${iconImg(c.id)}<span>${escapeHtml(c.name)}</span></button>`;
    }).join('');
    return `<div class="rp-fam-row"><span class="rp-fam-lbl"><span class="rp-dot" style="background:var(${famVar(fk)})"></span>${escapeHtml(f.name)}</span>${chips}</div>`;
  }).join('');
}

function ssrLegend() {
  const used = {};
  plan.flat(2).forEach(v => { const fk = RL.famOf(ctx, v); if (fk !== 'none' && fk !== 'sider') used[fk] = true; });
  return FAM_ORDER.filter(k => used[k]).map(fk => {
    const f = ctx.families[fk];
    return `<span><span class="rp-dot" style="background:var(${famVar(fk)})"></span>${escapeHtml(f.name)} · возврат ≥ ${f.gap} лет</span>`;
  }).join('');
}

function ssrHead() {
  let out = '';
  for (let y = 0; y < DIMS.years; y++) {
    out += `<div class="rp-yh${y === 0 ? ' now' : ''}">${START_YEAR + y}<small>${y === 0 ? 'сейчас' : 'год ' + (y + 1)}</small></div>`;
  }
  return out;
}

function ssrOptions(sel) {
  const byFam = {};
  ctx.crops.forEach(c => (byFam[c.fam] = byFam[c.fam] || []).push(c));
  let h = '<option value="">— пусто / пар —</option>' +
    `<option value="${RL.SIDER}"${sel === RL.SIDER ? ' selected' : ''}>Сидераты</option>`;
  h += '<optgroup label="— мои культуры —">' +
    DEFAULT_POOL.map(id => ctx.cropById[id]).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('') +
    '</optgroup>';
  h += FAM_ORDER.map(fk => {
    const f = ctx.families[fk], list = byFam[fk];
    if (!f || !list) return '';
    return `<optgroup label="${escapeHtml(f.name)}">` +
      list.map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('') +
      '</optgroup>';
  }).join('');
  return h;
}

function ssrBeds() {
  let html = '';
  for (let b = 0; b < DIMS.beds; b++) {
    let cells = '';
    for (let y = 0; y < DIMS.years; y++) {
      const v = plan[b][0][y];
      const fk = RL.famOf(ctx, v);
      const isClash = analysis.clash.has(`${b}:0:${y}`);
      const cls = 'rp-cell' + (v === '' ? ' empty' : '') + (y === 0 ? ' now' : '') + (isClash ? ' clash' : '');
      const yLabel = y === 0 ? `${START_YEAR} · сейчас` : `${START_YEAR + y} · год ${y + 1}`;
      cells += `<div class="${cls}" data-year="${yLabel}" style="--fam:var(${famVar(fk)})">` +
        `<select data-b="${b}" data-s="0" data-y="${y}" aria-label="Грядка ${b + 1}, ${START_YEAR + y}">${ssrOptions(v)}</select>` +
        `<span class="rp-fam">${escapeHtml(famName(v))}</span>` +
        (isClash ? '<span class="rp-flag">проверьте</span>' : '') + '</div>';
    }
    const notes = analysis.bedNotes[b] && analysis.bedNotes[b].length
      ? analysis.bedNotes[b].map(t => `<span class="bad">${escapeHtml(t)}</span>`).join('')
      : '<span class="ok">севооборот выдержан</span>';
    html += `<div class="rp-bed"><div class="rp-bed-label"><span class="bn">Грядка ${b + 1}</span></div>` +
      `<div class="rp-lanes"><div class="rp-lane">${cells}</div></div>` +
      `<div class="rp-bed-note">${notes}</div></div>`;
  }
  return html;
}

// --- SVG-схема правила ---
const RULE_SVG = `<svg class="rp-rule-svg" width="150" height="88" viewBox="0 0 150 88" role="img" aria-label="Схема: одно семейство не возвращается на грядку 3–4 года">
  <g font-family="Lora, serif" font-size="9" fill="currentColor">
    <rect x="4" y="30" width="30" height="26" rx="3" fill="none" stroke="currentColor"/>
    <rect x="42" y="30" width="30" height="26" rx="3" fill="none" stroke="currentColor"/>
    <rect x="80" y="30" width="30" height="26" rx="3" fill="none" stroke="currentColor"/>
    <rect x="118" y="30" width="28" height="26" rx="3" fill="none" stroke="currentColor"/>
    <text x="19" y="24" text-anchor="middle">${START_YEAR}</text>
    <text x="57" y="24" text-anchor="middle">${START_YEAR + 1}</text>
    <text x="95" y="24" text-anchor="middle">${START_YEAR + 2}</text>
    <text x="132" y="24" text-anchor="middle">${START_YEAR + 3}</text>
    <text x="19" y="47" text-anchor="middle">🥬</text>
    <text x="57" y="47" text-anchor="middle">🥕</text>
    <text x="95" y="47" text-anchor="middle">🌰</text>
    <text x="132" y="47" text-anchor="middle">🍅</text>
    <path d="M4 70 C 40 84, 96 84, 132 70" stroke="currentColor" fill="none" marker-end="url(#rp-arrow)"/>
    <text x="68" y="86" text-anchor="middle" font-size="8">родню — на прежнее место не раньше срока</text>
  </g>
  <defs><marker id="rp-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker></defs>
</svg>`;

// --- содержимое ---
const canonical = `${SITE_URL}/sevooborot/`;
const content = `<main class="content rp-page">
  <span class="rp-tape">планировщик</span>
  <h1>Севооборот на грядках</h1>
  <p class="rp-lede">Отметьте культуры, которые выращиваете — планировщик разложит их по грядкам и годам с соблюдением севооборота. Любую ячейку потом можно поправить вручную.</p>

  <aside class="rp-rule">
    ${RULE_SVG}
    <p>На одной грядке одно <b>ботаническое семейство</b> не должно повторяться 3–4 года: у родни общие вредители и болезни, они копятся в почве. Порядок по «прожорливости»: <b>сильные едоки</b> (капуста, тыквенные, паслёновые) → <b>корнеплоды и лук</b> → <b>бобовые и зелень</b>, которые почву восстанавливают. Пустой год или <b>сидераты</b> — законный способ дать грядке отдохнуть.</p>
  </aside>

  <h2><span class="rp-step">1.</span>Ваш огород</h2>
  <p class="rp-hint">Сколько грядок и на сколько частей делите каждую, если на грядке уживается несколько культур.</p>
  <div class="rp-steppers">
    <div class="rp-stepper"><span class="rp-label">Грядок</span><div class="rp-stepper-row">
      <button type="button" data-rp-inc="beds" data-rp-d="-1" aria-label="меньше грядок">−</button>
      <output id="rpOutBeds">${DIMS.beds}</output>
      <button type="button" data-rp-inc="beds" data-rp-d="1" aria-label="больше грядок">+</button></div></div>
    <div class="rp-stepper"><span class="rp-label">Частей на грядке</span><div class="rp-stepper-row">
      <button type="button" data-rp-inc="secs" data-rp-d="-1" aria-label="меньше частей">−</button>
      <output id="rpOutSecs">${DIMS.secs}</output>
      <button type="button" data-rp-inc="secs" data-rp-d="1" aria-label="больше частей">+</button></div></div>
    <div class="rp-stepper"><span class="rp-label">Горизонт, лет</span><div class="rp-stepper-row">
      <button type="button" data-rp-inc="years" data-rp-d="-1" aria-label="меньше лет">−</button>
      <output id="rpOutYears">${DIMS.years}</output>
      <button type="button" data-rp-inc="years" data-rp-d="1" aria-label="больше лет">+</button></div></div>
    <span class="rp-count" id="rpCount">мест под посадку: ${DIMS.beds * DIMS.secs}</span>
  </div>

  <h2><span class="rp-step">2.</span>Мои культуры</h2>
  <p class="rp-hint">Отметьте всё, что планируете сажать. Из этого набора строится порядок ротации. Что не отмечено — планировщик сам не поставит (но вы сможете выбрать вручную в любой ячейке).</p>
  <div class="rp-palette" id="rpPalette">${ssrPalette()}</div>
  <div class="rp-pal-actions">
    <button class="btn-rp" type="button" id="rpBuild">Построить севооборот</button>
    <button class="btn-rp ghost" type="button" id="rpFill">Дозаполнить пустые</button>
    <span class="rp-pal-count" id="rpPalCount">выбрано: ${DEFAULT_POOL.length}</span>
  </div>

  <h2><span class="rp-step">3.</span>План по годам</h2>
  <p class="rp-hint">Колонка «${START_YEAR} · сейчас» — жёлтая рамка. Кликните любую ячейку, чтобы поменять культуру, поставить «— пусто / пар —» или «сидераты». Нарушения севооборота подсвечиваются сразу.</p>
  <div class="rp-dirty" id="rpDirty">Набор культур изменился — нажмите «Построить севооборот», чтобы пересобрать план.</div>
  <div class="rp-fit" id="rpFit" hidden></div>
  <div class="rp-legend" id="rpLegend">${ssrLegend()}</div>
  <div class="rp-board">
    <div class="rp-board-inner">
      <div class="rp-head" id="rpHead">${ssrHead()}</div>
      <div id="rpBeds">${ssrBeds()}</div>
    </div>
  </div>

  <aside class="rp-goose">
    <h3 class="rp-goose-rubric">Из тетради Гуся</h3>
    <figure class="rp-goose-fig">
      <div class="rp-goose-plate">
        <span class="rp-goose-tape tl" aria-hidden="true"></span>
        <span class="rp-goose-tape br" aria-hidden="true"></span>
        <img class="rp-goose-img" src="../img/goose/sevooborot.webp" alt="Гусь-смотритель со своей тетрадью" width="640" height="640" loading="lazy">
      </div>
      <figcaption class="rp-goose-cap">что где росло — всё тут</figcaption>
    </figure>
    <blockquote class="rp-goose-quote">«На тот же клин ту же родню верну не раньше чем через четыре года, — Гусь припечатывает лапой тетрадь. — Вернёшь раньше — считай, своих же вредителей и подкормил. А горох с фасолью суй хоть каждый год: они землю не грабят, а кормят».</blockquote>
  </aside>

  <div class="rp-actions">
    <button class="btn-rp ghost" type="button" id="rpClearFuture">Очистить будущие годы</button>
    <button class="btn-rp ghost" type="button" id="rpPrint">Распечатать</button>
    <button class="btn-rp ghost" type="button" id="rpShare">Поделиться</button>
    <button class="btn-rp ghost" type="button" id="rpReset">Сбросить</button>
  </div>
  <div class="rp-share-out" id="rpShareOut" hidden>
    <div class="rp-share-url" id="rpShareUrl"></div>
    <p class="rp-share-hint">Ссылка со всем планом — открывается сразу с этой раскладкой.</p>
  </div>

  <script>window.ROTATION_DATA = ${JSON.stringify(ROTATION_DATA)};</script>
</main>`;

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Планировщик севооборота — По саду',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    url: canonical,
    inLanguage: 'ru',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    description: 'Раскладка огородных культур по грядкам и годам с соблюдением севооборота: срок возврата семейства, совместимость соседей, сидераты.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Севооборот', item: canonical },
    ],
  },
];

const html = pageShell({
  title: 'Севооборот на грядках — планировщик чередования культур | По саду',
  description: 'Планировщик севооборота: расставьте огородные культуры по грядкам и годам так, чтобы родственные растения не возвращались на своё место раньше срока. Проверка совместимости, сидераты, печать плана.',
  bodyClass: 'sevooborot',
  content,
  canonical,
  active: 'sevooborot',
  calendarHref: '../index.html',
  articlesHref: '../articles/index.html',
  plantsHref: '../plants/index.html',
  sevooborotHref: 'index.html',
  footerText: 'Сроки возврата культур и совместимость — по открытым агрономическим источникам (iplants.ru, ogorod.ru, plantopedia.ru и др.).',
  jsonLd,
  bodyEnd: `<script src="../js/${rotationLogicFile}"></script>\n<script src="../js/${sevooborotFile}"></script>`,
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');

console.log(`sevooborot/index.html: ${ctx.crops.length} культур, ${rotation.families.length} семейств, SSR-план ${DIMS.beds}×${DIMS.secs}×${DIMS.years}.`);
