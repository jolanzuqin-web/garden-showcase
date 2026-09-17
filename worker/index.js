// Cloudflare Worker: подписка на ежемесячные садовые рекомендации (Telegram).
// KV-ключи:
//   tg:<chatId>       -> { region, status: 'confirmed', createdAt }

const REGIONS = ['srednyaya-polosa', 'yug', 'ural-sibir', 'severo-zapad'];
const REGION_NAMES = {
  'srednyaya-polosa': 'Средняя полоса',
  yug: 'Юг',
  'ural-sibir': 'Урал и Сибирь',
  'severo-zapad': 'Северо-Запад',
};
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

function regionKeyboard() {
  return { inline_keyboard: REGIONS.map((r) => [{ text: REGION_NAMES[r], callback_data: `region:${r}` }]) };
}

async function getSubscription(env, chatId) {
  return env.SUBSCRIBERS.get(`tg:${chatId}`, 'json');
}

// Возвращает 'created' | 'unchanged' | 'changed' и, если 'changed', предыдущий регион.
// user — Telegram-объект from (message.from / callback_query.from), опционален.
async function subscribe(env, chatId, regionId, user) {
  const existing = await getSubscription(env, chatId);
  const status = !existing ? 'created' : existing.region === regionId ? 'unchanged' : 'changed';

  await env.SUBSCRIBERS.put(`tg:${chatId}`, JSON.stringify({
    region: regionId,
    status: 'confirmed',
    createdAt: existing?.createdAt || new Date().toISOString(),
    username: user?.username || existing?.username,
    firstName: user?.first_name || existing?.firstName,
  }));
  return status === 'changed' ? { status, from: existing.region } : { status };
}

function subscribeResultText(regionId, result) {
  if (result.status === 'unchanged') return `ℹ️ Вы уже подписаны на регион «${REGION_NAMES[regionId]}».\n\nПосмотреть рекомендации на этот месяц — /now\nОтписаться — /stop`;
  if (result.status === 'changed') return `🔄 Регион изменён: «${REGION_NAMES[result.from]}» → «${REGION_NAMES[regionId]}».\n\nПосмотреть рекомендации на этот месяц — /now\nОтписаться — /stop`;
  return `✅ Подписка оформлена для региона «${REGION_NAMES[regionId]}».\nРекомендации будут приходить в начале каждого месяца.\n\nПосмотреть рекомендации на этот месяц — /now\nОтписаться — /stop`;
}

const HELP_TEXT = '🌱 <b>Садовый календарь</b>\n\n/start — выбрать регион и подписаться\n/now — рекомендации на текущий месяц\n/stop — отписаться от рассылки\n/help — это сообщение';

async function fetchCalendarData(env) {
  const [calendar, worktypes] = await Promise.all([
    fetch(`${env.SITE_ORIGIN}/data/calendar.json`).then((r) => r.json()),
    fetch(`${env.SITE_ORIGIN}/data/worktypes.json`).then((r) => r.json()),
  ]);
  return { calendar, worktypesById: new Map(worktypes.map((w) => [w.id, w])) };
}

async function handleNow(env, chatId) {
  const subscription = await getSubscription(env, chatId);
  if (!subscription) {
    await sendTelegram(env, chatId, 'Сначала выберите регион — /start');
    return;
  }
  const { calendar, worktypesById } = await fetchCalendarData(env);
  const monthId = MONTH_IDS[new Date().getUTCMonth()];
  const parts = buildDigestParts(subscription.region, monthId, calendar, worktypesById);
  if (!parts) {
    await sendTelegram(env, chatId, `В ${MONTH_NAMES[monthId].toLowerCase()}е рекомендаций для региона «${REGION_NAMES[subscription.region]}» нет.`);
    return;
  }
  try {
    for (let i = 0; i < parts.length; i++) {
      await sendTelegramWithRetry(env, chatId, parts[i]);
      if (i < parts.length - 1) await sleep(250);
    }
  } catch (err) {
    console.error('handleNow send failed', err);
    await sendTelegram(env, chatId, 'Не получилось отправить рекомендации — попробуйте ещё раз чуть позже: /now').catch(() => {});
  }
}

function subscriberLabel(record, chatId) {
  const name = record.firstName || record.username ? `${record.firstName || ''}${record.username ? ` (@${record.username})` : ''}`.trim() : null;
  return name ? `${name} — ${chatId}` : `${chatId}`;
}

