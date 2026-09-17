// Генерация акварельных иллюстраций культур справочника через Yandex Images API.
//
// Модель yandex-art выведена из эксплуатации 07.09.2026 вместе со старым
// асинхронным methodом foundationModels/v1/imageGenerationAsync. Здесь —
// новый синхронный Images API и модель aliceai-image-art-3.0.
//   https://aistudio.yandex.ru/ru/docs/ai-studio/api/Images/createImage
//
// Ключи — в .secrets/yandexart.env (в .gitignore):
//   YANDEX_API_KEY=...      (API-ключ или IAM-токен)
//   YANDEX_FOLDER_ID=...    (id каталога Yandex Cloud)
//
// Промпты берутся из TZ_spravochnik-rasteniy-illustracii.md:
//   - базовый шаблон с {SUBJECT} из блока ```...``` после «## Базовый промпт»
//   - негатив-лист из следующего ```...``` блока (у нового API нет отдельного
//     поля негатива — вписываем в текст промпта как «Avoid: ...»)
//   - строки таблиц вида  | `id` | `SUBJECT` |
// Лимит промпта у нового API — 32k символов, поэтому используется полный
// английский SUBJECT из ТЗ без обрезки (раньше yandex-art резал до 500).
//
// Использование:
//   node gen-illustrations.js dub lavanda klubnika   — конкретные id
//   node gen-illustrations.js --missing              — все без готового .webp
//   node gen-illustrations.js --all --force          — перегенерировать всё
//
// Результат: docs/img/plants/<id>.webp (700px по ширине, 3:4).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const TZ = path.join(ROOT, 'TZ_spravochnik-rasteniy-illustracii.md');
const IMG_DIR = path.join(ROOT, 'docs', 'img', 'plants');
const ENV = path.join(ROOT, '.secrets', 'yandexart.env');

const API_URL = 'https://ai.api.cloud.yandex.net/v1/images/generations';
const MODEL = 'aliceai-image-art-3.0';
const SIZE = '1024x1536'; // портрет 2:3 — ближайший к 3:4; кроп ниже в sharp
const OUT_W = 700, OUT_H = 933; // ровно 3:4

// aliceai-image-art-3.0 по умолчанию любит дорисовывать состаренную
// рамку-виньетку и тёмные края — глушим явно.
const NO_FRAME =
  'The warm cream paper fills the whole picture edge to edge: no border, ' +
  'no frame, no vignette, no darkened or torn or burnt paper edges, no ' +
  'passe-partout, no drop shadow around the sheet.';

function loadEnv() {
  const txt = fs.readFileSync(ENV, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].trim();
  }
  if (!env.YANDEX_API_KEY) throw new Error('нет YANDEX_API_KEY в .secrets/yandexart.env');
  if (!env.YANDEX_FOLDER_ID) throw new Error('нет YANDEX_FOLDER_ID в .secrets/yandexart.env');
  return env;
}

function parseTz() {
  const txt = fs.readFileSync(TZ, 'utf8');
  const from = txt.indexOf('## Базовый промпт');
  if (from < 0) throw new Error('в ТЗ нет раздела «## Базовый промпт»');
  const after = txt.slice(from);
  const blocks = [...after.matchAll(/```([\s\S]*?)```/g)].map(m => m[1].trim());
  const template = (blocks[0] || '').replace(/\s*\n\s*/g, ' ').trim(); // с {SUBJECT}
  const negative = (blocks[1] || '').replace(/\s*\n\s*/g, ' ').trim();
  if (!template.includes('{SUBJECT}')) throw new Error('в шаблоне ТЗ нет {SUBJECT}');

  const subjects = {};
  for (const m of txt.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|\s*$/gm)) {
    subjects[m[1]] = m[2].trim();
  }
  return { template, negative, subjects };
}

function buildPrompt(template, subject, negative) {
  let p = template.replace('{SUBJECT}', subject);
  if (negative) p += ` Avoid: ${negative}.`;
  p += ' ' + NO_FRAME;
  return p;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateOne(env, prompt) {
  const auth = env.YANDEX_API_KEY.startsWith('t1.') || env.YANDEX_API_KEY.length > 100
    ? `Bearer ${env.YANDEX_API_KEY}`
    : `Api-Key ${env.YANDEX_API_KEY}`;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `art://${env.YANDEX_FOLDER_ID}/${MODEL}`,
      prompt,
      size: SIZE,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('ответ не JSON: ' + text.slice(0, 300)); }
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) throw new Error('в ответе нет data[0].b64_json: ' + text.slice(0, 300));
  return Buffer.from(b64, 'base64');
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const env = loadEnv();
  const { template, negative, subjects } = parseTz();

  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  let ids;
  if (args.includes('--all')) ids = Object.keys(subjects);
  else if (args.includes('--missing')) ids = Object.keys(subjects).filter(id => !fs.existsSync(path.join(IMG_DIR, `${id}.webp`)));
  else ids = args.filter(a => !a.startsWith('--'));

  if (!ids.length) { console.log('нечего генерировать — укажите id, --missing или --all'); return; }

  console.log(`Модель: ${MODEL}. К генерации: ${ids.length} шт. Негатив в промпте: ${negative ? 'да' : 'нет'}`);
  const results = [];
  for (const id of ids) {
    const subj = subjects[id];
    if (!subj) { console.log(`  ПРОПУСК ${id}: нет SUBJECT в ТЗ`); results.push([id, 'нет SUBJECT']); continue; }
    const out = path.join(IMG_DIR, `${id}.webp`);
    if (fs.existsSync(out) && !force) { console.log(`  пропуск ${id}: файл уже есть`); results.push([id, 'уже есть']); continue; }

    const prompt = buildPrompt(template, subj, negative);
    process.stdout.write(`  ${id} (${prompt.length} симв.) … `);
    try {
      const raw = await generateOne(env, prompt);
      await sharp(raw)
        .resize(OUT_W, OUT_H, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toFile(out);
      const kb = Math.round(fs.statSync(out).size / 1024);
      console.log(`ок (${kb} КБ)`);
      results.push([id, `ок ${kb} КБ`]);
    } catch (e) {
      console.log(`ОШИБКА: ${e.message}`);
      results.push([id, 'ошибка: ' + e.message]);
    }
    await sleep(2000);
  }

  console.log('\nИтог:');
  for (const [id, st] of results) console.log(`  ${id.padEnd(24)} ${st}`);
  const okCount = results.filter(r => r[1].startsWith('ок')).length;
  console.log(`\nСгенерировано: ${okCount} / ${ids.length}`);
}

main().catch(e => { console.error('ФАТАЛЬНО:', e.message); process.exit(1); });
