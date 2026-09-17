// Добавляет в garden-data.xlsx регион "Урал и Сибирь" взамен старого
// приближения "сдвиг месяца от средней полосы" - та же схема, что и
// add-yug-region.js. 4 записи, написанные вручную ещё в build-full-data.js
// (не сдвиг, а реальная специфика), сохраняем как есть, только помечаем
// source как подтверждённые вручную, а не "авто".
//
// Источники (веб-поиск, август 2026):
// - Морозостойкие плодовые для Урала/Сибири (войлочная вишня, абрикос) -
//   https://www.botanichka.ru/article/luchshie-sorta-plodovyih-kultur-dlya-holodnyih-regionov/,
//   https://dachamechty.ru/abrikos/zimostojkie-sorta-na-urale.html,
//   https://6sotok-dom.com/ogorod/frukty/abrikos/v-sibiri-i-na-urale.html
// - Войлочная вишня, уход/болезни - https://dsregion.org/vojlochnaja-vishnja-osobennosti-posadki-i-uhoda/,
//   https://www.peterpeat.ru/piggybank/feelgood_cart/doktor-filgud/vojlochnaya-vishnya-boleznennaya-krasavitca/
// - Виноград на Урале/в Сибири (укрывные канавки, снегозадержание, сорта) -
//   https://abekker.ru/articles/vyrascivanie-vinograda-na-urale,
//   https://www.sadurala.com/blog/vinograd-na-urale-i-v-sibiri-chetyre-pravila-posadki-obrezki-i-vyrashivaniya
// - Розы/гортензия, сроки укрытия по региону - https://antonovsad.ru/roza-ukrytie-i-probuzhdenie-1733/,
//   https://antonovsad.ru/ukrytie-gortenzii-na-zimu-kak-i-chem-ukutat-metelchatuyu-i-krupnolistnuyu-gortenziyu-v-raznyh-regionah-4631/
// - Самшит, зимостойкость - https://vladgarden.ru/stat/rasteniya/s/samshit-ne-tolko-dlja-juga/
// - Морозобоины/снегозадержание/побелка - https://antonovsad.ru/derevya-i-kustarniki-zimoy-kak-podgotovit-chem-ukryt-i-zashchitit-ot-povrezhdeniy-196/,
//   https://antonovsad.ru/zimovka-v-surovom-klimate-ot-chego-stradayut-plodovye-derevya-i-kak-im-pomoch-2912/

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

const SHIFT = { 2: 1, 3: 1, 4: 1, 5: 0, 6: 0, 7: 0, 8: -1, 9: -1, 10: -1 };
function shiftMonth(idx) {
  const delta = SHIFT[idx] || 0;
  let n = idx + delta;
  if (n < 0) n = 0;
  if (n > 11) n = 11;
  return n;
}

const AUTO = 'авто (сдвиг месяца от средней полосы, не пересмотрено)';
const MANUAL_LEGACY = 'ранее написано вручную для региона (build-full-data.js, до перехода на xlsx)';
const spRows = calRows.filter(r => r.region === 'srednyaya-polosa');

let uralAuto = spRows.map(r => {
  const oldIdx = MONTH_IDS.indexOf(r.month);
  const newIdx = shiftMonth(oldIdx);
  return { ...r, region: 'ural-sibir', month: MONTH_IDS[newIdx], monthName: MONTH_NAMES[newIdx], source: AUTO };
});

// Заполняем месяцы-"дыры", образовавшиеся после несимметричного сдвига,
// несдвинутым контентом средней полосы для этого месяца (см. add-yug-region.js).
{
  const countByMonth = new Array(12).fill(0);
  for (const e of uralAuto) countByMonth[MONTH_IDS.indexOf(e.month)]++;
  countByMonth.forEach((count, idx) => {
    if (count === 0) {
      for (const r of spRows) {
        if (r.month === MONTH_IDS[idx]) uralAuto.push({ ...r, region: 'ural-sibir', source: AUTO });
      }
    }
  });
}

// Та же fallback-логика даёт дубли: одна и та же карточка сдвинутая И
// несдвинутая (см. подробное объяснение в add-yug-region.js). Для Урала-
// Сибири направление сдвига (весна позже, осень раньше - холодный климат)
// не вызвало явных противоречий в проверенных примерах (сроки посева
// рассады, укрытие роз) - оставляем сдвинутую копию как более вероятную,
// убираем несдвинутый fallback-дубль. Это обобщение по проверенным
// примерам, не индивидуальная проверка каждой пары.
function dedupFallbackPair(list, monthKeep, monthDrop) {
  const keySeen = new Set();
  for (const e of list) {
    if (e.month === monthKeep) keySeen.add(e.workType + '|' + e.category + '|' + e.text);
  }
  return list.filter(e => !(e.month === monthDrop && keySeen.has(e.workType + '|' + e.category + '|' + e.text)));
}
uralAuto = dedupFallbackPair(uralAuto, 'aprel', 'mart');
uralAuto = dedupFallbackPair(uralAuto, 'oktyabr', 'noyabr');

