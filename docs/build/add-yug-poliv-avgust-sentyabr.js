// A7 (BACKLOG.md) - Юг, полив в августе-сентябре: заполняет полностью
// пустой участок (workType=poliv, region=yug, avgust/sentyabr не имели ни
// одной строки) и уточняет два уже существующих ноябрьских влагозарядковых
// полива конкретными нормами воды. Все цифры прошли проверку
// garden-calendar-agronomist (2 круга) и климатическую сверку с
// reports/2026-09-10_klimat-regionov-5let.md.
//
// Источники (см. также per-row source в самих записях):
// - antonovsad.ru - томат, баклажан, капуста/морковь/свёкла (нормы полива)
// - ura.news - перец
// - botanichka.ru, agrosemena.ru - огурец
// - darvin-market.ru - повторный посев редиса/зелени, влажность до всходов
// - zgorod-nn.ru - молодые саженцы плодовых/ягодных текущего года
// - unian.net - гортензия и влаголюбивые декоративные (без нормы в литрах -
//   источник её не даёт, полив "по мере подсыхания почвы")
// - 7ogorod.ru - газон
// - reports/2026-09-10_klimat-regionov-5let.md - сентябрьское продолжение
//   полива (климатическая логика, не отдельная цифра)
// - ogorod.ru, news.ru - уточнение нормы влагозарядкового полива плодовых
//   (существующая ноябрьская запись)
// - 5-tv.ru - хвойным требуется на 20-30% больше воды, чем лиственным того
//   же возраста (существующая ноябрьская запись)
//
// Отдельная находка климатической сверки: влагозарядковый полив
// приствольных кругов и хвойных на Юге нельзя ставить на сентябрь (почва
// ещё 20-21°C, деревья физиологически не готовы) - соответствующие записи
// в garden-data.xlsx уже стоят в ноябре, здесь только добавляем нормы воды,
// месяц не трогаем.

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

const FRUIT_BERRY = ['yablonya', 'grusha', 'sliva', 'vishnya', 'smorodina', 'kryzhovnik', 'malina', 'oblepikha', 'ezhevika', 'irga', 'kalina', 'abrikos', 'chereshnya'];

// --- Уточнение уже существующих ноябрьских записей (текстовое совпадение) ---
const REPLACEMENTS = [
  [
    'Влагозарядковый полив плодовых и ягодных перед зимой при отсутствии осенних дождей.',
    'Влагозарядковый полив плодовых и ягодных перед зимой при отсутствии осенних дождей: взрослым деревьям (яблоня, груша и т.п.) — 50-100 л/м² приствольного круга (до 150+ л на крупное дерево), молодым (до 5-6 лет) — 50-60 л/м² или ~10 л на год жизни. Общая норма — 30-150 л/м² по периметру кроны, в 2-3 подхода.',
    'ogorod.ru; news.ru',
  ],
  [
    'Влагозарядковый полив хвойных, роз и гортензий — в ноябре, пока почва в зоне корней не остыла ниже +4…5 °C, при отсутствии дождей.',
    'Влагозарядковый полив хвойных, роз и гортензий — в ноябре (в тёплую погоду возможен сдвиг на декабрь), пока почва в зоне корней не остыла ниже +4…5 °C, при отсутствии дождей; хвойным и вечнозелёным (ель, сосна, туя, можжевельник) требуется на 20-30% больше воды, чем лиственным того же возраста.',
    'reports/2026-09-11_sverka-rekomendaciy-klimat.md; 5-tv.ru',
  ],
];

let replacedCount = 0;
const calAfterReplace = calRows.map(r => {
  if (r.region !== 'yug') return r;
  const found = REPLACEMENTS.find(([oldText]) => r.text === oldText);
  if (!found) return r;
  replacedCount++;
  return { ...r, text: found[1], source: found[2] };
});
const missingReplacements = REPLACEMENTS.filter(([oldText]) => !calRows.some(r => r.region === 'yug' && r.text === oldText));
if (missingReplacements.length) {
  console.warn('НЕ НАЙДЕНО точное совпадение для замены(-ен):', missingReplacements.length);
  missingReplacements.forEach(([oldText]) => console.warn(' -', oldText.slice(0, 80)));
}

