// Добавляет ель и сосну как новые отслеживаемые культуры (были только в
// общей информационной заметке про хвойные, без своих карточек в
// календаре). Добавлено в базу средней полосы - региональные скрипты
// (add-yug-region.js и т.д.) при повторном запуске подхватят эти строки
// автоматически через свой сдвиг месяца.
//
// Заодно поправлен group у туи/можжевельника: 'dekorativno-listvennye'
// (дословно "декоративно-лиственные") ботанически неверно для хвойных -
// ставим 'hvoynye'. Самшит group не трогаем - это не хвойное растение
// (вечнозелёный лиственный кустарник), хотя в исходных .txt он и был в
// одной группе "Хвойные (общее)" с туей/можжевельником по смыслу ухода.
//
// Источники (веб-поиск, август 2026):
// - Посадка/пересадка ели и сосны, ком земли, заглубление корневой шейки -
//   https://vplate.ru/el/peresadka/, https://sadodel.ru/stati/posadka-sosny-na-uchastke-sroki-sxema-uxod/
// - Еловый/сосновый пилильщик, сроки обработки -
//   https://www.supersadovnik.ru/text/opasnye-vrediteli-eli-1006981,
//   https://www.derev-grad.ru/lesozaschita/obyknovennyi-sosnovyi-pililschik.html
// - Общие правила обрезки/подкормки хвойных (свечки, только весенняя подкормка) -
//   уже подтверждены ранее, см. docs/data/notes.json (ОБОБЩЁННАЯ ИНФОРМАЦИЯ ПО ХВОЙНЫМ)

const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const XLSX_PATH = path.join(ROOT, 'garden-data.xlsx');

const wb = XLSX.readFile(XLSX_PATH);
const calRows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);
const plantRows = XLSX.utils.sheet_to_json(wb.Sheets['Plants']);

const MONTH_IDS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
const MONTH_NAMES = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

function row(region, monthIdx, workType, category, plants, growMethod, text, source, detail) {
  return {
    region, month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx], workType, category,
    plants: plants.join(','), growMethod: growMethod.join(','), text, detail: detail || '', source: source || '',
  };
}

const SRC_POSADKA = 'веб-поиск: vplate.ru «Пересадка ели», sadodel.ru «Посадка сосны» (авг. 2026)';
const SRC_PILILSHIK = 'веб-поиск: supersadovnik.ru «Опасные вредители ели», derev-grad.ru, betaren.ru, floristics.info (авг. 2026)';
const SRC_HVOYNYE_NOTES = 'см. docs/data/notes.json — общая информация по хвойным (ранее подтверждено)';
const SRC_MOLODYE = 'веб-поиск: zstrela.ru «Ели и сосны: правила посадки и уход в первые годы жизни», garshinka.ru, abekker.by (авг. 2026)';

