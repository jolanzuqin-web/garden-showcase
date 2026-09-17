// Точечные правки календаря: убираем "зимние/весенние" действия из
// осенних записей и переносим их в правильный месяц.
//
// A. Искореняющая медь-обработка кустарников (роза/смородина/крыжовник/
//    барбарис/спирея): проводится ПОСЛЕ ПОЛНОГО листопада, а не в сентябре.
//    Средняя полоса и Северо-Запад стояли на сентябре, Урал-Сибирь — на
//    августе. Все → октябрь, текст/детали переписаны (после полного
//    листопада, +3…+5 °C, до листопада не проводить — медь обжигает лист).
// B. Защита осенних посадок луковичных от грызунов: из осенней записи
//    убрано "отаптывание снега зимой" (это приём декабря-февраля).
//    Добавлена отдельная зимняя строка для снежных регионов.
// D. Багряник, укрытие: строка стояла на сентябре, а текст был про весну
//    (притенение, поздние заморозки). Осеннюю часть → октябрь, весеннюю
//    вынесли отдельной апрельской строкой.
//
// Веб-проверка: kp.ru/.../iskorenyayushhaya-obrabotka-sada-osenyu (сроки
// после полного листопада), aif.ru/dacha/garden/ot-bolezney-i-vrediteley
// (три этапа), agro-market24.ru/blog/.../osennyaya-obrabotka-sada.

const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = path.resolve(__dirname, '..', '..', 'garden-data.xlsx');
const wb = XLSX.readFile(XLSX_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);

const MONTH_NAMES = {
  yanvar: 'ЯНВАРЬ', fevral: 'ФЕВРАЛЬ', mart: 'МАРТ', aprel: 'АПРЕЛЬ', may: 'МАЙ',
  iyun: 'ИЮНЬ', iyul: 'ИЮЛЬ', avgust: 'АВГУСТ', sentyabr: 'СЕНТЯБРЬ',
  oktyabr: 'ОКТЯБРЬ', noyabr: 'НОЯБРЬ', dekabr: 'ДЕКАБРЬ',
};
function setMonth(r, m) { r.month = m; r.monthName = MONTH_NAMES[m]; }

let changed = 0, added = 0;

// ---- A. Искореняющая медь-обработка кустарников ----
const COPPER_OLD_MARK = 'Искореняющая обработка роз, плодовых и декоративных кустарников';
const COPPER_TEXT = 'После полного листопада (обычно в конце октября — начале ноября) — искореняющая обработка роз, плодовых и декоративных кустарников (барбарис, спирея) медьсодержащим препаратом по голым ветвям и опавшим листьям. Профилактика зимующих стадий вредителей и грибных инфекций.';
const COPPER_DETAIL = 'Искореняющая обработка — 3%-я бордоская жидкость (300 г медного купороса + 400 г извести на 10 л воды) или ХОМ (40 г на 10 л) по голым ветвям и опавшим листьям, в сухую безветренную погоду при +3…+5 °C. До полного листопада не проводят — медь обжигает ещё зелёные и окрашивающиеся листья и ослабляет растение перед зимой.';

for (const r of rows) {
  if (r.workType === 'obrabotka' && String(r.text).startsWith(COPPER_OLD_MARK)) {
    r.text = COPPER_TEXT;
    r.detail = COPPER_DETAIL;
    r.source = 'агропроверка: искореняющая обработка — только после полного листопада (kp.ru, aif.ru)';
    if (r.month !== 'oktyabr') setMonth(r, 'oktyabr'); // ср. полоса и СЗ — с сентября, Урал-Сибирь — с августа
    changed++;
  }
}

// ---- B. Луковичные + грызуны: убрать "отаптывание снега зимой" ----
const BULB_MARK = 'Защита осенних посадок луковичных от мышей';
const BULB_TEXT = 'Защита осенних посадок луковичных от мышей и полёвок при посадке: посадка в сетчатых корзинах, родентициды и отпугиватели в лунку и рядом. Нарциссы, мускари, рябчики грызуны не трогают — ими обсаживают уязвимые посадки крокусов, тюльпанов, лилий.';
const bulbRegions = new Set();
for (const r of rows) {
  if (r.workType === 'obrabotka' && String(r.text).startsWith(BULB_MARK)) {
    r.text = BULB_TEXT;
    bulbRegions.add(r.region);
    changed++;
  }
}
// Зимняя строка про снегоуплотнение — для снежных регионов
const WINTER_SNOW_TEXT = 'В оттепель отаптывать снег над осенними посадками луковичных и в приствольных кругах молодых деревьев — обрушивает подснежные ходы мышей и полёвок.';
for (const region of ['srednyaya-polosa', 'severo-zapad', 'ural-sibir']) {
  if (!bulbRegions.has(region)) continue;
  rows.push({
    region, month: 'dekabr', monthName: MONTH_NAMES.dekabr,
    workType: 'obrabotka', category: 'dekor', plants: 'krokus,podsnezhnik,tyulpan,liliya',
    growMethod: 'grunt', text: WINTER_SNOW_TEXT, detail: '',
    source: 'агропроверка: снегоуплотнение против грызунов — зимой в оттепель',
  });
  added++;
}

// ---- D. Багряник, укрытие: осень отдельно от весны ----
for (const r of rows) {
  if (r.plants === 'bagryanik' && r.workType === 'ukrytie' && r.month === 'sentyabr') {
    r.text = 'Молодым багряникам (первые 2–3 года) на зиму — мульча приствольного круга слоем 10–15 см; в бесснежные морозы прикрывают основание. Взрослое дерево зимостойко до −30 °C без укрытия.';
    setMonth(r, 'oktyabr');
    changed++;
  }
}
rows.push({
  region: 'srednyaya-polosa', month: 'aprel', monthName: MONTH_NAMES.aprel,
  workType: 'ukrytie', category: 'dekor', plants: 'bagryanik', growMethod: 'grunt',
  text: 'Молодые багряники первые 2–3 года весной прикрывают спанбондом по распускающемуся приросту от возвратных заморозков — молодые листья катсуры к ним чувствительны.',
  detail: '', source: '',
});
added++;

wb.Sheets['Calendar'] = XLSX.utils.json_to_sheet(rows);
wb.Sheets['Calendar']['!cols'] = [
  { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 24 }, { wch: 14 }, { wch: 60 }, { wch: 50 }, { wch: 40 },
];
XLSX.writeFile(wb, XLSX_PATH);

console.log(`Изменено строк: ${changed}, добавлено: ${added}. Всего Calendar: ${rows.length}.`);
