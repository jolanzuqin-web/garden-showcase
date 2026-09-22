// Cloudflare Worker: ежемесячные садовые рекомендации в Telegram-каналах
// (по региону) + общий канал-анонс. Личных подписок больше нет - см.
// PROJECT.md, "Переход на Telegram-каналы", о миграции с KV на каналы.
// Старый KV-ключ (только для одноразовой миграционной рассылки, см.
// handleChannelMigrationNotice), новые записи не создаются:
//   tg:<chatId>       -> { region, status: 'confirmed', createdAt }

const REGIONS = ['srednyaya-polosa', 'yug', 'ural-sibir', 'severo-zapad'];
const REGION_NAMES = {
  'srednyaya-polosa': 'Средняя полоса',
  yug: 'Юг',
  'ural-sibir': 'Урал и Сибирь',
  'severo-zapad': 'Северо-Запад',
};
const REGION_CHANNELS = {
  'srednyaya-polosa': '@posadu_ru_SP',
  yug: '@posadu_ru_YUG',
  'ural-sibir': '@posadu_ru_URAL',
  'severo-zapad': '@posadu_ru_SZ',
};
const GENERAL_CHANNEL = '@posadu_ru';
const MONTH_IDS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const MONTH_NAMES = {
  yanvar: 'Январь', fevral: 'Февраль', mart: 'Март', aprel: 'Апрель', may: 'Май',
  iyun: 'Июнь', iyul: 'Июль', avgust: 'Август', sentyabr: 'Сентябрь',
  oktyabr: 'Октябрь', noyabr: 'Ноябрь', dekabr: 'Декабрь',
};

// Одна короткая сезонная реплика гуся-смотрителя в шапку рассылки — тот же
// персонаж, что на posadu.ru. Ужато из историй карточки (docs/js/app.js GOOSE
// / Garden/TZ_gus-12-scen.md); декабрь замыкается на январь.
const GOOSE_LINES = {
  yanvar: 'Январь — время описи: перебираю семена и рисую план грядок. В феврале на подоконник встанет первая рассада перца.',
  fevral: 'На подоконнике уже весна: караулю всходы перца и баклажанов и готовлю семена к большому мартовскому севу.',
  mart: 'Пока сад спит — обрезка яблонь и первое опрыскивание «по голубому конусу» от вредителей, что зимовали в коре.',
  aprel: 'Снимаю укрытие с роз и жду, пока подсохнет земля: в мае — высадка рассады и первая обработка овощей.',
  may: 'Май обманчив: днём тепло, а ночью заморозок. Держу спанбонд наготове и жду погоды для высадки томатов и огурцов.',
  iyun: 'Сплошная работа: опоры, подвязки и вечная война с колорадским жуком. Поспевает первая клубника.',
  iyul: 'Жара — поливаю по утрам и собираю первый урожай: смородину, вишню, огурцы. В августе — лук и заготовки.',
  avgust: 'Урожай валом. Сушу лук и травы, раздаю соседям кабачки и напоследок брызгаю сад от фитофторы.',
  sentyabr: 'Месяц уборки и посадок загодя: копаю картошку, свожу яблоки, в конце месяца сажаю озимый чеснок и тюльпаны.',
  oktyabr: 'Готовлю сад к холодам: белю стволы, обвязываю от зайцев, обильно проливаю деревья на всю зиму.',
  noyabr: 'Последние укрытия: гортензии на дугах, туи под шпагат, штамбы обвязаны. Инвентарь — под навес до весны.',
  dekabr: 'Зимний дозор: отряхнуть мокрый снег с веток, проверить погреб. А в январе — снова за тетрадь и план на год.',
};

// Обычное !== останавливается на первом несовпавшем символе - теоретически
// позволяет по микрозадержкам ответа подобрать секрет посимвольно (timing
// attack). Сравнивает все символы всегда, без ранней остановки, поэтому
// время сравнения не зависит от того, где начинается расхождение. Длина
// секрета при несовпадении длин технически "утекает" через быстрый выход -
// это стандартный, общепринятый компромисс (длина секрета сама по себе не
// секрет, в отличие от его содержимого).
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

