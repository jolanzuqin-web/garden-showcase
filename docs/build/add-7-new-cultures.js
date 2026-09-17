// Добавляет 7 новых культур в справочник по запросу пользователя: черёмуха
// виргинская, форзиция, тсуга канадская, берёза, дуб, лиственница, гинкго
// билоба. Добавляет строки в Plants (лист) и базовые записи в Calendar
// (средняя полоса, +1-2 точечные строки в других регионах, где агротехника
// реально отличается — см. .md каждой культуры и его regions_notes).
// Полное покрытие календаря на 4 региона, как для остальных 87 культур, -
// отдельная задача на будущее (по образцу партий синхронизации справочник/
// календарь), здесь — стартовый набор, чтобы блок «Календарь работ по
// культуре» не был пустым.
//
// Источники (веб-поиск, сентябрь 2026) — см. sources в соответствующих
// docs/plants-src/<id>.md.

const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = path.resolve(__dirname, '..', '..', 'garden-data.xlsx');
const wb = XLSX.readFile(XLSX_PATH);
const calRows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);
const plantRows = XLSX.utils.sheet_to_json(wb.Sheets['Plants']);

const MONTH_IDS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
const MONTH_NAMES = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

const newPlants = [
  { id: 'cheremuha-virginskaya', name: 'Черёмуха виргинская', category: 'sad', group: 'derevo', hasSeedlingStage: 'нет', regions: '', icon: 'stone-fruit', family: '', feed: '', perennial: '' },
  { id: 'forsiciya', name: 'Форзиция', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'tsuga-kanadskaya', name: 'Тсуга канадская', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '', icon: 'conifer-pine', family: '', feed: '', perennial: '' },
  { id: 'bereza', name: 'Берёза', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'dub', name: 'Дуб', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'listvennitsa', name: 'Лиственница', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '', icon: 'conifer-pine', family: '', feed: '', perennial: '' },
  { id: 'ginkgo-biloba', name: 'Гинкго билоба', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
];

function row(region, monthIdx, workType, category, plant, text) {
  return {
    region, month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx], workType, category,
    plants: plant, growMethod: 'grunt', text, detail: '', source: '',
  };
}