// Старые записи региона (из старого calendar.json, попавшие в xlsx при миграции
// export-to-xlsx.js) уже содержат 4 вручную написанные строки для ural-sibir
// вперемешку со сдвинутыми. Их не пересоздаём заново через shiftMonth (та же
// логика даёт тот же результат), а просто переносим как есть из текущего
// содержимого книги и помечаем source, чтобы отличать от настоящего "авто".
const oldUral = calRows.filter(r => r.region === 'ural-sibir');
const HAND_WRITTEN_SNIPPETS = [
  'откладывают до окончания риска возвратных заморозков',
  'делают более капитальным',
  'без этого зимнее укрытие штамба не спасает от подмерзания',
  'короткое лето не всегда даёт им вызреть',
];
for (const r of oldUral) {
  if (HAND_WRITTEN_SNIPPETS.some(s => r.text.includes(s))) {
    // заменяем сгенерированную по сдвигу копию на помеченную как подтверждённую
    const idx = uralAuto.findIndex(a => a.month === r.month && a.workType === r.workType
      && a.category === r.category && a.text === r.text);
    if (idx === -1) uralAuto.push({ ...r, source: MANUAL_LEGACY });
    else uralAuto[idx] = { ...uralAuto[idx], source: MANUAL_LEGACY };
  }
}

function dropAuto(pred) {
  uralAuto = uralAuto.filter(r => !pred(r));
}

// Виноград: в средней полосе - общее укрытие; на Урале/в Сибири нужна более
// капитальная методика (укрывные канавки с землёй, снегозадержание) + выбор
// сорта (единственный по-настоящему неукрывной - Амурский белый). Также
// убираем посадочную заметку "(в средней полосе — только зимостойких
// сортов)" - при показе региона "Урал и Сибирь" упоминание средней полосы
// как ориентира не имеет смысла (сама заметка написана с точки зрения
// средней полосы).
dropAuto(r => r.workType === 'ukrytie' && r.plants.split(',').includes('vinograd'));
dropAuto(r => r.workType === 'posev' && r.plants.split(',').includes('vinograd')
  && r.text.includes('в средней полосе'));

function row(region, monthIdx, workType, category, plants, growMethod, text, source, detail) {
  return {
    region, month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx], workType, category,
    plants: plants.join(','), growMethod: growMethod.join(','), text, detail: detail || '', source: source || '',
  };
}

const SRC_VISHNYA = 'веб-поиск: dsregion.org, peterpeat.ru «Войлочная вишня» (авг. 2026)';
const SRC_VINOGRAD = 'веб-поиск: abekker.ru «Агротехника винограда на Урале», sadurala.com (авг. 2026)';
const SRC_ABRIKOS = 'веб-поиск: dachamechty.ru, 6sotok-dom.com «Абрикос на Урале/в Сибири» (авг. 2026)';
const SRC_ZIMA = 'веб-поиск: antonovsad.ru «Подготовка деревьев и кустарников к зиме в Сибири» (авг. 2026)';
const SRC_SAMSHIT = 'веб-поиск: vladgarden.ru «Самшит не только для юга» (авг. 2026)';
const SRC_STLANEC = 'веб-поиск: antonovsad.ru «Стелющаяся яблоня в Сибири», sadsezon.com (авг. 2026)';

