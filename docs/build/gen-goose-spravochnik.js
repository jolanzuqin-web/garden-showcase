// Разовый генератор: гусь-смотритель со справочником (для plants/index.html).
// Тот же YandexART, что gen-illustrations.js, но с прямым промптом (лимит 500).
// node gen-goose-spravochnik.js [N]  — N кандидатов в scratchpad (по умолчанию 3).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const ENV = path.join(ROOT, '.secrets', 'yandexart.env');
const API_BASE = 'https://llm.api.cloud.yandex.net';
const OUT_DIR = process.argv[3] || 'C:/Users/mr-vk/AppData/Local/Temp/claude/C--Users-mr-vk-YandexDisk-Claude-Garden/c148fcd9-06ff-4a6e-b15a-21c574ce0972/scratchpad';

const PROMPT = 'Гусь в мягкой клетчатой твидовой кепке — кепка обязательна, чётко на голове. Свободная винтажная акварель, лёгкий карандашный контур, стиль Беатрикс Поттер, минимум деталей. Один крупный белый домашний гусь вполоборота влево на почти пустом светлом фоне, занимает почти весь кадр. Рядом на полу одна раскрытая тетрадь — единственный предмет, больше ничего. Состаренная кремовая бумага, выцветшая приглушённая палитра, оранжевый клюв. Без рамки, без текста, без горшков и полок. Квадрат.';
const NEGATIVE = 'гусь без шапки, голая голова, захламлённый фон, много предметов, книжные полки, банки, горшки с растениями, комнатные цветы, мелкая детализация, плотная штриховка, глянец, блики, 3D-рендер, CGI, фотореализм, мультфильм, толстый ровный контур, жирная тушь, плоский вектор, кислотные цвета, неон, человеческие руки, пальцы, несколько гусей, второй гусь, птенец, человек, текст, надпись, водяной знак, рамка, бордюр';

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function api(env, method, urlPath, body) {
  const auth = env.YANDEX_API_KEY.startsWith('t1.') || env.YANDEX_API_KEY.length > 100
    ? `Bearer ${env.YANDEX_API_KEY}` : `Api-Key ${env.YANDEX_API_KEY}`;
  const res = await fetch(API_BASE + urlPath, {
    method, headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateOne(env) {
  const body = {
    modelUri: `art://${env.YANDEX_FOLDER_ID}/yandex-art/latest`,
    generationOptions: { aspectRatio: { widthRatio: '1', heightRatio: '1' } },
    messages: [{ weight: '1', text: PROMPT }, { weight: '-1', text: NEGATIVE.slice(0, 480) }],
  };
  const op = await api(env, 'POST', '/foundationModels/v1/imageGenerationAsync', body);
  for (let i = 0; i < 40; i++) {
    await sleep(4000);
    const st = await api(env, 'GET', `/operations/${op.id}`);
    if (st.done) {
      if (st.error) throw new Error('op error: ' + JSON.stringify(st.error).slice(0, 300));
      return Buffer.from(st.response.image, 'base64');
    }
  }
  throw new Error('timeout');
}

(async () => {
  const env = loadEnv();
  const n = parseInt(process.argv[2], 10) || 3;
  console.log(`Промпт: ${PROMPT.length} симв. Кандидатов: ${n}`);
  for (let i = 1; i <= n; i++) {
    process.stdout.write(`  goose ${i} … `);
    try {
      const jpg = await generateOne(env);
      const out = path.join(OUT_DIR, `goose_${i}.webp`);
      await sharp(jpg).resize({ width: 800 }).webp({ quality: 84 }).toFile(out);
      console.log(`ок (${Math.round(fs.statSync(out).size / 1024)} КБ) → ${out}`);
    } catch (e) {
      console.log('ОШИБКА: ' + e.message);
    }
    await sleep(3000);
  }
})().catch(e => { console.error('ФАТАЛЬНО:', e.message); process.exit(1); });
