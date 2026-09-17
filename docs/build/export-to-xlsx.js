// Одноразовая миграция: текущие docs/data/*.json (полностью посчитанные,
// с учётом всех правок) -> единая книга garden-data.xlsx в корне репозитория.
// После этой миграции garden-data.xlsx становится источником истины вместо
// vrediteli.txt/obrezka.txt/udobreniya.txt + build-full-data.js.
//
// Регионы ural-sibir и severo-zapad на момент миграции содержат только
// вычисленные посезонным сдвигом месяца записи средней полосы (см. историю
// build-full-data.js) - это ПРИБЛИЖЕНИЕ, не проверенные вручную региональные
// данные. Такие строки помечаются в столбце source, чтобы не выдавать их за
// подтверждённый факт. Регион yug полностью пересобирается заново (реальные
// южные данные) и в этот экспорт не включается.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const OUT = path.resolve(__dirname, '..', 'data');
const ROOT = path.resolve(__dirname, '..', '..');

const calendar = JSON.parse(fs.readFileSync(path.join(OUT, 'calendar.json'), 'utf8'));
const plants = JSON.parse(fs.readFileSync(path.join(OUT, 'plants.json'), 'utf8'));
const worktypes = JSON.parse(fs.readFileSync(path.join(OUT, 'worktypes.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(OUT, 'regions.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(path.join(OUT, 'notes.json'), 'utf8'));

const AUTO_SOURCE = 'авто (сдвиг месяца от средней полосы, не пересмотрено)';

const calendarRows = calendar
  .filter(e => e.region !== 'yug') // юг пересобирается заново на основе веб-поиска
  .map(e => ({
    region: e.region,
    month: e.month,
    monthName: e.monthName,
    workType: e.workType,
    category: e.category,
    plants: e.plants.join(','),
    growMethod: e.growMethod.join(','),
    text: e.text,
    detail: e.detail || '',
    source: e.region === 'srednyaya-polosa' ? '' : AUTO_SOURCE,
  }));

const plantRows = plants.map(p => ({
  id: p.id,
  name: p.name,
  category: p.category,
  group: p.group || '',
  hasSeedlingStage: p.hasSeedlingStage ? 'да' : 'нет',
  regions: '', // пусто = растёт повсеместно (не аудировано); заполняется точечно
  icon: p.icon || '', // basename файла docs/icons/plants/<icon>.svg (many-to-one)
}));

const worktypeRows = worktypes.map(w => ({ id: w.id, name: w.name, icon: w.icon }));
const regionRows = regions.map(r => ({ id: r.id, name: r.name, status: r.status }));
const noteRows = notes.map(n => ({ title: n.title, workType: n.workType, text: n.text }));

const wb = XLSX.utils.book_new();
function addSheet(rows, name, colWidths) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, name);
}

addSheet(calendarRows, 'Calendar', [
  { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 24 }, { wch: 14 }, { wch: 60 }, { wch: 50 }, { wch: 30 },
]);
addSheet(plantRows, 'Plants', [
  { wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 20 },
]);
addSheet(worktypeRows, 'Worktypes', [{ wch: 16 }, { wch: 30 }, { wch: 8 }]);
addSheet(regionRows, 'Regions', [{ wch: 16 }, { wch: 20 }, { wch: 10 }]);
addSheet(noteRows, 'Notes', [{ wch: 40 }, { wch: 12 }, { wch: 80 }]);

const outPath = path.join(ROOT, 'garden-data.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`Записано: ${outPath}`);
console.log(`  Calendar: ${calendarRows.length} строк (без юга)`);
console.log(`  Plants: ${plantRows.length}`);
console.log(`  Worktypes: ${worktypeRows.length}`);
console.log(`  Regions: ${regionRows.length}`);
console.log(`  Notes: ${noteRows.length}`);
