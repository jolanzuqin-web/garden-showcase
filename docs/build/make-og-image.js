// Генерирует docs/og-image.png (1200×630) — картинка для превью ссылок в соцсетях
// (og:image / twitter:image). Верстка в стиле «Дневник садовода»: бумага, рамка-лист,
// знак + вордмарк, курсивный подзаголовок, штемпель. Шрифты — те же woff2 из docs/fonts.
// Запуск разовый/по требованию: node build/make-og-image.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');

const FONTS = path.resolve(__dirname, '..', 'fonts');
const TTF_CACHE = path.resolve(__dirname, '.fonts-ttf'); // gitignore; resvg не читает woff2
const OUT = path.resolve(__dirname, '..', 'og-image.png');

// resvg-js не распаковывает woff2 — держим локальный ttf-кэш, распаковывая через
// fonttools (pip install fonttools brotli) любой отсутствующий файл.
fs.mkdirSync(TTF_CACHE, { recursive: true });
const fontFiles = [
  'caveat-400-cyrillic', 'caveat-400-cyrillic-ext', 'caveat-400-latin', 'caveat-400-latin-ext',
  'cormorant-600-cyrillic', 'cormorant-600-latin',
  'cormorant-400i-cyrillic', 'cormorant-400i-latin',
  'lora-400-cyrillic', 'lora-400-latin',
].map(base => {
  const woff2 = path.join(FONTS, base + '.woff2');
  const ttf = path.join(TTF_CACHE, base + '.ttf');
  if (!fs.existsSync(woff2)) return null;
  if (!fs.existsSync(ttf)) {
    execFileSync('python', ['-m', 'fontTools.ttLib.woff2', 'decompress', woff2, '-o', ttf], { stdio: 'pipe' });
  }
  return ttf;
}).filter(Boolean);

// знак sy-c-in (венок + монограмма П-в-С), как в шапке сайта
const LOGO = `<g transform="translate(96,54) scale(2.06)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M27 10 C 16 14 9 23 9 33 C 9 44 18 53 31 55" stroke="#556139" stroke-width="2.3"/>
  <path d="M37 10 C 48 14 55 23 55 33 C 55 44 46 53 33 55" stroke="#728450" stroke-width="2.3"/>
  <circle cx="32" cy="9" r="1.7" fill="#c1863a" stroke="#38312a" stroke-width="0.8"/>
  <path d="M11 25 C 7 23 5 19 6 15 C 11 16 13 21 11 25 Z" fill="#728450" stroke="#38312a" stroke-width="0.8"/>
  <path d="M8.5 36 C 4 35 1.5 31 2.5 27 C 7.5 28 10 32 8.5 36 Z" fill="#8a9a63" stroke="#38312a" stroke-width="0.8"/>
  <path d="M12 47 C 8 47 4.5 44 4.5 39.5 C 9.5 39.5 13 42.5 12 47 Z" fill="#728450" stroke="#38312a" stroke-width="0.8"/>
  <path d="M53 25 C 57 23 59 19 58 15 C 53 16 51 21 53 25 Z" fill="#8a9a63" stroke="#38312a" stroke-width="0.8"/>
  <path d="M55.5 36 C 60 35 62.5 31 61.5 27 C 56.5 28 54 32 55.5 36 Z" fill="#728450" stroke="#38312a" stroke-width="0.8"/>
  <path d="M52 47 C 56 47 59.5 44 59.5 39.5 C 54.5 39.5 51 42.5 52 47 Z" fill="#8a9a63" stroke="#38312a" stroke-width="0.8"/>
  <circle cx="29.5" cy="55.2" r="1.5" fill="#c78d8c" stroke="#38312a" stroke-width="0.7"/>
  <circle cx="34.5" cy="55.2" r="1.5" fill="#c78d8c" stroke="#38312a" stroke-width="0.7"/>
  <path d="M44.3 24.3 C 41 18.5 37 17.5 32 17.5 C 24 17.5 17.5 24 17.5 32 C 17.5 40 24 46.5 32 46.5 C 37 46.5 41 45.5 44.3 39.7" stroke="#38312a" stroke-width="3"/>
  <path d="M26.5 25 H37.5" stroke="#38312a" stroke-width="3"/>
  <path d="M28 25 V39" stroke="#38312a" stroke-width="3"/>
  <path d="M36 25 V39" stroke="#38312a" stroke-width="3"/>
  <path d="M26 39 H30 M34 39 H38" stroke="#38312a" stroke-width="2.2"/>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#efe3c4"/>
  <rect x="34" y="34" width="1132" height="562" fill="none" stroke="#9a6626" stroke-opacity="0.5" stroke-width="2"/>
  <rect x="38" y="38" width="1124" height="554" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1"/>
  ${LOGO}
  <text x="250" y="150" font-family="Caveat" font-weight="700" font-size="120" fill="#38312a">По саду</text>
  <text x="256" y="188" font-family="Cormorant Garamond" font-weight="600" font-size="27" letter-spacing="4" fill="#6a6053">КАЛЕНДАРЬ САДОВОДА</text>

  <g transform="rotate(3 1044 104)">
    <rect x="940" y="70" width="204" height="84" rx="6" fill="none" stroke="#9a6626" stroke-opacity="0.55" stroke-width="3"/>
    <rect x="945" y="75" width="194" height="74" rx="4" fill="none" stroke="#9a6626" stroke-opacity="0.4" stroke-width="1"/>
    <text x="1042" y="103" text-anchor="middle" font-family="Caveat" font-weight="400" font-size="27" fill="#9a6626">садовый</text>
    <text x="1042" y="138" text-anchor="middle" font-family="Cormorant Garamond" font-weight="600" font-size="34" letter-spacing="3" fill="#9a6626">ДНЕВНИК</text>
  </g>

  <text x="96" y="316" font-family="Cormorant Garamond" font-weight="400" font-size="43" fill="#4a4238">Что делать в саду и огороде прямо сейчас —</text>
  <text x="96" y="376" font-family="Cormorant Garamond" font-weight="400" font-size="43" fill="#4a4238">посадка, обрезка, подкормка, защита.</text>
  <text x="96" y="436" font-family="Cormorant Garamond" font-weight="400" font-size="43" fill="#4a4238">По месяцам и регионам России.</text>

  <text x="96" y="540" font-family="Caveat" font-weight="400" font-size="40" fill="#728450">открываешь с вопросом «что делать сейчас» — находишь ответ</text>
</svg>`;

const resvg = new Resvg(svg, {
  background: '#efe3c4',
  fitTo: { mode: 'width', value: 1200 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Lora' },
});
const png = resvg.render().asPng();
fs.writeFileSync(OUT, png);
console.log(`og-image.png: ${png.length} байт, шрифтов подключено: ${fontFiles.length}`);