const SP = 'srednyaya-polosa';
const newCal = [
  // ---- черёмуха виргинская ----
  row(SP, 3, 'posev', 'sad', 'cheremuha-virginskaya', 'Посадка черёмухи виргинской — весной, до распускания почек, на солнечное место. Заранее предусмотреть ограничитель корневой поросли.'),
  row(SP, 3, 'obrabotka', 'sad', 'cheremuha-virginskaya', 'Ранневесенняя обработка черёмухи виргинской от горностаевой моли по спящим почкам, повтор через 10-12 дней.'),
  row(SP, 4, 'obrezka', 'sad', 'cheremuha-virginskaya', 'Формирующая обрезка черёмухи виргинской и обязательное удаление корневой поросли у основания.'),
  row(SP, 4, 'udobrenie', 'sad', 'cheremuha-virginskaya', 'Весенняя минеральная подкормка черёмухи виргинской (нитроаммофоска) для роста побегов и листвы.'),
  row(SP, 7, 'urozhay', 'sad', 'cheremuha-virginskaya', 'Сбор плодов черёмухи виргинской — терпкие, на варенье, компоты и сушку.'),
  row(SP, 8, 'udobrenie', 'sad', 'cheremuha-virginskaya', 'Осенняя подкормка черёмухи виргинской перепревшим навозом или золой в приствольный круг — для обильного цветения будущего года.'),
  row(SP, 9, 'mulcha', 'sad', 'cheremuha-virginskaya', 'Мульчирование приствольного круга черёмухи виргинской перегноем или компостом слоем 5-8 см.'),

  // ---- форзиция ----
  row(SP, 3, 'posev', 'dekor', 'forsiciya', 'Посадка форзиции — ранней весной, до распускания почек, на солнечное место.'),
  row(SP, 4, 'obrezka', 'dekor', 'forsiciya', 'Обрезка форзиции сразу после цветения: побеги укорачивают на треть, двухлетние побеги с цветочными почками не трогают.'),
  row(SP, 4, 'udobrenie', 'dekor', 'forsiciya', 'Азотная подкормка форзиции сразу после цветения — для закладки цветочных почек будущего года.'),
  row(SP, 7, 'udobrenie', 'dekor', 'forsiciya', 'Фосфорно-калийная подкормка форзиции без азота — для вызревания побегов и зимостойкости.'),
  row(SP, 9, 'ukrytie', 'dekor', 'forsiciya', 'Мульчирование приствольного круга форзиции палой листвой или опилками; в морозные малоснежные зимы — лёгкое укрытие нижней части куста для защиты цветочных почек.'),

  // ---- тсуга канадская ----
  row(SP, 3, 'posev', 'dekor', 'tsuga-kanadskaya', 'Посадка тсуги канадской весной в полутень или тень, на влажную кислую дренированную почву.'),
  row(SP, 2, 'obrezka', 'dekor', 'tsuga-kanadskaya', 'Санитарная обрезка тсуги канадской ранней весной — сухие и повреждённые за зиму ветви.'),
  row(SP, 4, 'poliv', 'dekor', 'tsuga-kanadskaya', 'Регулярный полив и мульчирование хвойным опадом или корой — тсуга не переносит пересыхания земляного кома.'),
  row(SP, 6, 'obrabotka', 'dekor', 'tsuga-kanadskaya', 'От паутинного клеща на тсуге в жаркую сухую погоду — дождевание кроны и акарицид при заселении.'),
  row(SP, 9, 'ukrytie', 'dekor', 'tsuga-kanadskaya', 'Укрытие молодых растений тсуги канадской лапником на зиму, особенно на открытых ветреных местах.'),

  // ---- берёза ----
  row(SP, 3, 'posev', 'dekor', 'bereza', 'Весенняя посадка берёзы, до распускания почек; корневую шейку не заглублять.'),
  row(SP, 1, 'obrezka', 'dekor', 'bereza', 'Обрезка берёзы до начала сокодвижения (по морозу, в конце зимы) — иначе ранки долго «плачут» соком.'),
  row(SP, 4, 'udobrenie', 'dekor', 'bereza', 'Весенняя азотная подкормка молодой берёзы для быстрого роста после зимы.'),
  row(SP, 4, 'obrabotka', 'dekor', 'bereza', 'От тли и листовёртки на берёзе в мае — инсектицид при массовом появлении.'),
  row(SP, 6, 'obrabotka', 'dekor', 'bereza', 'От гусениц шелкопряда на берёзе при массовом появлении — стряхивание и инсектицидная обработка.'),

  // ---- дуб ----
  row(SP, 3, 'posev', 'dekor', 'dub', 'Весенняя посадка молодого саженца дуба (1-2 года) — взрослые деревья пересадку почти не переносят из-за стержневого корня.'),
  row(SP, 3, 'obrabotka', 'dekor', 'dub', 'Искореняющая обработка дуба медным или железным купоросом (300 г на 10 л) до распускания почек.'),
  row(SP, 4, 'obrabotka', 'dekor', 'dub', 'От мучнистой росы на дубе (белый налёт на листьях) — 1%-я бордоская жидкость в апреле-мае; от дубовой листовёртки — инсектицид при появлении гусениц.'),
  row(SP, 2, 'obrezka', 'dekor', 'dub', 'Санитарная обрезка молодых дубов — сухие и конкурирующие побеги, формирование одного лидирующего ствола.'),
  row(SP, 8, 'razmnozhenie', 'dekor', 'dub', 'Сбор жёлудей для размножения — стратификация во влажном песке до весеннего посева.'),

  // ---- лиственница ----
  row(SP, 3, 'posev', 'dekor', 'listvennitsa', 'Весенняя посадка лиственницы на солнечное место, до начала роста побегов.'),
  row(SP, 4, 'obrabotka', 'dekor', 'listvennitsa', 'От лиственничной чехлоноски и хермеса весной — инсектицид по молодой хвое при заселении.'),
  row(SP, 5, 'obrabotka', 'dekor', 'listvennitsa', 'От лиственничной паутинной листовёртки — вырезка побегов с паутинными гнёздами, при необходимости инсектицид.'),
  row(SP, 2, 'obrezka', 'dekor', 'listvennitsa', 'Санитарная обрезка лиственницы — сухие и повреждённые ветви; формирующая обрезка не требуется.'),

  // ---- гинкго билоба ----
  row(SP, 4, 'posev', 'dekor', 'ginkgo-biloba', 'Посадка гинкго билоба — весной, после весенних заморозков, на солнце или в лёгкую полутень; для сада выбирают привитый мужской сорт.'),
  row(SP, 5, 'udobrenie', 'dekor', 'ginkgo-biloba', 'Подкормка молодых растений гинкго билоба комплексным удобрением весной.'),
  row(SP, 2, 'obrezka', 'dekor', 'ginkgo-biloba', 'Формирующая обрезка молодых растений гинкго билоба — задание одного лидирующего побега.'),
  row(SP, 9, 'ukrytie', 'dekor', 'ginkgo-biloba', 'Укрытие молодых растений гинкго билоба на зиму (первые 2-3 года) — сухие листья или лапник, ствол можно обернуть лутрасилом.'),
];

const finalPlants = [...plantRows, ...newPlants];
const finalCal = [...calRows, ...newCal];

function replaceSheet(name, rows, colWidths) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths;
  wb.Sheets[name] = ws;
}

replaceSheet('Plants', finalPlants, [
  { wch: 22 }, { wch: 26 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
  { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
]);
replaceSheet('Calendar', finalCal, [
  { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 24 }, { wch: 14 }, { wch: 60 }, { wch: 50 }, { wch: 40 },
]);

XLSX.writeFile(wb, XLSX_PATH);

console.log(`Добавлено культур: ${newPlants.length} (${newPlants.map(p => p.id).join(', ')})`);
console.log(`Добавлено строк календаря: ${newCal.length}`);
console.log(`Итого Plants: ${finalPlants.length}, Calendar: ${finalCal.length}`);
