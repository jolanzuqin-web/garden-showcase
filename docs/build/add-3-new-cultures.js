// Добавляет 3 культуры: метасеквойя, рябина, рябинник рябинолистный.
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
  { id: 'metasekvoyya', name: 'Метасеквойя', category: 'dekor', group: 'hvoynye', hasSeedlingStage: 'нет', regions: '', icon: 'conifer-pine', family: '', feed: '', perennial: '' },
  { id: 'ryabina', name: 'Рябина', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'ryabinolistnik', name: 'Рябинник рябинолистный', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
];

function row(monthIdx, workType, category, plant, text) {
  return {
    region: 'srednyaya-polosa', month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx],
    workType, category, plants: plant, growMethod: 'grunt', text, detail: '', source: '',
  };
}

const newCal = [
  // ---- метасеквойя ----
  row(2, 'posev', 'dekor', 'metasekvoyya', 'Посадка метасеквойи — саженцем с ЗКС в марте—апреле или в ноябре, в защищённое от поздних заморозков и ветра влажное место (лучше у воды или южной стены), в глубокую яму с дренажом и торфом; корневая шейка на уровне почвы.'),
  row(4, 'poliv', 'dekor', 'metasekvoyya', 'Обильный полив метасеквойи 1–2 раза в неделю в сухую погоду (влаголюбива, засухи не переносит); мульча корой или щепой слоем 7–10 см с отступом от ствола.'),
  row(3, 'udobrenie', 'dekor', 'metasekvoyya', 'Весенняя подкормка метасеквойи удобрением для хвойных без извести, с магнием; со второй половины лета азот не вносят — прирост не успевает вызреть.'),
  row(2, 'obrezka', 'dekor', 'metasekvoyya', 'Санитарная обрезка метасеквойи до распускания почек — сухие, поломанные и подмёрзшие концы побегов; при раздвоении лидера оставляют один.'),
  row(9, 'ukrytie', 'dekor', 'metasekvoyya', 'Молодые метасеквойи (первые 3–5 лет) на зиму мульчируют слоем 15–20 см и укрывают спанбондом; поздний невызревший прирост подмерзает — весной его вырезают до живой почки.'),

  // ---- рябина ----
  row(3, 'posev', 'dekor', 'ryabina', 'Посадка рябины — весной до распускания почек или в сентябре, на солнце, саженцем с ЗКС; корневую шейку не заглублять, место прививки у сортовых — выше почвы. Для сладкоплодных сортов сажают 2–3 сорта для опыления.'),
  row(3, 'udobrenie', 'dekor', 'ryabina', 'Весенняя азотная подкормка рябины (перегной, мочевина 15–20 г/м²); перед цветением и после — фосфорно-калийное для урожая и вызревания древесины.'),
  row(4, 'obrabotka', 'dekor', 'ryabina', 'От рябиновой моли (червивые плоды), рябиновой тли и галлового клеща — обработка инсектицидом/акарицидом через 7–10 дней после цветения и повторно; от монилиоза и ржавчины — уборка падалицы, медьсодержащий фунгицид, не сажать рядом с можжевельником.'),
  row(2, 'obrezka', 'dekor', 'ryabina', 'Обрезка рябины ранней весной до набухания почек (рано трогается в рост) — прореживание середины кроны, перевод проводника на боковую ветвь у пирамидальных форм, вырезка сухих ветвей и корневой поросли ниже прививки.'),
  row(8, 'urozhay', 'dekor', 'ryabina', 'Сбор плодов рябины кистями при полном окрашивании (август—сентябрь); у видовой и части сортов горечь уходит после первых заморозков. На сушку, заморозку, компоты, настойки.'),

  // ---- рябинник рябинолистный ----
  row(3, 'posev', 'dekor', 'ryabinolistnik', 'Посадка рябинника — весной или в сентябре на солнце или в полутень во влажную почву; сразу вкопать ограничитель корней (лента, бордюр на 20–30 см) против расползания поросли; корневая шейка на 2–3 см выше уровня земли.'),
  row(5, 'poliv', 'dekor', 'ryabinolistnik', 'Регулярный полив рябинника в сухую погоду (влаголюбив, засуху переносит плохо — листья мельчают и буреют по краю) и мульчирование корой или компостом слоем 6–8 см.'),
  row(3, 'obrezka', 'dekor', 'ryabinolistnik', 'Ранневесенняя обрезка рябинника до распускания почек — вырезка старых (старше 4–5 лет) и слабых побегов «на пень», раз в 2–3 года можно срезать весь куст на 15–20 см; отцветшие метёлки убирают после цветения, лишнюю поросль подрубают.'),
  row(4, 'razmnozhenie', 'dekor', 'ryabinolistnik', 'Размножение рябинника отделением укоренившейся корневой поросли и делением куста весной или в конце лета, зелёными и полуодревесневшими черенками — летом.'),
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