async function sendTelegram(env, chatId, text, extra = {}) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

async function answerCallbackQuery(env, callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

// Ссылки на каналы одним блоком - используется и в приветствии бота, и в
// анонсе общего канала при ежемесячной рассылке.
function channelsListText() {
  const lines = REGIONS.map((r) => `• <b>${REGION_NAMES[r]}</b> — ${REGION_CHANNELS[r]}`);
  return `🌍 Общий канал — ${GENERAL_CHANNEL}\n${lines.join('\n')}`;
}

const HELP_TEXT = `🌱 <b>Календарь садовода</b>\n\nЛичной рассылки от бота больше нет — сезонные работы публикуются в Telegram-каналах, подпишись на свой регион:\n\n${channelsListText()}\n\nПолный календарь без подписки — posadu.ru`;

async function fetchCalendarData(env) {
  const [calendar, worktypes] = await Promise.all([
    fetch(`${env.SITE_ORIGIN}/data/calendar.json`).then((r) => r.json()),
    fetch(`${env.SITE_ORIGIN}/data/worktypes.json`).then((r) => r.json()),
  ]);
  return { calendar, worktypesById: new Map(worktypes.map((w) => [w.id, w])) };
}

async function handleTelegramWebhook(request, env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return new Response('server misconfigured', { status: 500 });
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!timingSafeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return new Response('forbidden', { status: 403 });
  const update = await request.json().catch(() => null);

  // Инлайн-кнопок больше нет (выбор региона был частью личной подписки,
  // которую заменили каналами) - callback_query, если вдруг придёт со
  // старой клавиатуры у кого-то в истории чата, просто подтверждаем без
  // действия, чтобы Telegram не показывал "часики" у пользователя.
  const callback = update?.callback_query;
  if (callback) {
    await answerCallbackQuery(env, callback.id, 'Подписка через бота больше не работает — см. /help').catch(() => {});
    return json({ ok: true }, 200);
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = (message?.text || '').trim();
  if (!chatId || !text) return json({ ok: true }, 200);

  if (text.startsWith('/start') || text === '/help') {
    await sendTelegram(env, chatId, HELP_TEXT);
  } else {
    // Опечатка, произвольный текст, стикер и т.п. - без этой ветки бот молча
    // не отвечал вообще (return ниже - обязательный ответ Telegram-серверу
    // на вебхук, не сообщение пользователю), что выглядело как "бот сломан".
    await sendTelegram(env, chatId, 'Не понял команду 🤔\n\n' + HELP_TEXT);
  }
  return json({ ok: true }, 200);
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

// Возвращает массив готовых к отправке Telegram-сообщений (не одну строку) -
// на реальных данных календаря дайджест одним сообщением превышал лимит
// Telegram в 4096 символов у 26 из 47 комбинаций регион×месяц (Урал и Сибирь
// в пик сезона - втрое больше лимита), из-за чего Telegram Bot API отклонял
// отправку целиком. Блоки "Подробнее" (e.detail - конкретные препараты,
// дозировки) в дайджест не идут вовсе - именно они давали основной объём;
// без них превышают лимит уже не 26, а 4 из 47 комбинаций. Полный текст с
// подробностями остаётся на сайте (docs/kalendar/<region>.html), поэтому
// вместо потери информации дайджест заканчивается ссылкой на неё.
function buildDigestParts(regionId, monthId, calendar, worktypesById) {
  const entries = calendar.filter((e) => e.region === regionId && e.month === monthId);
  if (entries.length === 0) return null;
  const byWorkType = new Map();
  for (const e of entries) {
    if (!byWorkType.has(e.workType)) byWorkType.set(e.workType, []);
    byWorkType.get(e.workType).push(e);
  }

  // Блоки — по возрастанию wt.order (как на сайте), а не по порядку появления
  // в данных. Внутри блока каждый пункт с новой строки; между блоками — пустая
  // строка, чтобы сообщение не читалось «простынёй».
  const blocks = [...byWorkType.entries()]
    .map(([workType, list]) => ({ wt: worktypesById.get(workType), workType, list }))
    .sort((a, b) => (a.wt?.order ?? 99) - (b.wt?.order ?? 99))
    .map(({ wt, workType, list }) => {
      let block = `${wt ? wt.icon + ' ' : ''}<b>${wt ? wt.name : workType}</b>\n`;
      for (const e of list) block += `— ${e.text}\n`;
      return block.trimEnd();
    });

  const header = `🌿 <b>${MONTH_NAMES[monthId]} · ${REGION_NAMES[regionId]}</b>`;
  const gooseLine = GOOSE_LINES[monthId] ? `\n🪿 <i>«${GOOSE_LINES[monthId]}»</i>` : '';
  const link = `\n\n🔗 Препараты, дозировки и полный список — posadu.ru/kalendar/${regionId}.html`;

  // Раскладываем блоки по типу работ (уже сгруппированы) по сообщениям, не
  // превышающим лимит - подстраховка на случай, если данные вырастут ещё
  // сильнее в будущем и порежут лимит уже без блоков "Подробнее" тоже.
  // Реплика гуся идёт только в первой части.
  const firstSeed = header.length + gooseLine.length + 2;
  const restSeed = header.length + 8; // + " · i/n"
  const groups = [];
  let current = [];
  let currentLen = firstSeed;
  for (const block of blocks) {
    const addLen = block.length + 2; // блоки склеиваются через "\n\n"
    if (current.length && currentLen + addLen + link.length > TELEGRAM_MESSAGE_LIMIT) {
      groups.push(current);
      current = [];
      currentLen = restSeed;
    }
    current.push(block);
    currentLen += addLen;
  }
  if (current.length) groups.push(current);

  return groups.map((groupBlocks, i) => {
    const isLast = i === groups.length - 1;
    const partHeader = groups.length > 1
      ? `🌿 <b>${MONTH_NAMES[monthId]} · ${REGION_NAMES[regionId]}</b> · ${i + 1}/${groups.length}`
      : header;
    const intro = i === 0 ? gooseLine : '';
    return `${partHeader}${intro}\n\n${groupBlocks.join('\n\n')}${isLast ? link : ''}`;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelegramWithRetry(env, chatId, text, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await sendTelegram(env, chatId, text);
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await sleep(500 * i);
    }
  }
}

// Ежемесячная рассылка - один пост на регион в его канал (не N личных
// сообщений подписчикам, как раньше) + короткий анонс со ссылками на все
// каналы в общем канале.
async function handleSendMonthly(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const { calendar, worktypesById } = await fetchCalendarData(env);
  const monthId = MONTH_IDS[new Date().getUTCMonth()];

  let tgSent = 0, tgFailed = 0, tgSkipped = 0;

  for (const regionId of REGIONS) {
    const parts = buildDigestParts(regionId, monthId, calendar, worktypesById);
    if (!parts) {
      tgSkipped++;
      continue;
    }
    try {
      for (let i = 0; i < parts.length; i++) {
        await sendTelegramWithRetry(env, REGION_CHANNELS[regionId], parts[i]);
        if (i < parts.length - 1) await sleep(250);
      }
      tgSent++;
    } catch (err) {
      console.error('channel send failed', regionId, err);
      tgFailed++;
    }
  }

  try {
    const announce = `🌿 <b>${MONTH_NAMES[monthId]}</b>\n\nДайджест сезонных работ опубликован в региональных каналах:\n\n${channelsListText()}`;
    await sendTelegramWithRetry(env, GENERAL_CHANNEL, announce);
  } catch (err) {
    console.error('general channel announce failed', err);
    tgFailed++;
  }

  if (env.ADMIN_CHAT_ID) {
    const summary = `📬 Рассылка за ${MONTH_NAMES[monthId]}: каналов отправлено ${tgSent}, ошибок ${tgFailed}, пропущено (нет данных на месяц) ${tgSkipped}.`;
    try {
      await sendTelegram(env, env.ADMIN_CHAT_ID, summary);
    } catch (err) {
      console.error('admin notify failed', err);
    }
  }

  return json({ ok: tgFailed === 0, month: monthId, tgSent, tgFailed, tgSkipped }, 200);
}

// Внеплановый пост произвольного текста в канал(ы) - по образцу
// handleSendMonthly. Дёргается вручную через CRON_SECRET.
// body: { text: string, channel?: 'general' | RegionId | 'all' (по умолчанию 'general') }
async function handleBroadcast(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const channelArg = body?.channel || 'general';

  if (!text) return new Response('bad request: expected {"text": "...", "channel"?: "general"|region|"all"}', { status: 400 });
  if (text.length > TELEGRAM_MESSAGE_LIMIT) {
    return new Response(`bad request: text too long (${text.length} > ${TELEGRAM_MESSAGE_LIMIT})`, { status: 400 });
  }

  let targets;
  if (channelArg === 'all') targets = [GENERAL_CHANNEL, ...REGIONS.map((r) => REGION_CHANNELS[r])];
  else if (channelArg === 'general') targets = [GENERAL_CHANNEL];
  else if (REGIONS.includes(channelArg)) targets = [REGION_CHANNELS[channelArg]];
  else return new Response(`bad request: unknown channel "${channelArg}"`, { status: 400 });

  let tgSent = 0, tgFailed = 0;
  for (const target of targets) {
    try {
      await sendTelegramWithRetry(env, target, text);
      tgSent++;
    } catch (err) {
      console.error('broadcast send failed', target, err);
      tgFailed++;
    }
    await sleep(50);
  }

  if (env.ADMIN_CHAT_ID) {
    try {
      await sendTelegram(env, env.ADMIN_CHAT_ID, `📣 Внеплановый пост (${channelArg}): отправлено ${tgSent}, ошибок ${tgFailed}.`);
    } catch (err) {
      console.error('admin notify failed', err);
    }
  }

  return json({ ok: tgFailed === 0, targets: targets.length, tgSent, tgFailed }, 200);
}

// Одноразовая рассылка старым личным подписчикам бота (KV tg:<chatId>) -
// сообщает, что личная рассылка отключена, и даёт ссылку на канал их
// региона. Не трогает handleSendMonthly/каналы. dryRun:true - только
// посчитать подписчиков без отправки. После рассылки можно очистить KV
// вручную (см. PROJECT.md, "Переход на Telegram-каналы") - сама функция
// записи не удаляет, чтобы повторный запуск с dryRun:false было безопасно
// повторить при частичном сбое (без сплошного дублирования - см. пометку
// migrationNotifiedAt).
async function handleChannelMigrationNotice(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });
  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  let tgSent = 0, tgFailed = 0, tgSkipped = 0, recipients = 0;
  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ prefix: 'tg:', cursor });
    for (const key of page.keys) {
      const record = await env.SUBSCRIBERS.get(key.name, 'json');
      if (!record) continue;
      recipients++;
      if (record.migrationNotifiedAt) {
        tgSkipped++;
        continue;
      }
      if (dryRun) continue;
      const chatId = key.name.slice('tg:'.length);
      const channel = REGION_CHANNELS[record.region] || GENERAL_CHANNEL;
      const text = `📢 <b>Личная рассылка отключена</b>\n\nМы перевели рассылку сезонных работ в Telegram-каналы — так проще для всех, и мы не храним ваш аккаунт в базе. Подпишитесь на канал вашего региона «${REGION_NAMES[record.region] || ''}»: ${channel}\n\nВесь список каналов — /help`;
      try {
        await sendTelegramWithRetry(env, chatId, text);
        await env.SUBSCRIBERS.put(key.name, JSON.stringify({ ...record, migrationNotifiedAt: new Date().toISOString() }));
        tgSent++;
      } catch (err) {
        console.error('migration notice failed', chatId, err);
        tgFailed++;
      }
      await sleep(50);
    }
    cursor = page.cursor;
  } while (cursor);

  return json({ ok: tgFailed === 0, dryRun, recipients, tgSent, tgFailed, tgSkipped }, 200);
}

