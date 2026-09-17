// Генерирует docs/img/bot-logo.png (1024×1024) — аватар Telegram-бота
// garden-notify. Логотип сайта как есть (знак sy-c-in: венок + монограмма
// П-в-С), на кремовом круге с тонкой рамкой-штемпелем.
// Запуск по требованию: node docs/build/make-bot-avatar.js

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.resolve(__dirname, '..', 'img', 'bot-logo.png');

// Логотип из docs/index.html / page-shell.js (система координат 64×64).
const LOGO = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
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

// знак 64×64 → центр (32,32); масштаб 13 (знак ~832px, ~81% кадра), центр в 512
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <circle cx="512" cy="512" r="512" fill="#f6efdb"/>
  <circle cx="512" cy="512" r="486" fill="none" stroke="#9a6626" stroke-opacity="0.45" stroke-width="4"/>
  <circle cx="512" cy="512" r="478" fill="none" stroke="#9a6626" stroke-opacity="0.25" stroke-width="1.5"/>
  <g transform="translate(512,512) scale(13) translate(-32,-32)">${LOGO}</g>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } }).render().asPng();
fs.writeFileSync(OUT, png);
console.log(`bot-logo.png: ${png.length} байт, 1024×1024`);