async function handleStats(env, chatId) {
  const byRegion = new Map(REGIONS.map((r) => [r, []]));
  let total = 0;
  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ prefix: 'tg:', cursor });
    for (const key of page.keys) {
      const record = await env.SUBSCRIBERS.get(key.name, 'json');
      if (!record) continue;
      total++;
      const subscriberChatId = key.name.slice('tg:'.length);
      byRegion.get(record.region)?.push(subscriberLabel(record, subscriberChatId));
    }
    cursor = page.cursor;
  } while (cursor);

  const lines = REGIONS.map((r) => `<b>${REGION_NAMES[r]}</b> (${byRegion.get(r).length})${byRegion.get(r).map((l) => `\n• ${l}`).join('')}`);
  await sendTelegram(env, chatId, `📊 <b>Подписчики</b>\n\nВсего: ${total}\n\n${lines.join('\n\n')}`);
}

async function handleTelegramWebhook(request, env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return new Response('server misconfigured', { status: 500 });
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!timingSafeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return new Response('forbidden', { status: 403 });
  const update = await request.json().catch(() => null);

  const callback = update?.callback_query;
  if (callback) {
    const chatId = callback.message?.chat?.id;
    const data = callback.data || '';
    if (chatId && data.startsWith('region:')) {
      const regionId = data.slice('region:'.length);
      if (REGIONS.includes(regionId)) {
        const result = await subscribe(env, chatId, regionId, callback.from);
        await answerCallbackQuery(env, callback.id, result.status === 'unchanged' ? 'Вы уже подписаны' : 'Готово');
        await sendTelegram(env, chatId, subscribeResultText(regionId, result));
      }
    }
    return json({ ok: true }, 200);
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = (message?.text || '').trim();
  if (!chatId || !text) return json({ ok: true }, 200);

  if (text.startsWith('/start')) {
    const arg = text.split(' ')[1];
    if (arg && REGIONS.includes(arg)) {
      const result = await subscribe(env, chatId, arg, message.from);
      await sendTelegram(env, chatId, subscribeResultText(arg, result));
    } else {
      const existing = await getSubscription(env, chatId);
      const intro = existing
        ? `🌱 Вы подписаны на регион «${REGION_NAMES[existing.region]}». Выбрать другой:`
        : '🌱 Выберите регион:';
      await sendTelegram(env, chatId, intro, { reply_markup: regionKeyboard() });
    }
  } else if (text === '/now') {
    await handleNow(env, chatId);
  } else if (text === '/stats') {
    if (String(chatId) === env.ADMIN_CHAT_ID) await handleStats(env, chatId);
  } else if (text === '/stop') {
    await env.SUBSCRIBERS.delete(`tg:${chatId}`);
    await sendTelegram(env, chatId, '👋 Вы отписаны от рассылки.');
  } else if (text === '/help') {
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
  // Массовая рассылка (handleSendMonthly) дописывает к последней части ещё
  // "\nОтписаться — /stop" уже после этой функции - резервируем место и под
  // него, иначе именно последняя часть может вылезти за лимит already-затем.
  const trailerReserve = '\nОтписаться — /stop'.length;

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
    if (current.length && currentLen + addLen + link.length + trailerReserve > TELEGRAM_MESSAGE_LIMIT) {
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

async function handleSendMonthly(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const { calendar, worktypesById } = await fetchCalendarData(env);
  const monthId = MONTH_IDS[new Date().getUTCMonth()];

  const digestCache = new Map();
  const getDigestParts = (regionId) => {
    if (!digestCache.has(regionId)) digestCache.set(regionId, buildDigestParts(regionId, monthId, calendar, worktypesById));
    return digestCache.get(regionId);
  };

  // Отметка lastSentMonth на каждом подписчике делает повторный запуск в том же
  // месяце (ручное восстановление после частичного сбоя) безопасным: уже
  // получившие рассылку пропускаются, а недошедшие/сбойные отправляются заново.
  let tgSent = 0, tgFailed = 0, tgSkipped = 0;

  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ prefix: 'tg:', cursor });
    for (const key of page.keys) {
      const chatId = key.name.slice('tg:'.length);
      const record = await env.SUBSCRIBERS.get(key.name, 'json');
      if (!record) continue;
      if (record.lastSentMonth === monthId) {
        tgSkipped++;
        continue;
      }
      const parts = getDigestParts(record.region);
      if (!parts) continue;
      try {
        for (let i = 0; i < parts.length; i++) {
          const isLast = i === parts.length - 1;
          await sendTelegramWithRetry(env, chatId, isLast ? `${parts[i]}\n\nОтписаться — /stop` : parts[i]);
          if (!isLast) await sleep(250);
        }
        await env.SUBSCRIBERS.put(key.name, JSON.stringify({ ...record, lastSentMonth: monthId }));
        tgSent++;
      } catch (err) {
        console.error('telegram send failed', err);
        tgFailed++;
      }
    }
    cursor = page.cursor;
  } while (cursor);

  if (env.ADMIN_CHAT_ID) {
    const summary = `📬 Рассылка за ${MONTH_NAMES[monthId]}: отправлено ${tgSent}, ошибок ${tgFailed}, пропущено (уже отправлено ранее) ${tgSkipped}.`;
    try {
      await sendTelegram(env, env.ADMIN_CHAT_ID, summary);
    } catch (err) {
      console.error('admin notify failed', err);
    }
  }

  return json({ ok: tgFailed === 0, month: monthId, tgSent, tgFailed, tgSkipped }, 200);
}

// Внеплановая рассылка произвольного текста всем подписчикам - по образцу
// handleSendMonthly, но: один и тот же текст для всех регионов, без авторазбивки
// (splitter в monthly завязан на структуру данных региона), без отметки
// lastSentMonth (не должна мешать штатной месячной рассылке). Дёргается вручную
// через CRON_SECRET. dryRun:true - только посчитать подписчиков, ничего не слать.
async function handleBroadcast(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const body = await request.json().catch(() => null);
  const dryRun = body?.dryRun === true;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const trailer = '\n\nОтписаться — /stop';

  if (!dryRun && !text) {
    return new Response('bad request: expected {"text": "..."} or {"dryRun": true}', { status: 400 });
  }
  if (text && text.length + trailer.length > TELEGRAM_MESSAGE_LIMIT) {
    return new Response(
      `bad request: text too long (${text.length + trailer.length} > ${TELEGRAM_MESSAGE_LIMIT})`,
      { status: 400 },
    );
  }

  const message = text + trailer;
  let tgSent = 0, tgFailed = 0, recipients = 0;

  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ prefix: 'tg:', cursor });
    for (const key of page.keys) {
      recipients++;
      if (dryRun) continue;
      const chatId = key.name.slice('tg:'.length);
      try {
        await sendTelegramWithRetry(env, chatId, message);
        tgSent++;
      } catch (err) {
        console.error('broadcast send failed', err);
        tgFailed++;
      }
      await sleep(50);
    }
    cursor = page.cursor;
  } while (cursor);

  if (dryRun) return json({ ok: true, dryRun: true, recipients }, 200);

  if (env.ADMIN_CHAT_ID) {
    try {
      await sendTelegram(env, env.ADMIN_CHAT_ID, `📣 Внеплановая рассылка: отправлено ${tgSent}, ошибок ${tgFailed}.`);
    } catch (err) {
      console.error('admin notify failed', err);
    }
  }

  return json({ ok: tgFailed === 0, recipients, tgSent, tgFailed }, 200);
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
// кнопка со списком команд у бота пустая, единственный способ пользователю
// узнать про /now/​/stop - прочитать /help целиком. Дёргается вручную через
// CRON_SECRET, не автоматически при каждом сообщении - список команд меняется
// примерно никогда, незачем слать лишний запрос в Telegram на каждый апдейт.
async function handleSetupCommands(request, env) {
  const secret = request.headers.get('X-Cron-Secret');
  if (!timingSafeEqual(secret, env.CRON_SECRET)) return new Response('forbidden', { status: 403 });

  const publicCommands = [
    { command: 'start', description: 'Выбрать регион и подписаться' },
    { command: 'now', description: 'Рекомендации на текущий месяц' },
    { command: 'stop', description: 'Отписаться от рассылки' },
    { command: 'help', description: 'Список команд' },
  ];
  await setMyCommands(env, publicCommands);
  // Явно дублируем под language_code "ru" - Telegram-клиент на русском языке
  // запрашивает языковую версию списка команд отдельно от языконезависимой;
  // без этого вызова у русскоязычных пользователей меню оказывалось пустым
  // (используем ru, т.к. описания команд у бота на русском - см. вводные).
  await setMyCommands(env, publicCommands, undefined, 'ru');

  // /stats - админская команда, показываем её в меню только в чате админа,
  // а не всем подписчикам (Telegram поддерживает разные списки команд по
  // "scope", в т.ч. для конкретного chat_id).
  if (env.ADMIN_CHAT_ID) {
    const adminCommands = [...publicCommands, { command: 'stats', description: 'Подписчики по регионам (админ)' }];
    const chatScope = { type: 'chat', chat_id: Number(env.ADMIN_CHAT_ID) };
    await setMyCommands(env, adminCommands, chatScope);
    await setMyCommands(env, adminCommands, chatScope, 'ru');
  }

  return json({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/telegram-webhook' && request.method === 'POST') return handleTelegramWebhook(request, env);
    if (url.pathname === '/send-monthly' && request.method === 'POST') return handleSendMonthly(request, env);
    if (url.pathname === '/broadcast' && request.method === 'POST') return handleBroadcast(request, env);
    if (url.pathname === '/export-subscribers' && request.method === 'GET') return handleExportSubscribers(request, env);
    if (url.pathname === '/admin-notify' && request.method === 'POST') return handleAdminNotify(request, env);
    if (url.pathname === '/admin-setup-commands' && request.method === 'POST') return handleSetupCommands(request, env);

    return new Response('Not found', { status: 404 });
  },
};