async function handleExportSubscribers(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const subscribers = [];
  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ prefix: 'tg:', cursor });
    for (const key of page.keys) {
      const record = await env.SUBSCRIBERS.get(key.name, 'json');
      if (record) subscribers.push({ chatId: key.name.slice('tg:'.length), ...record });
    }
    cursor = page.cursor;
  } while (cursor);

  return json({ exportedAt: new Date().toISOString(), count: subscribers.length, subscribers }, 200);
}

// Переиспользуется CI (см. .github/workflows/deploy-smoke-check.yml), чтобы
// слать админу в Telegram уведомление о сбое деплоя сайта, не заводя
// отдельный набор Telegram-секретов в GitHub Actions - воркер уже умеет
// слать сообщения и уже доверяет CRON_SECRET.
async function handleAdminNotify(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });
  if (!env.ADMIN_CHAT_ID) return new Response('ADMIN_CHAT_ID not configured', { status: 500 });

  const body = await request.json().catch(() => null);
  const text = body?.text;
  if (!text) return new Response('bad request: expected {"text": "..."}', { status: 400 });

  await sendTelegram(env, env.ADMIN_CHAT_ID, text);
  return json({ ok: true }, 200);
}

async function setMyCommands(env, commands, scope, language_code) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands, ...(scope ? { scope } : {}), ...(language_code ? { language_code } : {}) }),
  });
  if (!res.ok) throw new Error(`setMyCommands ${res.status}: ${await res.text()}`);
}

