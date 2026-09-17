// Собирает docs/data/*.json и bundle.js из единой книги garden-data.xlsx.
// Заменяет parse-data.js + build-full-data.js: больше нет regex-парсинга
// прозы, посезонного сдвига месяцев и merge-хаков - каждая строка Calendar
// уже содержит то, что должно попасть на сайт, для конкретного региона.
//
// Столбец "source" в Calendar/Plants — только для редакторской трассируемости
// (откуда взят факт/правка), в JSON для сайта не идёт.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { MONTH_NAMES } = require('../js/garden-logic');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'data');
const INDEX_HTML = path.resolve(__dirname, '..', 'index.html');
const XLSX_PATH = path.join(ROOT, 'garden-data.xlsx');

function replaceBetween(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Маркеры ${startMarker} / ${endMarker} не найдены в index.html — разметка изменилась?`);
  }
  return html.slice(0, start + startMarker.length) + replacement + html.slice(end);
}

const wb = XLSX.readFile(XLSX_PATH);
function sheetRows(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
}

const calRows = sheetRows('Calendar');
const plantRows = sheetRows('Plants');
const worktypeRows = sheetRows('Worktypes');
const regionRows = sheetRows('Regions');
const noteRows = sheetRows('Notes');
const rotationRows = wb.Sheets['Rotation'] ? sheetRows('Rotation') : [];

function splitList(v) {
  return String(v || '').split(',').map(s => s.trim()).filter(Boolean);
}

const calendar = calRows.map(r => {
  const text = String(r.text || '').trim();
  const entry = {
    region: r.region,
    month: r.month,
    // Вычисляем, не читаем из xlsx: столбец monthName дублировал month и
    // мог разойтись с ним (правили один, забывали другой) - см.
    // reports/2026-08-30_arhitektura-sloy-dannyh.md, «Позже» (monthName).
    monthName: (MONTH_NAMES[r.month] || '').toUpperCase(),
    workType: r.workType,
    category: r.category,
    growMethod: splitList(r.growMethod),
    plants: splitList(r.plants),
    text: text ? text[0].toUpperCase() + text.slice(1) : text,
  };
  if (r.detail) entry.detail = String(r.detail).trim();
  return entry;
});

const plants = plantRows.map(p => {
  const rec = {
    id: p.id,
    name: p.name,
    category: p.category,
    group: p.group || undefined,
    hasSeedlingStage: p.hasSeedlingStage === 'да',
    regions: splitList(p.regions),
    icon: String(p.icon || '').trim() || 'sprout',
  };
  // Севооборот (заполнено только для огородных культур, лист Plants).
  if (p.family) rec.family = String(p.family).trim();
  if (p.feed !== '' && p.feed != null) rec.feed = Number(p.feed);
  if (String(p.perennial).trim() === '1' || p.perennial === 1) rec.perennial = true;
  return rec;
});

// rotation.json — семейства для планировщика севооборота (docs/sevooborot.html).
// Читает build-sevooborot.js; в bundle календаря не идёт.
const rotation = {
  families: rotationRows
    .filter(r => r.id)
    .map(r => ({
      id: String(r.id).trim(),
      name: String(r.name || '').trim(),
      gap: Number(r.gap) || 0,
      badWith: splitList(r.badWith),
    })),
};

// Проверка: у каждой культуры есть файл иконки docs/icons/plants/<icon>.svg.
// many-to-one (несколько культур -> одна иконка), fallback 'sprout'.
const ICONS_DIR = path.join(ROOT, 'docs', 'icons', 'plants');
const missingIcons = [...new Set(plants.map(p => p.icon))]
  .filter(ic => !fs.existsSync(path.join(ICONS_DIR, `${ic}.svg`)));
if (missingIcons.length) {
  throw new Error(`Нет файлов иконок культур: ${missingIcons.map(i => i + '.svg').join(', ')} (ожидались в docs/icons/plants/)`);
}

const worktypes = worktypeRows.map(w => ({ id: w.id, name: w.name, icon: w.icon, order: w.order }));
// status в листе Regions всегда "ready" у всех 4 регионов и нигде не
// читается во фронтенде - реально "скоро"-состояния у региона ни разу не
// было, поле убрано из вывода как мёртвое. См.
// reports/2026-08-30_arhitektura-sloy-dannyh.md, «Позже» (Regions.status).
const regions = regionRows.map(r => ({ id: r.id, name: r.name }));
const notes = noteRows.map(n => ({ title: n.title, text: n.text, workType: n.workType }));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'plants.json'), JSON.stringify(plants, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT, 'worktypes.json'), JSON.stringify(worktypes, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT, 'regions.json'), JSON.stringify(regions, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT, 'calendar.json'), JSON.stringify(calendar, null, 2), 'utf8');
// notes.json не идёт в bundle/фронтенд (посетителям никогда не рендерился -
// см. reports/2026-08-30_arhitektura-sloy-dannyh.md, «Позже» notes.json) -
// но остаётся как исследовательский артефакт: строки Calendar по хвойным
// ссылаются на него в столбце source как на источник обобщённых фактов.
fs.writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(notes, null, 2), 'utf8');
if (rotation.families.length) {
  fs.writeFileSync(path.join(OUT, 'rotation.json'), JSON.stringify(rotation, null, 2), 'utf8');
}

// TSV-снапшоты листов xlsx - для диффа правки агроданных прямо в GitHub PR.
// xlsx-textconv.js (см. .gitattributes) даёт то же самое, но только в
// локальном git diff/log - GitHub-ревью команды из .gitattributes не
// исполняет, а эти файлы уже текстовые и дифф увидит сам. См.
// reports/2026-08-30_arhitektura-sloy-dannyh.md, п.4 «Сделать сейчас» (4).
const SNAPSHOT_DIR = path.join(OUT, '_snapshot');
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
for (const name of ['Calendar', 'Plants', 'Worktypes', 'Regions', 'Notes']) {
  const tsv = XLSX.utils.sheet_to_csv(wb.Sheets[name], { FS: '\t' });
  fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.tsv`), tsv, 'utf8');
}

