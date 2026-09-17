// git textconv-драйвер для garden-data.xlsx: переводит все листы в TSV,
// чтобы git diff/git blame показывали построчные изменения агроданных,
// а не «Binary files differ». git по соображениям безопасности не
// исполняет команды из закоммиченного .gitattributes - сам textconv
// регистрируется локально каждым разработчиком (разово):
//
//   git config diff.xlsx.textconv "node docs/build/xlsx-textconv.js"
//
// .gitattributes только помечает garden-data.xlsx драйвером "xlsx" - какую
// команду он запускает, решает локальный git config выше. См. PROJECT.md.
//
// Запуск вручную: node docs/build/xlsx-textconv.js garden-data.xlsx

const XLSX = require('xlsx');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node xlsx-textconv.js <file.xlsx>');
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
for (const sheetName of wb.SheetNames) {
  console.log(`### ${sheetName} ###`);
  console.log(XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { FS: '\t' }));
}
