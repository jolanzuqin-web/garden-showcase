// Общая, не завязанная на Alpine/браузер логика группировки и подписей
// календаря. Используется и в браузере (app.js, через <script> перед app.js),
// и в Node при сборке (docs/build/build-region-pages.js, через require()) -
// чтобы статический пререндер для роботов и живой Alpine-рендер строились по
// одному и тому же коду, а не по двум копиям, которые могут разойтись.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.GardenLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const MONTH_IDS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr'];
  const MONTH_NAMES = {
    yanvar: 'Январь', fevral: 'Февраль', mart: 'Март', aprel: 'Апрель', may: 'Май',
    iyun: 'Июнь', iyul: 'Июль', avgust: 'Август', sentyabr: 'Сентябрь',
    oktyabr: 'Октябрь', noyabr: 'Ноябрь', dekabr: 'Декабрь',
  };
  const MONTH_GENITIVE = {
    yanvar: 'января', fevral: 'февраля', mart: 'марта', aprel: 'апреля', may: 'мая',
    iyun: 'июня', iyul: 'июля', avgust: 'августа', sentyabr: 'сентября',
    oktyabr: 'октября', noyabr: 'ноября', dekabr: 'декабря',
  };
  // Число дней в месяце (невисокосный год как ориентир - для дат декад точность
  // до дня 28 vs 29 февраля значения не имеет).
  const MONTH_DAYS = {
    yanvar: 31, fevral: 28, mart: 31, aprel: 30, may: 31,
    iyun: 30, iyul: 31, avgust: 31, sentyabr: 30,
    oktyabr: 31, noyabr: 30, dekabr: 31,
  };
  const SEASONS = [
    { id: 'winter', name: 'Зима', icon: '❄️', months: ['dekabr', 'yanvar', 'fevral'] },
    { id: 'spring', name: 'Весна', icon: '🌱', months: ['mart', 'aprel', 'may'] },
    { id: 'summer', name: 'Лето', icon: '☀️', months: ['iyun', 'iyul', 'avgust'] },
    { id: 'autumn', name: 'Осень', icon: '🍂', months: ['sentyabr', 'oktyabr', 'noyabr'] },
  ];

  function seasonForMonth(monthId) {
    return SEASONS.find(s => s.months.includes(monthId)).id;
  }

  function dayToDekada(day) {
    if (day <= 10) return 0;
    if (day <= 20) return 1;
    return 2;
  }

  // Точных дат в данных нет (только месяц) - декаду определяем по явным
  // ориентирам в тексте, см. подробное описание приоритетов в app.js (там же
  // жила эта функция раньше).
  function detectDekada(text, month) {
    const t = text.toLowerCase();
    const genitive = MONTH_GENITIVE[month];

    if (genitive) {
      const own = t.match(new RegExp('(\\d{1,2})\\s*(?:-\\s*\\d{1,2}\\s*)?' + genitive));
      if (own) return dayToDekada(parseInt(own[1], 10));
    }

    const otherMonthNamed = Object.entries(MONTH_GENITIVE)
      .some(([id, gen]) => id !== month && t.includes(gen));
    if (!otherMonthNamed) {
      const bare = t.match(/(\d{1,2})\s*(?:-го|числа)\b/);
      if (bare) return dayToDekada(parseInt(bare[1], 10));
    }

    if (/втор[а-яё]*\s+половин/.test(t)) return 2;
    if (/перв[а-яё]*\s+половин/.test(t)) return 0;
    if (/кон(ец|ц[а-яё]*)|последн|заверш/.test(t)) return 2;
    // только "в начале месяца/роста/цветения…" (предлог "в" перед) и
    // "перв(ой|ых) декад", но не любое "начал*": "после начала
    // листопада", "до начала сокодвижения", "конец X — начало Y" — это
    // не первая декада. \b с кириллицей в JS не работает, поэтому якорим
    // "в" на начало строки или пробел/скобку/кавычку вручную.
    if (/(^|[\s(«])в\s+начал[ео]|перв(ой|ых)\s+декад/.test(t)) return 0;
    if (/середин|средин/.test(t)) return 1;
    return 3;
  }

  function dekadaLabel(i) {
    return ['1-я декада', '2-я декада', '3-я декада', 'Весь месяц'][i];
  }

  function dekadaDateRange(month, i) {
    if (i === 3) return '';
    const days = MONTH_DAYS[month];
    const genitive = MONTH_GENITIVE[month];
    const ranges = [[1, 10], [11, 20], [21, days]];
    const [a, b] = ranges[i];
    return `${a}–${b} ${genitive}`;
  }

  function categoryLabel(cat, long) {
    const map = {
      ogorod: long ? 'Огородная культура' : 'Огородные',
      sad: long ? 'Сад: ягодная или плодовая культура' : 'Сад',
      dekor: long ? 'Декоративное растение' : 'Декоративные',
      'dekor-listva': long ? 'Декоративное: лиственное' : 'Лиственные',
      'dekor-hvoya': long ? 'Декоративное: хвойное' : 'Хвойные',
    };
    return map[cat] || cat;
  }

  // hvoynyeIds - id культур с group='hvoynye' (см. Plants в garden-data.xlsx).
  function dekorGroup(entry, hvoynyeIds) {
    const hasConifer = entry.plants.some(p => hvoynyeIds.includes(p));
    const hasOther = entry.plants.some(p => !hvoynyeIds.includes(p));
    if (hasConifer && hasOther) return 'both';
    if (hasConifer) return 'hvoya';
    return 'listva';
  }

  function entryCategoryLabel(entry, hvoynyeIds) {
    if (entry.category !== 'dekor') return categoryLabel(entry.category);
    const g = dekorGroup(entry, hvoynyeIds);
    return g === 'both' ? categoryLabel('dekor') : categoryLabel('dekor-' + g);
  }

  const GROW_METHOD_LABELS = { rassada: 'Рассада', grunt: 'Открытый грунт' };

  // Сливает все записи одного вида работ (за декаду) в одну карточку - см.
  // подробности мотивации в app.js. plantById(id) - функция поиска растения
  // по id (нужна только для подписей в блоках "Подробнее").
  function mergeEntries(entries, hvoynyeIds, plantById) {
    const categories = [];
    for (const e of entries) {
      const label = entryCategoryLabel(e, hvoynyeIds);
      if (!categories.includes(label)) categories.push(label);
    }
    const growMethodSet = new Set();
    for (const e of entries) for (const gm of e.growMethod) growMethodSet.add(gm);
    const growMethods = ['rassada', 'grunt'].filter(gm => growMethodSet.has(gm)).map(gm => GROW_METHOD_LABELS[gm]);
    const plants = [];
    for (const e of entries) for (const pid of e.plants) if (!plants.includes(pid)) plants.push(pid);
    const detailGroups = new Map();
    for (const e of entries) {
      if (!e.detail) continue;
      if (!detailGroups.has(e.detail)) detailGroups.set(e.detail, { names: [], firstEntry: e });
      const g = detailGroups.get(e.detail);
      for (const pid of e.plants) {
        const name = plantById(pid)?.name;
        if (name && !g.names.includes(name)) g.names.push(name);
      }
    }
    const details = Array.from(detailGroups.entries()).map(([text, { names, firstEntry }]) => {
      const label = names.length
        ? (names.length > 3 ? names.slice(0, 3).join(', ') + ' и др.' : names.join(', '))
        : entryCategoryLabel(firstEntry, hvoynyeIds);
      return { label, text };
    });
    return {
      key: entries.map(e => e.category + e.text.slice(0, 20)).join('|'),
      categories,
      growMethods,
      text: entries.map(e => e.text).join(' '),
      plants,
      details,
    };
  }

  // entries - уже отфильтрованные по региону/месяцу/остальным фильтрам записи.
  // worktypeById(id)/plantById(id) - функции поиска.
  function buildGroupedEntries(entries, hvoynyeIds, worktypeById, plantById) {
    const buckets = [[], [], [], []];
    for (const e of entries) buckets[detectDekada(e.text, e.month)].push(e);

    return buckets
      .map((bucketEntries, i) => {
        if (!bucketEntries.length) return null;
        const worktypeGroups = [];
        const byWt = new Map();
        for (const e of bucketEntries) {
          if (!byWt.has(e.workType)) {
            const g = { workType: e.workType, entries: [] };
            byWt.set(e.workType, g);
            worktypeGroups.push(g);
          }
          byWt.get(e.workType).entries.push(e);
        }
        worktypeGroups.sort((a, b) => worktypeById(a.workType).order - worktypeById(b.workType).order);
        for (const g of worktypeGroups) g.card = mergeEntries(g.entries, hvoynyeIds, plantById);
        return { index: i, label: dekadaLabel(i), dateRange: dekadaDateRange(bucketEntries[0].month, i), worktypeGroups };
      })
      .filter(Boolean);
  }

  return {
    MONTH_IDS, MONTH_NAMES, MONTH_GENITIVE, MONTH_DAYS, SEASONS,
    seasonForMonth, dayToDekada, detectDekada, dekadaLabel, dekadaDateRange,
    categoryLabel, dekorGroup, entryCategoryLabel, mergeEntries, buildGroupedEntries,
  };
});
