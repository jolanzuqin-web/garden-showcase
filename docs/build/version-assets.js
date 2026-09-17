// Версионирует style.css и JS-файлы календаря хэшем содержимого (как уже
// сделано для bundle.js) - style.css/app.js на проде переставали обновляться
// у части посетителей на много деплоев подряд по причине, которую не удалось
// точно локализовать (не Cloudflare - воспроизводится даже при обращении
// напрямую к origin-IP; похоже на ещё один слой кэширования где-то на пути,
// специфичный для .css/.js). Вместо охоты за источником кэша - делаем кэш
// неважным: любое изменение содержимого = новое имя файла = гарантированный
// промах в ЛЮБОМ кэше на пути, чей бы он ни был.
//
// НЕ редактировать style.<hash>.css / app.<hash>.js и т.д. напрямую - это
// сгенерированные копии. Редактировать docs/css/style.css, docs/js/app.js,
// docs/js/garden-logic.js, docs/js/subscribe.js (источники остаются на
// месте, под обычными именами) - хэшированные копии и index.html обновятся
// сами при следующем запуске build-articles.js/build-region-pages.js
// (оба требуют этот модуль через page-shell.js/напрямую).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DOCS = path.resolve(__dirname, '..');

function hashedCopy(sourcePath, prefix, ext) {
  const dir = path.dirname(sourcePath);
  // Нормализуем переводы строк ДО хэша и записи: иначе Windows (CRLF в рабочей
  // копии из-за autocrlf) и Linux-CI (LF) считают РАЗНЫЙ хэш от одного файла.
  // CI переписывал index.html на свой LF-хэш, но сам хэшированный файл не
  // коммитил -> на проде ссылка вела на несуществующий style.<hash>.css -> 404,
  // сайт без стилей. Хэш и содержимое копии всегда от LF-версии.
  const content = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
  const fileName = `${prefix}.${hash}${ext}`;
  const escapedExt = ext.replace('.', '\\.');
  const stalePattern = new RegExp(`^${prefix}\\.[0-9a-f]+${escapedExt}$`);
  for (const f of fs.readdirSync(dir)) {
    if (stalePattern.test(f) && f !== fileName) fs.unlinkSync(path.join(dir, f));
  }
  fs.writeFileSync(path.join(dir, fileName), content, 'utf8');
  return fileName;
}

const manifest = {
  styleFile: hashedCopy(path.join(DOCS, 'css', 'style.css'), 'style', '.css'),
  appFile: hashedCopy(path.join(DOCS, 'js', 'app.js'), 'app', '.js'),
  gardenLogicFile: hashedCopy(path.join(DOCS, 'js', 'garden-logic.js'), 'garden-logic', '.js'),
  subscribeFile: hashedCopy(path.join(DOCS, 'js', 'subscribe.js'), 'subscribe', '.js'),
  rotationLogicFile: hashedCopy(path.join(DOCS, 'js', 'rotation-logic.js'), 'rotation-logic', '.js'),
  sevooborotFile: hashedCopy(path.join(DOCS, 'js', 'sevooborot.js'), 'sevooborot', '.js'),
};

module.exports = manifest;