// Разовая (не на каждый апдейт) настройка меню "/" в Telegram - без неё
// кнопка со списком команд у бота пустая. Дёргается вручную через
// CRON_SECRET, не автоматически при каждом сообщении - список команд меняется
// примерно никогда, незачем слать лишний запрос в Telegram на каждый апдейт.
async function handleSetupCommands(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const publicCommands = [
    { command: 'start', description: 'Ссылки на каналы по регионам' },
    { command: 'help', description: 'Список команд' },
  ];
  await setMyCommands(env, publicCommands);
  // Явно дублируем под language_code "ru" - Telegram-клиент на русском языке
  // запрашивает языковую версию списка команд отдельно от языконезависимой;
  // без этого вызова у русскоязычных пользователей меню оказывалось пустым
  // (используем ru, т.к. описания команд у бота на русском - см. вводные).
  await setMyCommands(env, publicCommands, undefined, 'ru');

  return json({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/telegram-webhook' && request.method === 'POST') return handleTelegramWebhook(request, env);
    if (url.pathname === '/send-monthly' && request.method === 'POST') return handleSendMonthly(request, env);
    if (url.pathname === '/broadcast' && request.method === 'POST') return handleBroadcast(request, env);
    if (url.pathname === '/send-channel-migration-notice' && request.method === 'POST') return handleChannelMigrationNotice(request, env);
    if (url.pathname === '/export-subscribers' && request.method === 'GET') return handleExportSubscribers(request, env);
    if (url.pathname === '/admin-notify' && request.method === 'POST') return handleAdminNotify(request, env);
    if (url.pathname === '/admin-setup-commands' && request.method === 'POST') return handleSetupCommands(request, env);

    return new Response('Not found', { status: 404 });
  },
};
