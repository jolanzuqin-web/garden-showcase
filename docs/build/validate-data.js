// Проверка целостности сгенерированной статики перед деплоем: битые JSON,
// ссылка sitemap.xml на несуществующий файл, битые внешние ключи и дубли
// строк calendar.json раньше ничем не ловились - заглушка npm test всегда
// падала одинаково, не проверяя ничего реального.
// Запуск: node docs/build/validate-data.js (или npm test из docs/build).
// См. reports/2026-08-29_arhitektura-garden.md п.4.5 и
// reports/2026-08-30_arhitektura-sloy-dannyh.md п.4 «Сделать сейчас» (1).

const fs = require('fs');
const path = require('path');
const { SITE_URL } = require('./page-shell');
const { MONTH_IDS, MONTH_NAMES } = require('../js/garden-logic');

const DOCS = path.resolve(__dirname, '..');
const DATA_DIR = path.join(DOCS, 'data');

const errors = [];
const parsed = {};

// 1. Все docs/data/*.json - валидный JSON. Сохраняем распарсенное - нужно
// для проверок ниже, второй раз читать/парсить не будем.
const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
for (const file of jsonFiles) {
  const p = path.join(DATA_DIR, file);
  try {
    parsed[file] = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`docs/data/${file}: невалидный JSON - ${e.message}`);
  }
}
console.log(`JSON: проверено ${jsonFiles.length} файлов в docs/data/`);

// 2. calendar.json - внешние ключи, enum-поля, monthName, непустые text/
// detail, дубли строк. Пропускаем, если сам файл не распарсился (ошибка
// уже добавлена в errors выше).
if (parsed['calendar.json'] && parsed['worktypes.json'] && parsed['regions.json'] && parsed['plants.json']) {
  const calendar = parsed['calendar.json'];
  const worktypeIds = new Set(parsed['worktypes.json'].map((w) => w.id));
  const regionIds = new Set(parsed['regions.json'].map((r) => r.id));
  const plantIds = new Set(parsed['plants.json'].map((p) => p.id));
  const CATEGORIES = new Set(['ogorod', 'dekor', 'sad']);
  const GROW_METHODS = new Set(['grunt', 'rassada']);
  const seenRows = new Map();

  calendar.forEach((e, i) => {
    const at = `calendar.json[${i}]`;
    if (!regionIds.has(e.region)) errors.push(`${at}: region "${e.region}" не найден в regions.json`);
    if (!MONTH_IDS.includes(e.month)) errors.push(`${at}: month "${e.month}" не входит в MONTH_IDS`);
    else if (e.monthName !== MONTH_NAMES[e.month].toUpperCase()) {
      errors.push(`${at}: monthName "${e.monthName}" не соответствует month "${e.month}" (ожидалось "${MONTH_NAMES[e.month].toUpperCase()}")`);
    }
    if (!worktypeIds.has(e.workType)) errors.push(`${at}: workType "${e.workType}" не найден в worktypes.json`);
    if (!CATEGORIES.has(e.category)) errors.push(`${at}: category "${e.category}" не входит в {${[...CATEGORIES]}}`);
    for (const gm of e.growMethod || []) {
      if (!GROW_METHODS.has(gm)) errors.push(`${at}: growMethod "${gm}" не входит в {${[...GROW_METHODS]}}`);
    }
    for (const pid of e.plants || []) {
      if (!plantIds.has(pid)) errors.push(`${at}: plants содержит "${pid}", которого нет в plants.json`);
    }
    if (!e.text || !e.text.trim()) errors.push(`${at}: пустой text`);
    if ('detail' in e && (!e.detail || !e.detail.trim())) errors.push(`${at}: пустой detail (поле задано, но без содержимого)`);

    const key = [e.region, e.month, e.workType, e.category, e.text].join('');
    if (seenRows.has(key)) {
      errors.push(`${at}: дубль строки ${seenRows.get(key)} (region/month/workType/category/text совпадают)`);
    } else {
      seenRows.set(key, at);
    }
  });
  console.log(`calendar.json: проверено ${calendar.length} строк (FK, enum, дубли)`);
}

// 3. worker/index.js хардкодит REGIONS отдельным массивом (не тянет из
// regions.json на каждый запрос - лишняя точка отказа бота от доступности
// сайта) - здесь просто проверяем, что хардкод не разъехался с данными,
// а не переписываем рантайм. См. reports/2026-08-30_arhitektura-sloy-dannyh.md,
// «Позже» (хардкод регионов в воркере).
if (parsed['regions.json']) {
  const workerPath = path.resolve(DOCS, '..', 'worker', 'index.js');
  if (!fs.existsSync(workerPath)) {
    errors.push('worker/index.js не найден - не проверить REGIONS');
  } else {
    const workerSrc = fs.readFileSync(workerPath, 'utf8');
    const m = workerSrc.match(/const REGIONS = \[([^\]]*)\]/);
    if (!m) {
      errors.push('worker/index.js: не нашли "const REGIONS = [...]" - проверка REGIONS пропущена, обновите regex в validate-data.js, если массив переименован/переформатирован');
    } else {
      const workerRegions = [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((mm) => mm[1] || mm[2]);
      const dataRegions = parsed['regions.json'].map((r) => r.id);
      const onlyInWorker = workerRegions.filter((r) => !dataRegions.includes(r));
      const onlyInData = dataRegions.filter((r) => !workerRegions.includes(r));
      if (onlyInWorker.length) errors.push(`worker/index.js: REGIONS содержит ${onlyInWorker.join(', ')}, которых нет в regions.json`);
      if (onlyInData.length) errors.push(`regions.json содержит регион(ы) ${onlyInData.join(', ')}, отсутствующие в worker/index.js REGIONS - добавьте в массив и задеплойте воркер`);
      if (!onlyInWorker.length && !onlyInData.length) console.log(`worker/index.js: REGIONS совпадает с regions.json (${workerRegions.length} регионов)`);
    }
  }
}

// 4. Каждый <loc> в sitemap.xml резолвится в существующий файл.
const sitemapPath = path.join(DOCS, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  errors.push('docs/sitemap.xml не найден - запустить build-sitemap.js');
} else {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  let checked = 0;
  for (const loc of locs) {
    if (!loc.startsWith(SITE_URL)) {
      errors.push(`sitemap.xml: <loc>${loc}</loc> не начинается с ${SITE_URL}`);
      continue;
    }
    let rel = loc.slice(SITE_URL.length).replace(/^\//, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const filePath = path.join(DOCS, rel);
    checked++;
    if (!fs.existsSync(filePath)) {
      errors.push(`sitemap.xml: <loc>${loc}</loc> -> docs/${rel} не существует`);
    }
  }
  console.log(`sitemap.xml: проверено ${checked} ссылок`);
}

if (errors.length) {
  console.error(`\nНайдено проблем: ${errors.length}`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('\nВсё в порядке.');
