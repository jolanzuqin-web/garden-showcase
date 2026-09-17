// Генерирует reports/data-coverage.md - долю строк Calendar с подтверждённым
// источником (столбец source) по регионам. Источник качества данных иначе
// не виден: непроверенное "авто" (сдвиг месяца от средней полосы без
// пересмотра) неотличимо от веб-подтверждённого факта, пока кто-то не
// откроет xlsx и не посмотрит столбец вручную.
// Запуск: node docs/build/build-data-coverage.js (входит в npm run build:all).
// См. reports/2026-08-30_arhitektura-sloy-dannyh.md, п.4 «Сделать сейчас» (5).

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const XLSX_PATH = path.join(ROOT, 'garden-data.xlsx');
const OUT = path.join(ROOT, 'reports', 'data-coverage.md');

const wb = XLSX.readFile(XLSX_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar'], { defval: '' });

function classify(source) {
  const s = String(source || '').trim();
  if (!s) return 'пусто';
  if (/авто/i.test(s)) return 'авто';
  return 'веб-поиск';
}

const byRegion = new Map();
for (const r of rows) {
  const region = r.region;
  if (!byRegion.has(region)) byRegion.set(region, { total: 0, 'веб-поиск': 0, авто: 0, пусто: 0 });
  const bucket = byRegion.get(region);
  bucket.total++;
  bucket[classify(r.source)]++;
}

const pct = (n, total) => total ? `${Math.round((n / total) * 100)}%` : '—';

const regionOrder = [...byRegion.keys()].sort((a, b) => byRegion.get(b).total - byRegion.get(a).total);
const totalAll = { total: 0, 'веб-поиск': 0, авто: 0, пусто: 0 };
for (const r of regionOrder) {
  const b = byRegion.get(r);
  totalAll.total += b.total;
  totalAll['веб-поиск'] += b['веб-поиск'];
  totalAll.авто += b.авто;
  totalAll.пусто += b.пусто;
}

const rowsMd = regionOrder.map((r) => {
  const b = byRegion.get(r);
  return `| ${r} | ${b.total} | ${b['веб-поиск']} (${pct(b['веб-поиск'], b.total)}) | ${b.авто} (${pct(b.авто, b.total)}) | ${b.пусто} (${pct(b.пусто, b.total)}) |`;
}).join('\n');

const today = new Date().toISOString().slice(0, 10);
const md = `# Покрытие календаря источниками (столбец \`source\`)

Сгенерировано \`docs/build/build-data-coverage.js\` из \`garden-data.xlsx\`
(${today}) - **не редактировать руками**, перегенерируется при каждой
\`npm run build:all\`.

Категории по столбцу \`source\` листа \`Calendar\`:
- **веб-поиск** - есть текст источника, не помечен как «авто» (конкретная
  ссылка/сайт/пометка «агропроверка»/«веб-поиск»).
- **авто** - помечено словом «авто» (срок скопирован из средней полосы
  сдвигом месяцев, отдельно не пересмотрен веб-поиском).
- **пусто** - источник не проставлен вовсе.

| Регион | Всего строк | Веб-поиск | Авто | Пусто |
|---|---|---|---|---|
${rowsMd}
| **Итого** | **${totalAll.total}** | ${totalAll['веб-поиск']} (${pct(totalAll['веб-поиск'], totalAll.total)}) | ${totalAll.авто} (${pct(totalAll.авто, totalAll.total)}) | ${totalAll.пусто} (${pct(totalAll.пусто, totalAll.total)}) |

Высокая доля «авто» в регионе, отличном от средней полосы, - ожидаемо (см.
правило проекта про сдвиг месяцев в \`CLAUDE.md\`), не само по себе проблема.
Высокая доля «пусто» - сигнал не отследить, что для этих строк было или не
было веб-подтверждение факта.
`;

fs.writeFileSync(OUT, md, 'utf8');
console.log(`reports/data-coverage.md: ${rows.length} строк, ${regionOrder.length} регионов`);