const newUral = [
  // --- Войлочная вишня: новая культура, типичная для региона ---
  row('ural-sibir', 3, 'obrezka', 'sad', ['voylochnaya-vishnya'], ['grunt'],
    'Санитарная обрезка войлочной вишни до начала активного сокодвижения — без неё крона загущается, страдают опыление и урожайность. У взрослых растений — омолаживающая обрезка веток первого-второго порядка (при большом объёме — за 2 сезона).',
    SRC_VISHNYA),
  row('ural-sibir', 3, 'obrabotka', 'sad', ['voylochnaya-vishnya'], ['grunt'],
    'Профилактика монилиоза и клястероспориоза (дырчатой пятнистости) войлочной вишни — опрыскивание 1%-й бордоской жидкостью или хлорокисью меди (оптимально +5…+25°C, не выше +30°C) перед цветением и повторно после него.',
    SRC_VISHNYA),
  row('ural-sibir', 3, 'udobrenie', 'sad', ['voylochnaya-vishnya'], ['grunt'],
    'Ранневесенняя подкормка войлочной вишни 5%-м раствором мочевины или аммиачной селитры.',
    SRC_VISHNYA),
  row('ural-sibir', 6, 'urozhay', 'sad', ['voylochnaya-vishnya'], ['grunt'],
    'Сбор урожая войлочной вишни (июль, точные сроки зависят от сорта и лета).',
    SRC_VISHNYA),

  // --- Виноград: капитальное укрытие + снегозадержание ---
  row('ural-sibir', 8, 'posev', 'sad', ['vinograd'], ['grunt'],
    'Осенняя посадка саженцев винограда — в этом климате приживаются только по-настоящему морозостойкие и укрывные сорта с ранним сроком созревания (тёплого сезона не хватает на поздние сорта).',
    SRC_VINOGRAD),
  row('ural-sibir', 10, 'ukrytie', 'sad', ['vinograd'], ['grunt'],
    'На Урале и в Сибири виноград укрывают капитально: лозу укладывают в укрывные канавки и присыпают землёй, обязательно снегозадержание (лапник, хворост) поверх укрытия. По-настоящему неукрывной сорт — Амурский белый; остальные сорта (включая заявленные морозостойкими до -25...-27°C, например Блэк Гранд, Кишмиш Столетие) на зиму укрывают.',
    SRC_VINOGRAD),

  // --- Абрикос/черешня: выбор районированных сортов, риск выпревания ---
  row('ural-sibir', 2, 'obrabotka', 'sad', ['abrikos','chereshnya'], ['grunt'],
    'Для абрикоса и черешни на Урале и в Сибири критичен выбор районированных зимостойких сортов (для абрикоса, например, Уралец, Кичигинский, Снежинский) — обычные среднерусские сорта, как правило, вымерзают. Продолжительные зимние оттепели могут вызвать выпревание корневой шейки — важно не допускать застоя талой воды у ствола.',
    SRC_ABRIKOS),

  // --- Плодовые деревья: суточные перепады температур зимой, снегозадержание ---
  row('ural-sibir', 8, 'ukrytie', 'sad', ['yablonya','grusha','sliva','vishnya','abrikos','chereshnya'], ['grunt'],
    'Резкие суточные перепады температуры и яркое зимнее солнце вызывают морозобоины (трещины коры с северной стороны от ночного холода) и солнечные ожоги (с южной стороны, от дневного нагрева) — своевременная побелка штамбов особенно важна в этом климате. Для снегозадержания у стволов раскладывают лапник или хворост; в начале зимы, в оттепель, снег у деревьев рекомендуется утаптывать 2-3 раза за зиму.',
    SRC_ZIMA),

  // --- Яблоня: стланцевая форма как альтернатива для теплолюбивых сортов ---
  row('ural-sibir', 4, 'obrezka', 'sad', ['yablonya'], ['grunt'],
    'Теплолюбивые сорта яблони, не районированные для региона, можно формировать в стланцевой форме (крона стелется низко над землёй и зимой полностью укрыта снегом) — при правильном формировании плодоносят не хуже южных садов. Для местных зимостойких сортов (Уральское наливное, Уралец, Северный синап и т.п.) стланец не нужен — растут обычным деревом.',
    SRC_STLANEC),

  // --- Самшит: выбор морозостойкого сорта ---
  row('ural-sibir', 8, 'obrabotka', 'dekor', ['samshit'], ['grunt'],
    'Для Урала и Сибири предпочтителен морозостойкий колхидский самшит — обычные южные сорта в этом климате, как правило, вымерзают без капитального укрытия на зиму.',
    SRC_SAMSHIT),
];

const finalCal = [...calRows.filter(r => r.region !== 'ural-sibir'), ...uralAuto, ...newUral];

const newPlantRows = [
  ...plantRows.filter(p => p.id !== 'voylochnaya-vishnya'),
  { id: 'voylochnaya-vishnya', name: 'Вишня войлочная', category: 'sad', group: 'derevo', hasSeedlingStage: 'нет', regions: 'ural-sibir' },
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
console.log(`Урал-Сибирь: ${uralAuto.length} авто/ручных строк + ${newUral.length} новых исследованных строк = ${uralAuto.length + newUral.length}`);
console.log(`Итого Calendar: ${finalCal.length} строк`);
console.log(`Итого Plants: ${newPlantRows.length}`);