const bundle = `// Автогенерируется build-from-xlsx.js из garden-data.xlsx - не редактировать руками.
window.GARDEN_DATA = ${JSON.stringify({ plants, worktypes, regions, calendar })};
`;

// Имя файла версионируется хэшем содержимого (bundle.<hash>.js), а не
// фиксированное bundle.js - иначе Cache-Control: max-age=31536000 на статике
// (см. posadu-audit-deep.html) мог месяцами отдавать браузеру устаревший
// календарь при неизменном URL. Новые данные = новое имя файла = новый URL,
// который браузер обязан запросить заново независимо от старого кэша.
const hash = crypto.createHash('sha256').update(bundle).digest('hex').slice(0, 10);
const bundleFileName = `bundle.${hash}.js`;

for (const f of fs.readdirSync(OUT)) {
  const isOldPlainBundle = f === 'bundle.js';
  const isOldHashedBundle = /^bundle\.[0-9a-f]+\.js$/.test(f) && f !== bundleFileName;
  if (isOldPlainBundle || isOldHashedBundle) fs.unlinkSync(path.join(OUT, f));
}
fs.writeFileSync(path.join(OUT, bundleFileName), bundle, 'utf8');

let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
indexHtml = replaceBetween(
  indexHtml,
  '<!--bundle-script-->', '<!--/bundle-script-->',
  `<script defer src="data/${bundleFileName}"></script>`
);
fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');

console.log(`Культур: ${plants.length} (с данными севооборота: ${plants.filter(p => p.family).length})`);
console.log(`Семейств севооборота: ${rotation.families.length}`);
console.log(`Типов работ: ${worktypes.length}`);
console.log(`Всего записей календаря: ${calendar.length}`);
for (const r of regions) {
  console.log(`  ${r.id}: ${calendar.filter(e => e.region === r.id).length}`);
}

// Проверка: культуры без единого упоминания в календаре (перенесено из parse-data.js)
const mentioned = new Set(calendar.flatMap(e => e.plants));
const missing = plants.filter(p => !mentioned.has(p.id)).map(p => p.name);
if (missing.length) {
  console.log('Внимание, культуры без совпадений в календаре:', missing.join(', '));
}
