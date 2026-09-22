// B8 (BACKLOG.md) - Урал-Сибирь и Северо-Запад, посев томата/перца/баклажана
// на рассаду. Обе региональные строки за февраль ("Посев семян томата,
// перца и баклажана на рассаду...") были авто-сдвинуты от средней полосы
// и не пересмотрены (см. их source) - заменяем декадными сроками по
// региону вместо единой февральской даты для всех трёх культур сразу.
// Юг не трогаем (не в задаче).
//
// Заодно чистим связанную апрельскую/мартовскую строку "Посев на рассаду
// томата (если не посеян в феврале), капусты и базилика" - после правки
// томат в этих регионах больше не сеют в феврале (условие "если не посеян
// в феврале" стало бессмысленным), поэтому томат из неё убран, капуста и
// базилик остаются без изменений.
//
// Источники:
// - oazisvdome.ru - томат (Урал-Сибирь: 2-3 декада марта; Северо-Запад:
//   позднеспелые высокорослые тепличные, среднеспелые, низкорослые)
// - irk-sad.ru - перец и баклажан (Урал-Сибирь)
// - rsc47.ru (Россельхозцентр по Ленинградской области) - перец и баклажан
//   (Северо-Запад)
// - greenhome.blog - томат (Северо-Запад), высадка в теплицу 1-10 июня

const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const XLSX_PATH = path.join(ROOT, 'garden-data.xlsx');

const wb = XLSX.readFile(XLSX_PATH);
const calRows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);

const MONTH_IDS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const MONTH_NAMES = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];

function row(region, monthIdx, workType, category, plants, growMethod, text, source, detail) {
  return {
    region, month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx], workType, category,
    plants: plants.join(','), growMethod: growMethod.join(','), text, detail: detail || '', source: source || '',
  };
}

const OLD_FEVRAL_TEXT = 'Посев семян томата, перца и баклажана на рассаду (перец и баклажан — в первую очередь, у них дольше срок до всходов).';
const OLD_ESLI_NE_POSEYAN_TEXT = 'Посев на рассаду томата (если не посеян в феврале), капусты и базилика.';

// 1) Убираем февральские строки (region+text точное совпадение).
let removedFevral = 0;
let cal = calRows.filter(r => {
  const match = r.text === OLD_FEVRAL_TEXT && (r.region === 'ural-sibir' || r.region === 'severo-zapad');
  if (match) removedFevral++;
  return !match;
});

// 2) Чистим томат из "если не посеян в феврале" (обе региональные копии).
let cleanedEsliNePoseyan = 0;
cal = cal.map(r => {
  if (r.text !== OLD_ESLI_NE_POSEYAN_TEXT || (r.region !== 'ural-sibir' && r.region !== 'severo-zapad')) return r;
  cleanedEsliNePoseyan++;
  return { ...r, plants: 'kapusta,bazilik', text: 'Посев на рассаду капусты и базилика.' };
});

if (removedFevral !== 2) console.warn(`ВНИМАНИЕ: ожидалось убрать 2 февральские строки, убрано ${removedFevral}`);
if (cleanedEsliNePoseyan !== 2) console.warn(`ВНИМАНИЕ: ожидалось почистить 2 строки "если не посеян в феврале", почищено ${cleanedEsliNePoseyan}`);

// 3) Новые декадные строки на март.
const newEntries = [
  // Урал-Сибирь
  row('ural-sibir', 2, 'posev', 'ogorod', ['tomat'], ['rassada'],
    'Посев томата на рассаду (среднеспелые и ранние сорта) — 2-3 декада марта.',
    'oazisvdome.ru'),
  row('ural-sibir', 2, 'posev', 'ogorod', ['perets'], ['rassada'],
    'Посев перца на рассаду — 2-я декада марта (рассада готова за 60-70 дней).',
    'irk-sad.ru'),
  row('ural-sibir', 2, 'posev', 'ogorod', ['baklazhan'], ['rassada'],
    'Посев баклажана на рассаду — 1-я декада марта (рассада готова за 65-75 дней), на 1-1.5 недели раньше перца.',
    'irk-sad.ru'),
  // Северо-Запад
  row('severo-zapad', 2, 'posev', 'ogorod', ['perets'], ['rassada'],
    'Посев перца на рассаду — 11-20 марта.',
    'rsc47.ru'),
  row('severo-zapad', 2, 'posev', 'ogorod', ['baklazhan'], ['rassada'],
    'Посев баклажана на рассаду — 21-31 марта.',
    'rsc47.ru'),
  row('severo-zapad', 2, 'posev', 'ogorod', ['tomat'], ['rassada'],
    'Посев томата на рассаду: позднеспелые высокорослые тепличные — 1-15 марта (рассада 60-70 дней); среднеспелые — 20-31 марта (рассада 50-60 дней); низкорослые тепличные — конец марта.',
    'oazisvdome.ru; greenhome.blog',
    'Высадка рассады в теплицу — 1-10 июня.'),
];

// Идемпотентность: убираем ранее добавленные этим скриптом мартовские
// строки перед повторным добавлением (матчим по region+month+workType+
// набору plants, чтобы не задеть другие мартовские записи по этим же
// культурам, добавленные вручную).
function isOwnEntry(r) {
  if (r.workType !== 'posev' || r.month !== 'mart') return false;
  return newEntries.some(e => e.region === r.region && e.plants === r.plants && e.text === r.text);
}
cal = cal.filter(r => !isOwnEntry(r));

const finalCal = [...cal, ...newEntries];

function replaceSheet(name, rows, colWidths) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths;
  wb.Sheets[name] = ws;
}

replaceSheet('Calendar', finalCal, [
  { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 24 }, { wch: 14 }, { wch: 60 }, { wch: 50 }, { wch: 40 },
]);

XLSX.writeFile(wb, XLSX_PATH);
console.log(`Убрано февральских строк: ${removedFevral}`);
console.log(`Почищено строк "если не посеян в феврале": ${cleanedEsliNePoseyan}`);
console.log(`Добавлено новых мартовских строк: ${newEntries.length}`);
console.log(`Итого Calendar: ${finalCal.length} строк`);
