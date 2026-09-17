// Добавляет ещё 4 культуры: пихта, микробиота, боярышник, клён японский.
// Строки в Plants + базовые записи Calendar (средняя полоса). Полное
// покрытие календаря на 4 региона — отдельная задача, как для остальных
// новых культур. Источники — в docs/plants-src/<id>.md.

const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = path.resolve(__dirname, '..', '..', 'garden-data.xlsx');
const wb = XLSX.readFile(XLSX_PATH);
const calRows = XLSX.utils.sheet_to_json(wb.Sheets['Calendar']);
const plantRows = XLSX.utils.sheet_to_json(wb.Sheets['Plants']);

const MONTH_IDS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
const MONTH_NAMES = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];

const newPlants = [
  { id: 'pihta', name: 'Пихта', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '', icon: 'conifer-pine', family: '', feed: '', perennial: '' },
  { id: 'mikrobiota', name: 'Микробиота', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '', icon: 'conifer-thuja', family: '', feed: '', perennial: '' },
  { id: 'boyaryshnik', name: 'Боярышник', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'klen-yaponskiy', name: 'Клён японский', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
];

function row(monthIdx, workType, category, plant, text) {
  return {
    region: 'srednyaya-polosa', month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx],
    workType, category, plants: plant, growMethod: 'grunt', text, detail: '', source: '',
  };
}

const newCal = [
  // ---- пихта ----
  row(3, 'posev', 'dekor', 'pihta', 'Посадка пихты — ранней весной саженцами с ЗКС старше 5 лет, в полутень на влажную дренированную слабокислую почву.'),
  row(4, 'poliv', 'dekor', 'pihta', 'Регулярный полив и дождевание кроны пихты в засуху; мульчирование хвойным опадом или корой — пихта не переносит сухого воздуха.'),
  row(4, 'udobrenie', 'dekor', 'pihta', 'Весенняя подкормка пихты удобрением для хвойных без извести и избытка азота.'),
  row(4, 'obrabotka', 'dekor', 'pihta', 'От пихтового хермеса (белый пушок и вздутия на хвое) — обработка инсектицидом в начале распускания почек и повторно летом.'),
  row(2, 'obrezka', 'dekor', 'pihta', 'Санитарная обрезка пихты ранней весной — сухие, подмёрзшие ветви, «двойные» верхушки.'),
  row(9, 'ukrytie', 'dekor', 'pihta', 'Притенение молодых пихт с южной стороны на зиму от солнечного ожога, мульчирование приствольного круга, связывание узких крон от снеголома.'),

  // ---- микробиота ----
  row(3, 'posev', 'dekor', 'mikrobiota', 'Посадка микробиоты — весной или в конце лета в полутень, в яму с песком и перегноем; на сырых участках — на приподнятую гряду.'),
  row(4, 'poliv', 'dekor', 'mikrobiota', 'Полив микробиоты только молодым растениям и в сильную засуху; мульчирование хвойным опадом или корой, обновляется ежегодно.'),
  row(2, 'obrezka', 'dekor', 'mikrobiota', 'Санитарная обрезка микробиоты — сухие и поломанные веточки; прищипка концов побегов для загущения ковра.'),
  row(5, 'razmnozhenie', 'dekor', 'mikrobiota', 'Размножение микробиоты полуодревесневшими черенками летом и отделением укоренившихся отводков.'),

  // ---- боярышник ----
  row(3, 'posev', 'dekor', 'boyaryshnik', 'Посадка боярышника — весной до распускания почек или осенью, на солнце; для живой изгороди — траншея, растения через 50–70 см.'),
  row(3, 'udobrenie', 'dekor', 'boyaryshnik', 'Весенняя азотная подкормка боярышника (перегной, мочевина); плодовым видам перед цветением — фосфорно-калийное.'),
  row(4, 'obrabotka', 'dekor', 'boyaryshnik', 'От боярышницы (гусеницы объедают листья и почки), тли и листовёртки — сбор зимующих гнёзд и обработка инсектицидом по молодым гусеницам.'),
  row(4, 'obrezka', 'dekor', 'boyaryshnik', 'Формирующая стрижка живой изгороди из боярышника в конце мая — июне; санитарная обрезка солитеров и вырезка корневой поросли.'),
  row(6, 'obrezka', 'dekor', 'boyaryshnik', 'Повторная летняя стрижка изгороди из боярышника в июле для плотной формы.'),
  row(8, 'urozhay', 'dekor', 'boyaryshnik', 'Сбор плодов боярышника при полном окрашивании (сентябрь) — на компоты, джемы, сушку и лекарственное сырьё.'),

  // ---- клён японский ----
  row(3, 'posev', 'dekor', 'klen-yaponskiy', 'Посадка клёна японского (привитой саженец) весной после заморозков или ранней осенью, в полутень на влажную кислую дренированную почву с толстой мульчей из коры хвойных.'),
  row(4, 'poliv', 'dekor', 'klen-yaponskiy', 'Регулярный полив клёна японского без пересыхания кома, особенно в жару; обновление мульчи из сосновой коры.'),
  row(4, 'udobrenie', 'dekor', 'klen-yaponskiy', 'Весной — небольшая доза удобрения для рододендронов или хвойных; избыток азота даёт невызревающий подмерзающий прирост.'),
  row(1, 'obrezka', 'dekor', 'klen-yaponskiy', 'Санитарная и лёгкая формирующая обрезка клёна японского в безлистном состоянии (конец зимы, до сокодвижения); сильная обрезка портит габитус.'),
  row(9, 'ukrytie', 'dekor', 'klen-yaponskiy', 'Укрытие клёна японского на зиму: каркас со спанбондом в 2–3 слоя, толстая мульча приствольного круга; молодые растения надёжнее держать в контейнере с холодной зимовкой при 0…+5 °C.'),
];

wb.Sheets['Plants'] = XLSX.utils.json_to_sheet([...plantRows, ...newPlants]);
wb.Sheets['Plants']['!cols'] = [
  { wch: 22 }, { wch: 26 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
  { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
];
wb.Sheets['Calendar'] = XLSX.utils.json_to_sheet([...calRows, ...newCal]);
wb.Sheets['Calendar']['!cols'] = [
  { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  { wch: 24 }, { wch: 14 }, { wch: 60 }, { wch: 50 }, { wch: 40 },
];
XLSX.writeFile(wb, XLSX_PATH);

console.log(`Добавлено культур: ${newPlants.length} (${newPlants.map(p => p.id).join(', ')})`);
console.log(`Добавлено строк календаря: ${newCal.length}`);
console.log(`Итого Plants: ${plantRows.length + newPlants.length}, Calendar: ${calRows.length + newCal.length}`);