const newEntries = [
  row('srednyaya-polosa', 8, 'posev', 'dekor', ['el','sosna'], ['grunt'],
    'Посадка саженцев ели и сосны — весной до начала роста побегов или с начала сентября (осенняя посадка завершается до устойчивых холодов). Пересаживают с сохранением земляного кома (для ели — диаметром от 60-80 см, от выкопки до посадки не более 2-4 часов). Корневую шейку у сосны заглублять нельзя — строго на уровне земли или на 2-3 см выше, иначе растение подопревает.',
    SRC_POSADKA),
  row('srednyaya-polosa', 4, 'obrezka', 'dekor', ['el','sosna'], ['grunt'],
    'Укорачивание молодых побегов («свечек») ели и сосны для загущения кроны — в мае-июне, до их одревеснения. Формирующую стрижку, как у туи и можжевельника, к ели и сосне не применяют — сильную обрезку старой древесины они переносят плохо; допустима только санитарная обрезка сухих/сломанных веток в любое время года, кроме сильных морозов.',
    SRC_HVOYNYE_NOTES),
  row('srednyaya-polosa', 4, 'obrabotka', 'dekor', ['el','sosna'], ['grunt'],
    'Еловый пилильщик повреждает молодую хвою ели (пик активности — конец мая — начало июня); сосновый пилильщик повреждает сосну (первое поколение окукливается в конце июня — начале июля). Первую обработку инсектицидом проводят в начале отрастания побегов, повторную — через 2 недели.',
    SRC_PILILSHIK,
    'От обоих видов пилильщика — «Актара» (тиаметоксам, +10…+29°C, оптимально +12…+25°C) или «Фуфанон-Нова» (малатион) по инструкции на упаковке. При небольшом числе личинок эффективен и ручной сбор с нижней стороны хвои.'),
  // Подкормка ели/сосны (март-апрель, хвойное удобрение с магнием, без
  // летних подкормок и органики) - не отдельная запись: объединена с уже
  // существующей "Подкормка специализированным удобрением для хвойных...
  // туя, можжевельник, ель, сосна" (её text уже называл ель/сосну, но тег
  // растений ошибочно был tuya/mozhzhevelnik/samshit - самшит в тексте не
  // упоминается вовсе). Исправление тегов и объединение сделано напрямую
  // в garden-data.xlsx, см. коммит про "самшит в тексте не упоминается".
  row('srednyaya-polosa', 9, 'obrabotka', 'dekor', ['el','sosna'], ['grunt'],
    'Профилактическая обработка ели и сосны медьсодержащим фунгицидом от шютте — сентябрь-октябрь, плюс влагозарядковый полив для повышения зимостойкости.',
    SRC_HVOYNYE_NOTES),
  // workType='obrezka', не 'ukrytie' - снеговая нагрузка/поломка веток это
  // механический уход, тот же раздел, что и декабрьская запись про тую и
  // можжевельник "Снятие снеговой нагрузки" (см. историю правок vrediteli.txt/
  // obrezka.txt в начале проекта - тот же принцип).
  row('srednyaya-polosa', 11, 'obrezka', 'dekor', ['el','sosna'], ['grunt'],
    'У молодых елей и сосен — контроль снеговой нагрузки на ветках и стряхивание тяжёлого снега.',
    SRC_HVOYNYE_NOTES),
  // Отдельно, в тот же месяц, что и установка притенения у туи/можжевельника
  // (см. obrezka.txt / build) - поясняем разницу именно там, где обсуждается
  // сама защита от весенних ожогов, а не в декабрьской карточке про снег.
  row('srednyaya-polosa', 1, 'ukrytie', 'dekor', ['el','sosna'], ['grunt'],
    'Взрослые ели и сосны, в отличие от туи и можжевельника, обычно не нуждаются в притенении от весенних солнечных ожогов — их хвоя менее чувствительна к отражённому от снега свету. Молодые растения первых 2-3 лет после посадки уязвимы так же, как туя и можжевельник: их притеняют нетканым материалом, мешковиной или притеночной сеткой (не герметично, для циркуляции воздуха) с конца января по март, снимают во второй половине апреля в пасмурную погоду, когда почва прогреется.',
    SRC_MOLODYE),
];

// Идемпотентность: убираем ранее добавленные этим скриптом строки для
// средней полосы перед повторным добавлением - иначе повторный запуск
// дублирует их. Матчим строго по plants===['el','sosna'] (а не по
// "содержит el или sosna"), чтобы не задеть отдельную запись, где ель/сосна
// объединены с туей/можжевельником в одну строку (правится вручную в
// garden-data.xlsx, не этим скриптом).
function isElSosnaOnly(plantsStr) {
  const set = plantsStr.split(',').sort().join(',');
  return set === 'el,sosna';
}
const finalCal = [
  ...calRows.filter(r => !(r.region === 'srednyaya-polosa' && isElSosnaOnly(r.plants))),
  ...newEntries,
];

const newPlantRows = [
  ...plantRows.filter(p => p.id !== 'el' && p.id !== 'sosna').map(p =>
    (p.id === 'tuya' || p.id === 'mozhzhevelnik') ? { ...p, group: 'hvoynye' } : p),
  { id: 'el', name: 'Ель', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '' },
  { id: 'sosna', name: 'Сосна', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '' },
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
console.log(`Добавлено записей для ели/сосны (средняя полоса): ${newEntries.length}`);
console.log(`Итого Calendar: ${finalCal.length} строк`);
console.log(`Итого Plants: ${newPlantRows.length}`);
