// Генерирует миниатюры карточек справочника: docs/img/plants/thumb/<id>.webp
// (ширина 220px) из полноразмерных docs/img/plants/<id>.webp (700px).
// Индекс plants/index.html показывает картинки как ~96x128 — грузить ради
// этого файлы по 700px незачем. Страницы культур используют полный размер.
//
// Запуск: node make-plant-thumbs.js            — только недостающие/устаревшие
//         node make-plant-thumbs.js --force    — перегенерировать все

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.resolve(__dirname, '..', 'img', 'plants');
const OUT = path.join(SRC, 'thumb');
const WIDTH = 220;
const QUALITY = 72;
const force = process.argv.includes('--force');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.webp'));
let made = 0, skipped = 0, bytesIn = 0, bytesOut = 0;

(async () => {
  for (const f of files) {
    const src = path.join(SRC, f);
    const out = path.join(OUT, f);
    const sStat = fs.statSync(src);
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= sStat.mtimeMs) {
      skipped++; continue;
    }
    await sharp(src).resize({ width: WIDTH }).webp({ quality: QUALITY }).toFile(out);
    made++;
    bytesIn += sStat.size;
    bytesOut += fs.statSync(out).size;
  }
  console.log(`Миниатюр: сделано ${made}, пропущено ${skipped}, всего ${files.length}.`);
  if (made) {
    console.log(`Пересжато: ${(bytesIn / 1048576).toFixed(1)} МБ → ${(bytesOut / 1048576).toFixed(2)} МБ ` +
      `(в среднем ${Math.round(bytesOut / made / 1024)} КБ/шт).`);
  }
})().catch(e => { console.error('ФАТАЛЬНО:', e.message); process.exit(1); });