// --- Новые записи: август + сентябрь ---
const newEntries = [
  row('yug', 7, 'poliv', 'ogorod', ['tomat'], ['grunt'],
    'Полив томата тёплой водой под куст — 3-5 л на растение, раз в 5-7 дней.',
    'antonovsad.ru'),
  row('yug', 7, 'poliv', 'ogorod', ['perets'], ['grunt'],
    'Полив перца — 2-3 л на куст, в сильную жару до 5 л на куст.',
    'ura.news'),
  row('yug', 7, 'poliv', 'ogorod', ['baklazhan'], ['grunt'],
    'Полив баклажана — 5-10 л на куст, раз в 5-7 дней.',
    'antonovsad.ru'),
  row('yug', 7, 'poliv', 'ogorod', ['kapusta', 'morkov', 'svekla'], ['grunt'],
    'Полив капусты, моркови и свёклы — 10-15 л/м², раз в 5-10 дней.',
    'antonovsad.ru'),
  row('yug', 7, 'poliv', 'ogorod', ['ogurets'], ['grunt'],
    'В жару полив огурца 1-2 раза в день — 5-8 л на куст в зависимости от почвы (лёгкие — 3-4 л, тяжёлые — 6-8 л) или 10-15 л/м²; в засуху при активном созревании плодов — до 15-20 л на погонный метр грядки, чаще обычного, раз в 6-7 дней.',
    'botanichka.ru; agrosemena.ru'),
  row('yug', 7, 'poliv', 'ogorod', ['redis', 'salat', 'rukkola', 'shpinat', 'kinza', 'ukrop', 'petrushka'], ['grunt'],
    'После повторного посева редиса и зелени на освободившихся грядках после лука, чеснока и раннего картофеля (сеять можно до начала сентября) — поддерживать постоянную влажность почвы до появления всходов.',
    'darvin-market.ru'),
  row('yug', 7, 'poliv', 'sad', FRUIT_BERRY, ['grunt'],
    'Молодым саженцам плодовых деревьев и кустарников текущего года — в течение сезона в среднем 10-15 поливов, 30-50 л воды в приствольную лунку за полив.',
    'zgorod-nn.ru'),
  row('yug', 7, 'poliv', 'dekor', ['gortenziya', 'hosta', 'astilba'], ['grunt'],
    'Гортензии и другим влаголюбивым декоративным — полив по мере подсыхания почвы, рано утром.',
    'unian.net'),
  row('yug', 7, 'poliv', 'dekor', [], ['grunt'],
    'Полив газона — 25 л/м² в неделю; не поливать в жаркие часы дня.',
    '7ogorod.ru'),
  row('yug', 8, 'poliv', 'ogorod', ['tomat', 'perets', 'baklazhan', 'kapusta', 'morkov', 'svekla', 'ogurets'], ['grunt'],
    'Продолжение регулярного полива овощных культур (см. август) — с постепенным сокращением частоты по мере похолодания, без заморозков, но заметно прохладнее.',
    'reports/2026-09-10_klimat-regionov-5let.md'),
  row('yug', 8, 'poliv', 'dekor', ['gortenziya', 'hosta', 'astilba'], ['grunt'],
    'Продолжение полива влаголюбивых декоративных культур (см. август) — с постепенным сокращением частоты по мере похолодания.',
    'reports/2026-09-10_klimat-regionov-5let.md'),
];

// Идемпотентность: перед добавлением убираем ранее добавленные этим
// скриптом строки (yug, poliv, avgust/sentyabr) - на момент написания
// скрипта таких строк не было вообще, поэтому фильтр безопасен.
const finalCal = [
  ...calAfterReplace.filter(r => !(r.region === 'yug' && r.workType === 'poliv' && (r.month === 'avgust' || r.month === 'sentyabr'))),
  ...newEntries,
];

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
console.log(`Уточнено существующих строк (ноябрь): ${replacedCount}`);
console.log(`Добавлено новых строк (август/сентябрь): ${newEntries.length}`);
console.log(`Итого Calendar: ${finalCal.length} строк`);
