// Добавляет 3 культуры: сумах оленерогий, багряник японский, бадан.
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
  { id: 'sumah', name: 'Сумах оленерогий', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'bagryanik', name: 'Багряник японский', category: 'dekor', group: 'dekorativno-listvennye', hasSeedlingStage: 'нет', regions: '', icon: 'shrub-leaf', family: '', feed: '', perennial: '' },
  { id: 'badan', name: 'Бадан', category: 'dekor', group: 'mnogoletnik', hasSeedlingStage: 'нет', regions: '', icon: 'hosta', family: '', feed: '', perennial: '' },
];

function row(monthIdx, workType, category, plant, text) {
  return {
    region: 'srednyaya-polosa', month: MONTH_IDS[monthIdx], monthName: MONTH_NAMES[monthIdx],
    workType, category, plants: plant, growMethod: 'grunt', text, detail: '', source: '',
  };
}

const newCal = [
  // ---- сумах оленерогий ----
  row(2, 'posev', 'dekor', 'sumah', 'Посадка сумаха — саженцем с ЗКС с марта по ноябрь на солнечное дренированное место; корневая шейка на 3–5 см ниже уровня почвы, сразу вкопать ограничитель корней радиусом 1–1,5 м.'),
  row(2, 'obrezka', 'dekor', 'sumah', 'Ранневесенняя санитарная обрезка сумаха — вырезка подмёрзших за зиму концов побегов (крона от этого только гуще); раз в 5–7 лет — омоложение «на пень».'),
  row(4, 'poliv', 'dekor', 'sumah', 'Полив молодого сумаха в засуху первые 2 года и мульчирование корой или торфом слоем 6–8 см; взрослое растение засухоустойчиво.'),
  row(3, 'razmnozhenie', 'dekor', 'sumah', 'Подрубка лопатой и выкопка корневой поросли сумаха по всему участку несколько раз за сезон; отделённая поросль и корневые черенки — материал для размножения.'),
  row(9, 'ukrytie', 'dekor', 'sumah', 'Молодые сумахи первые 2–3 зимы — мульча приствольного круга и окучивание основания в бесснежные морозы.'),

  // ---- багряник японский ----
  row(3, 'posev', 'dekor', 'bagryanik', 'Посадка багряника японского — саженцем с ЗКС весной или в начале осени в полутень на влажную плодородную дренированную слабокислую почву без застоя воды; корневую шейку не заглублять, мульча слоем 7–10 см.'),
  row(5, 'poliv', 'dekor', 'bagryanik', 'Регулярный полив багряника без пересыхания кома и дождевание кроны в жару; при недостатке влаги — краевой ожог листьев и ранний листопад.'),
  row(3, 'udobrenie', 'dekor', 'bagryanik', 'Весенняя подкормка багряника удобрением для лиственных без извести; со второй половины лета азот не вносят — прирост не успеет вызреть.'),
  row(2, 'obrezka', 'dekor', 'bagryanik', 'Санитарная обрезка багряника ранней весной — сухие и подмёрзшие концы побегов; у молодого растения для многоствольной формы оставляют 3–5 сильных стволов.'),
  row(8, 'ukrytie', 'dekor', 'bagryanik', 'Молодые багряники первые 2–3 года — притенение от весеннего солнца, мульча 10–15 см и укрытие спанбондом от поздних заморозков по приросту; взрослое дерево зимостойко до −30 °C без укрытия.'),

  // ---- бадан ----
  row(3, 'posev', 'dekor', 'badan', 'Посадка бадана делёнкой с розеткой листьев весной или в конце лета в полутень на дренированную почву от слабокислой до слабощелочной; корневище кладут горизонтально у поверхности, точку роста не заглубляют.'),
  row(3, 'obrezka', 'dekor', 'badan', 'Весной у бадана осторожно обрывают перезимовавшие бурые листья вместе с черешком (не срезать ножом — срез загнивает); отцветшие цветоносы срезают у основания.'),
  row(5, 'poliv', 'dekor', 'badan', 'Полив бадана только в затяжную засуху (застоя воды не терпит — корневище загнивает); мульча компостом или перегноем слоем 3–5 см, розетку не засыпать.'),
  row(5, 'udobrenie', 'dekor', 'badan', 'Одна подкормка бадана за лето — комплексным удобрением в разведённом виде после цветения; свежий навоз не вносят.'),
  row(4, 'obrabotka', 'dekor', 'badan', 'От слизней и улиток на бадане в сырую погоду — ловушки, подсыпка золы или песка, мульча хвоёй; на переувлажнённых участках следят за пятнистостью листьев и гнилью корневища.'),
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
