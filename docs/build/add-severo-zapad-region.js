// Добавляет в garden-data.xlsx регион "Северо-Запад" взамен старого
// приближения "копия средней полосы без сдвига месяцев" (климатически
// близкие регионы, сдвига там и не было - см. SHIFT={} в старом
// build-full-data.js). Реальная специфика - не в датах, а в повышенной
// влажности/облачности и более коротком безморозном периоде.
//
// Источники (веб-поиск, август 2026):
// - Климат/агротехника Ленинградской области - https://www.botanichka.ru/article/opasnosti-dozhdlivogo-leta-kak-mozhno-pomoch-ogorodu/,
//   https://dacha-posadka.ru/virashivanie/chto-mozhno-vyraschivat-na-dache-v-leningradskoy-oblasti.html
// - Клюква садовая, посадка/уход/болезни - https://www.fertilizerdaily.ru/20220318-vyrashhivanie-klyukvy-na-sadovom-uchastke/,
//   https://www.peterpeat.ru/piggybank/frukty-i-yagody/klyukva/

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const XLSX_PATH = path.join(ROOT, 'garden-data.xlsx');

const wb = XLSX.readFile(XLSX_PATH);
const calRows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);
const plantRows = XLSX.utils.sheet_to_json(wb.Sheets['Plants']);

const MONTH_IDS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
const MONTH_NAMES = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

// Северо-Запад климатически близок к средней полосе - сдвига месяцев нет
// (SHIFT={} в старом build-full-data.js), поэтому здесь нет проблемы
// "дыр" после сдвига, как у юга/Урала-Сибири - просто копия по месяцам.
const AUTO = 'авто (копия средней полосы, не пересмотрено)';
const MANUAL_LEGACY = 'ранее написано вручную для региона (build-full-data.js, до перехода на xlsx)';
const spRows = calRows.filter(r => r.region === 'srednyaya-polosa');

let szAuto = spRows.map(r => ({ ...r, region: 'severo-zapad', source: AUTO }));

const oldSz = calRows.filter(r => r.region === 'severo-zapad');
const HAND_WRITTEN_SNIPPETS = [
  'увеличивают риск фитофторы',
  'раннеспелым сортам томата и перца',
  'особенно хорошо чувствуют себя в местном влажном климате',
];
for (const r of oldSz) {
  if (HAND_WRITTEN_SNIPPETS.some(s => r.text.includes(s))) {
    const idx = szAuto.findIndex(a => a.month === r.month && a.workType === r.workType
      && a.category === r.category && a.text === r.text);
    if (idx === -1) szAuto.push({ ...r, source: MANUAL_LEGACY });
    else szAuto[idx] = { ...szAuto[idx], source: MANUAL_LEGACY };
  }
}

function row(region, monthIdx, workType, category, plants, growMethod, text, source, detail) {
  return {
    region, month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx], workType, category,
    plants: plants.join(','), growMethod: growMethod.join(','), text, detail: detail || '', source: source || '',
  };
}

const SRC_KLYUKVA = 'веб-поиск: fertilizerdaily.ru, peterpeat.ru «Клюква садовая» (авг. 2026)';
const SRC_DOZHD = 'веб-поиск: botanichka.ru «Опасности дождливого лета» (авг. 2026)';

const newSz = [
  // --- Клюква садовая: новая культура, типичная для региона (кислые торфяники) ---
  row('severo-zapad', 3, 'posev', 'sad', ['klyukva'], ['grunt'],
    'Посадка саженцев клюквы — середина апреля, когда почва оттает на 8-10 см. Нужен кислый торфяной грунт (pH 3-5) — песчаные и глинистые почвы не подходят. Для завязывания ягод высаживают не менее 2 сортов.',
    SRC_KLYUKVA),
  row('severo-zapad', 6, 'poliv', 'sad', ['klyukva'], ['grunt'],
    'Клюква легко переносит кратковременную засуху, но плохо — длительную сушь или застой воды. Для подкисления почвы поливают водой с лимонной кислотой (1 ч. л. на 3 л) или столовым уксусом (100 мл на 10 л).',
    SRC_KLYUKVA),
  row('severo-zapad', 7, 'obrabotka', 'sad', ['klyukva'], ['grunt'],
    'Грибковые заболевания клюквы (увядание, серые и бурые пятна на стеблях и ягодах) — обработка бордоской жидкостью (оптимально +5…+25°C) или фунгицидом. От брусничной листовёртки и других вредителей — инсектициды и регулярная прополка (сорняки их привлекают).',
    SRC_KLYUKVA),
  row('severo-zapad', 8, 'urozhay', 'sad', ['klyukva'], ['grunt'],
    'Сбор урожая клюквы — сентябрь, начало октября.',
    SRC_KLYUKVA),

  // --- Затяжные дожди: временные навесы над грядками ---
  row('severo-zapad', 6, 'ukrytie', 'ogorod', ['tomat','ogurets','kabachok'], ['grunt'],
    'При затяжных дождях грядки укрывают временными навесами из плёнки на дугах — снижает риск грибковых заболеваний и вымокания растений в частой для региона дождливой погоде.',
    SRC_DOZHD),
];

const finalCal = [...calRows.filter(r => r.region !== 'severo-zapad'), ...szAuto, ...newSz];

const newPlantRows = [
  ...plantRows.filter(p => p.id !== 'klyukva'),
  { id: 'klyukva', name: 'Клюква садовая', category: 'sad', group: 'yagoda', hasSeedlingStage: 'нет', regions: 'severo-zapad' },
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
replaceSheet('Plants', newPlantRows, [
  { wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 20 },
]);

XLSX.writeFile(wb, XLSX_PATH);
console.log(`Северо-Запад: ${szAuto.length} авто/ручных строк + ${newSz.length} новых исследованных строк = ${szAuto.length + newSz.length}`);
console.log(`Итого Calendar: ${finalCal.length} строк`);
console.log(`Итого Plants: ${newPlantRows.length}`);
