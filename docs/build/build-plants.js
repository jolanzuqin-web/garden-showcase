// Собирает справочник растений: docs/plants/<id>.html + docs/plants/index.html
// из markdown-источников docs/plants-src/<id>.md (front-matter «паспорт» + текст
// по этапам жизненного цикла). По аналогии с build-articles.js — редактировать
// только .md-источники, сгенерированный HTML руками не трогать.
//
// Дополнительно пишет docs/data/plant-pages.json — список id культур, у которых
// есть страница. Его читают build-region-pages.js (стикер такой культуры на
// карточке календаря становится ссылкой) и app.js (через window.PLANT_PAGES в
// js/site-config.js, который генерирует build-region-pages.js). Порядок сборки:
// build-from-xlsx.js → build-plants.js → build-region-pages.js → build-sitemap.js.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { escapeHtml, SITE_URL, pageShell } = require('./page-shell');
const GardenLogic = require('../js/garden-logic.js');

const DOCS = path.resolve(__dirname, '..');
const SRC = path.resolve(DOCS, 'plants-src');
const OUT = path.resolve(DOCS, 'plants');
const DATA = path.resolve(DOCS, 'data');
const IMG = path.resolve(DOCS, 'img', 'plants');

const plants = JSON.parse(fs.readFileSync(path.join(DATA, 'plants.json'), 'utf8'));
const worktypes = JSON.parse(fs.readFileSync(path.join(DATA, 'worktypes.json'), 'utf8'));
const calendar = JSON.parse(fs.readFileSync(path.join(DATA, 'calendar.json'), 'utf8'));
const regions = JSON.parse(fs.readFileSync(path.join(DATA, 'regions.json'), 'utf8'));

const plantById = (id) => plants.find(p => p.id === id);
const worktypeById = (id) => worktypes.find(w => w.id === id);

const { MONTH_IDS, MONTH_NAMES } = GardenLogic;
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const { defaultRegionId } = require('./site-config');

// --- этапы: заголовок ## -> иконка типа работ из спрайта (#wt-*) ---
const STAGE_ICONS = [
  [/рассад/i, 'posev'],
  [/посев|посадк|высадк|выбор|подготов|сорт|саженц|семен/i, 'posev'],
  [/полив/i, 'poliv'],
  [/подкорм|удобр|питани/i, 'udobrenie'],
  [/обрезк|формиров|пасынк|подвязк|прищип|нормиров/i, 'obrezka'],
  [/мульч|рыхлен|прополк|окучив|почв/i, 'mulcha'],
  [/защит|болезн|вредител|обработк|профилакт/i, 'obrabotka'],
  [/урожай|сбор|уборк|созрев|хранени|дозар/i, 'urozhay'],
  [/зим|укрыт|заморозк|покой/i, 'ukrytie'],
  [/размножен|черенк|делени|отводк|усы|детк/i, 'razmnozhenie'],
  [/завершен|удален|раскорч|ликвид|оборот|севооборот|после/i, 'obrezka'],
];
function stageIcon(title) {
  for (const [re, id] of STAGE_ICONS) if (re.test(title)) return id;
  return null;
}

// --- паспорт: порядок и подписи полей front-matter ---
const PASSPORT = [
  ['family', 'Семейство'],
  ['lifeform', 'Жизненная форма'],
  ['lifespan', 'Срок на участке'],
  ['propagation', 'Размножение'],
  ['light', 'Свет'],
  ['soil', 'Почва'],
  ['frost', 'Холодостойкость'],
  ['hardiness', 'Районирование'],
  ['spacing', 'Схема посадки'],
  ['time_to_harvest', 'До урожая'],
  ['rotation_good', 'Хорошие предшественники'],
  ['rotation_bad', 'Не сажать после / рядом'],
  ['companions', 'Удачные соседи'],
  ['difficulty', 'Сложность'],
];

// Контейнеры-врезки в markdown -> визуально выделенный блок .agro-note.
// :::remontant ... :::            — врезка с заголовком «Ремонтантные сорта»
// :::note Свой заголовок ... :::  — врезка с произвольным заголовком
// Внутренний markdown рендерим отдельно, наружу отдаём готовый HTML-блок
// (marked не разбирает markdown внутри блочного HTML).
function agroNote(label, inner) {
  return `\n\n<div class="agro-note"><span class="agro-note-label">${escapeHtml(label)}</span>\n${marked.parse(inner.trim())}</div>\n\n`;
}
function renderRich(md) {
  let withNotes = md.replace(
    /^:::remontant[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*$/gm,
    (_, inner) => agroNote('Ремонтантные сорта', inner)
  );
  withNotes = withNotes.replace(
    /^:::note[ \t]+(.+?)[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*$/gm,
    (_, label, inner) => agroNote(label.trim(), inner)
  );
  return marked.parse(withNotes);
}

// Разбивка тела на вводный абзац (до первого ##) и секции-этапы.
function splitSections(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const lead = [];
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      cur = { title: m[1], body: [] };
      sections.push(cur);
    } else if (cur) {
      cur.body.push(line);
    } else {
      lead.push(line);
    }
  }
  return { lead: lead.join('\n').trim(), sections: sections.map(s => ({ title: s.title, body: s.body.join('\n').trim() })) };
}

function passportHtml(data) {
  const rows = [];
  for (const [key, label] of PASSPORT) {
    let v = data[key];
    if (v == null || v === '') continue;
    if (Array.isArray(v)) v = v.join(', ');
    rows.push(`<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(v))}</dd>`);
  }

  let regionNotes = '';
  if (data.regions_notes && typeof data.regions_notes === 'object') {
    const items = [];
    for (const r of regions) {
      const note = data.regions_notes[r.id];
      if (note) items.push(`<li><b>${escapeHtml(r.name)}.</b> ${escapeHtml(note)}</li>`);
    }
    if (items.length) {
      regionNotes = `<div class="region-notes"><h3>По регионам</h3><ul>${items.join('')}</ul></div>`;
    }
  }

  return `<section class="plant-passport">
  <h2>Паспорт культуры</h2>
  <dl>${rows.join('')}</dl>
  ${regionNotes}
</section>`;
}

// Таблица «Размеры кроны по возрасту» — только у культур с front-matter
// crown_by_age (древесные/крупнокустарниковые, где габитус нарастает годами;
// см. reports/2026-09-05_razmery-krony-po-vozrastu.md — какие культуры это
// применимо, а для каких нет).
//
// Два формата поля:
// - {note, rows} — одна таблица на культуру (большинство).
// - {variants:[{group, cultivars:[{name, note, rows, default?}]}]} — у культур
//   с сильным сортовым разбросом габитуса (можжевельник, туя, ель, сосна,
//   пихта, роза, гортензия): над таблицей выпадающее меню сортов,
//   сгруппированное по типу габитуса; таблица и примечание перестраиваются
//   на выбранный сорт (docs/js — инлайновый, без внешнего файла).
function crownRowsHtml(rows) {
  return rows.map(([age, h, w]) =>
    `<tr><td>${escapeHtml(age)}</td><td>${escapeHtml(h)}</td><td>${escapeHtml(w)}</td></tr>`
  ).join('');
}

function crownPickerHtml(plantId, variants) {
  const flat = [];
  variants.forEach((g, gi) => {
    (g.cultivars || []).forEach((cv, ci) => {
      flat.push({ group: g.group, name: cv.name, note: cv.note || '', rows: cv.rows || [], gi, ci, isDefault: !!cv.default });
    });
  });
  if (!flat.length) return '';
  let defaultIndex = flat.findIndex(f => f.isDefault);
  if (defaultIndex < 0) defaultIndex = 0;

  const uid = `crown-${plantId}`;
  const optgroups = variants.map(g => {
    const opts = (g.cultivars || []).map(cv => {
      const idx = flat.findIndex(f => f.group === g.group && f.name === cv.name);
      return `<option value="${idx}"${idx === defaultIndex ? ' selected' : ''}>${escapeHtml(cv.name)}</option>`;
    }).join('');
    return `<optgroup label="${escapeHtml(g.group)}">${opts}</optgroup>`;
  }).join('');

  // Данные для JS — ячейки таблицы экранированы заранее (идут через
  // innerHTML), примечание — сырой текст (идёт через textContent).
  const jsonData = flat.map(f => ({
    note: f.note,
    rows: f.rows.map(r => r.map(x => escapeHtml(String(x)))),
  }));
  const dataJson = JSON.stringify(jsonData).replace(/</g, '\\u003c');

  return `<section class="plant-crown">
  <h2>Размеры кроны по возрасту</h2>
  <p class="plant-crown-picker-label">Показатели сильно различаются по сортам — выберите свой:</p>
  <div class="plant-crown-picker">
    <select id="${uid}-select" class="plant-crown-select" aria-label="Сорт">${optgroups}</select>
  </div>
  <div class="plant-crown-table-wrap">
    <table class="plant-crown-table">
      <thead><tr><th>Возраст</th><th>Высота</th><th>Ширина</th></tr></thead>
      <tbody id="${uid}-tbody">${crownRowsHtml(flat[defaultIndex].rows)}</tbody>
    </table>
  </div>
  <p class="plant-crown-note" id="${uid}-note">${escapeHtml(flat[defaultIndex].note)}</p>
  <script type="application/json" id="${uid}-data">${dataJson}</script>
  <script>(function(){
    var sel=document.getElementById("${uid}-select");
    var tbody=document.getElementById("${uid}-tbody");
    var note=document.getElementById("${uid}-note");
    var dataEl=document.getElementById("${uid}-data");
    if(!sel||!tbody||!note||!dataEl) return;
    var items=JSON.parse(dataEl.textContent);
    function render(i){
      var it=items[i]; if(!it) return;
      tbody.innerHTML=it.rows.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>';}).join('');
      note.textContent=it.note||'';
    }
    sel.addEventListener('change', function(){ render(parseInt(sel.value,10)); });
  })();</script>
</section>`;
}

function crownTableHtml(data) {
  const c = data.crown_by_age;
  if (!c) return '';
  if (Array.isArray(c.variants) && c.variants.length) return crownPickerHtml(data.plant, c.variants);
  if (!Array.isArray(c.rows) || !c.rows.length) return '';
  return `<section class="plant-crown">
  <h2>Размеры кроны по возрасту</h2>
  <div class="plant-crown-table-wrap">
    <table class="plant-crown-table">
      <thead><tr><th>Возраст</th><th>Высота</th><th>Ширина</th></tr></thead>
      <tbody>${crownRowsHtml(c.rows)}</tbody>
    </table>
  </div>
  ${c.note ? `<p class="plant-crown-note">${escapeHtml(c.note)}</p>` : ''}
</section>`;
}

function calendarBlock(plantId) {
  const blocks = regions.map(r => {
    const wtOrder = (id) => worktypeById(id)?.order ?? 99;
    const entries = calendar
      .filter(e => e.region === r.id && Array.isArray(e.plants) && e.plants.includes(plantId))
      // сначала по месяцу, внутри месяца — по порядку типов работ (worktypes.json:
      // order), как в основном календаре: подготовка/обработка → посев → полив →
      // подкормка → ... — иначе строки идут в порядке исходных данных и «подкормка
      // рассады» может встать раньше «посева».
      .sort((a, b) => (MONTH_IDS.indexOf(a.month) - MONTH_IDS.indexOf(b.month))
        || (wtOrder(a.workType) - wtOrder(b.workType)));

    const inner = entries.length
      ? `<div class="plant-cal-list">${entries.map(e => {
          const wt = worktypeById(e.workType);
          const ic = wt ? `<svg class="wt-ic" aria-hidden="true"><use href="#wt-${e.workType}"></use></svg>` : '';
          return `<div class="plant-cal-item"><span class="m">${escapeHtml(MONTH_NAMES[e.month] || e.month)}</span><span>${ic}${escapeHtml(e.text)}</span></div>`;
        }).join('')}</div>`
      : `<p class="plant-cal-empty">Отдельных записей по этой культуре для региона нет — ориентируйтесь на общий уход по категории и на соседние регионы.</p>`;

    const open = r.id === defaultRegionId ? ' open' : '';
    return `<details class="plant-cal-region"${open}><summary>${escapeHtml(r.name)}</summary>${inner}</details>`;
  }).join('\n');

  return `<section class="plant-calendar">
  <h2>Календарь работ по культуре</h2>
  <p class="cal-intro">Что и когда делать по месяцам — из общего календаря сайта. Разверните свой регион.</p>
  ${blocks}
  <p class="plant-cal-more"><a href="../?plant=${encodeURIComponent(plantId)}">Открыть в интерактивном календаре →</a></p>
</section>`;
}

function relatedHtml(entry, allEntries) {
  const items = [];

  const group = plantById(entry.plant)?.group;
  for (const o of allEntries) {
    if (o.plant === entry.plant) continue;
    if (plantById(o.plant)?.group === group) {
      items.push(`<li><a href="${o.plant}.html">${escapeHtml(o.title)}</a> — родственная культура</li>`);
    }
  }
  if (Array.isArray(entry.related)) {
    for (const [label, url] of entry.related) {
      items.push(`<li><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></li>`);
    }
  }
  if (!items.length) return '';
  return `<section class="plant-related">
  <h2>Смотрите также</h2>
  <ul>${items.join('')}</ul>
</section>`;
}

function heroHtml(entry) {
  const p = plantById(entry.plant);
  const hasImg = fs.existsSync(path.join(IMG, `${entry.plant}.webp`));
  const plate = hasImg
    ? `<figure class="plant-plate">
      <span class="tape tl" aria-hidden="true"></span><span class="tape br" aria-hidden="true"></span>
      <img src="../img/plants/${entry.plant}.webp" alt="${escapeHtml(entry.title)} — ботаническая иллюстрация" width="700" height="933" decoding="async">
      ${entry.latin ? `<figcaption>${escapeHtml(entry.latin)}</figcaption>` : ''}
    </figure>`
    : `<figure class="plant-plate is-placeholder" title="Акварельная иллюстрация будет добавлена">
      <img src="../icons/plants/${p && p.icon ? p.icon : 'sprout'}.svg" alt="" width="120" height="120">
    </figure>`;

  const tags = (entry.tags || []).map(t => `<span class="meta-tag">${escapeHtml(t)}</span>`).join('');

  return `<div class="plant-hero">
  ${plate}
  <div class="plant-hero-text">
    <h1>${escapeHtml(entry.title)}</h1>
    ${entry.latin ? `<p class="plant-latin">${escapeHtml(entry.latin)}</p>` : ''}
    <div class="plant-hero-tags">${tags}</div>
  </div>
</div>`;
}

function plantPage(entry, allEntries) {
  const { lead, sections } = splitSections(entry.body);

  const stagesHtml = sections.map((s, i) => {
    if (/ошибк/i.test(s.title)) {
      return `<section class="plant-mistakes">
  <h2>${escapeHtml(s.title)}</h2>
  ${renderRich(s.body)}
</section>`;
    }
    const icon = stageIcon(s.title);
    const rubricIc = icon ? `<svg class="wt-ic" aria-hidden="true"><use href="#wt-${icon}"></use></svg>` : '';
    return `<article class="card plant-stage" id="stage-${i + 1}">
      <svg class="pc a" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc b" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc c" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc d" aria-hidden="true"><use href="#pc"></use></svg>
      <span class="stage-num" aria-hidden="true">${i + 1}</span>
      <h3 class="rubric">${rubricIc}<span>${escapeHtml(s.title)}</span></h3>
      <svg class="divider" aria-hidden="true"><use href="#hand-divider"></use></svg>
      <div class="stage-body">${renderRich(s.body)}</div>
    </article>`;
  });

  // «Частые ошибки» выносим из ленты этапов вниз, после календаря
  const mistakes = stagesHtml.filter(h => h.startsWith('<section class="plant-mistakes"'));
  const stages = stagesHtml.filter(h => !h.startsWith('<section class="plant-mistakes"'));

  const content = `<main class="content plant-page">
  <nav class="breadcrumbs" aria-label="Хлебные крошки">
    <a href="../index.html">Главная</a> → <a href="index.html">Растения</a> → <span>${escapeHtml(entry.title)}</span>
  </nav>
  ${heroHtml(entry)}
  ${lead ? `<div class="plant-lead">${renderRich(lead)}</div>` : ''}
  ${passportHtml(entry)}
  ${crownTableHtml(entry)}
  <h2 class="plant-stages-title">Жизненный цикл: от посадки до удаления</h2>
  <div class="plant-stages">
    ${stages.join('\n    ')}
  </div>
  ${calendarBlock(entry.plant)}
  ${mistakes.join('\n  ')}
  ${relatedHtml(entry, allEntries)}
  ${entry.sources && entry.sources.length ? `<section class="article-sources">
  <h2>Источники</h2>
  <ul>
    ${entry.sources.map(([label, url]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></li>`).join('\n    ')}
  </ul>
</section>` : ''}
</main>`;

  const canonical = `${SITE_URL}/plants/${entry.plant}.html`;
  return pageShell({
    title: `${entry.title} — выращивание от посадки до удаления | По саду`,
    description: entry.summary || `${entry.title}: полный цикл ухода — посадка, полив, подкормки, обрезка, защита, уборка, зимовка.`,
    bodyClass: 'plant',
    content,
    canonical,
    active: 'plants',
    calendarHref: '../index.html',
    articlesHref: '../articles/index.html',
    plantsHref: 'index.html',
    footerText: 'Справочник культур составлен по открытым агрономическим источникам — ссылки в конце каждой страницы.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${entry.title} — выращивание от посадки до удаления`,
        description: entry.summary || '',
        datePublished: entry.date.toISOString().slice(0, 10),
        inLanguage: 'ru',
        url: canonical,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Растения', item: `${SITE_URL}/plants/index.html` },
          { '@type': 'ListItem', position: 3, name: entry.title, item: canonical },
        ],
      },
    ],
  });
}

const CATEGORY_SECTIONS = [
  ['ogorod', 'Огород'],
  ['sad', 'Сад — ягоды и плодовые'],
  ['dekor', 'Декоративные'],
];

// Подгруппы внутри «Декоративных» — по колонке group листа Plants.
// Первоцветы (крокусы, мускари, подснежник) — многолетние луковичные, идут
// вместе с прочими многолетними цветами.
const DEKOR_SUBGROUPS = [
  ['Хвойные', ['hvoynye']],
  ['Лиственные', ['dekorativno-listvennye']],
  ['Многолетние цветы', ['mnogoletnik', 'pervotsvet']],
  ['Однолетние цветы', ['odnoletnik']],
];

function indexPage(entries) {
  const cardHtml = (e) => {
    const p = plantById(e.plant);
    const hasImg = fs.existsSync(path.join(IMG, `${e.plant}.webp`));
    // на индексе картинка показывается ~96x128 — берём миниатюру 220px
    // (thumb/<id>.webp, генерит make-plant-thumbs.js), а не полный файл 700px
    const thumbSrc = fs.existsSync(path.join(IMG, 'thumb', `${e.plant}.webp`))
      ? `thumb/${e.plant}.webp` : `${e.plant}.webp`;
    const thumb = hasImg
      ? `<img class="thumb" src="../img/plants/${thumbSrc}" alt="" width="96" height="128" loading="lazy" decoding="async">`
      : `<img class="thumb is-placeholder" src="../icons/plants/${p && p.icon ? p.icon : 'sprout'}.svg" alt="" width="96" height="128">`;
    return `<a class="plant-index-card" href="${e.plant}.html">${thumb}<span>${escapeHtml(e.title)}</span></a>`;
  };
  const gridHtml = (list) => `<div class="plant-index-grid">
      ${list.map(cardHtml).join('\n      ')}
    </div>`;

  const sections = CATEGORY_SECTIONS.map(([cat, label]) => {
    const list = entries.filter(e => plantById(e.plant)?.category === cat);
    if (!list.length) return '';

    let body;
    if (cat === 'dekor') {
      const used = new Set();
      const blocks = DEKOR_SUBGROUPS.map(([subLabel, groups]) => {
        const sub = list.filter(e => groups.includes(plantById(e.plant)?.group));
        sub.forEach(e => used.add(e.plant));
        if (!sub.length) return '';
        return `<h3>${escapeHtml(subLabel)}</h3>
    ${gridHtml(sub)}`;
      }).filter(Boolean);
      const rest = list.filter(e => !used.has(e.plant));
      if (rest.length) blocks.push(`<h3>Прочие</h3>
    ${gridHtml(rest)}`);
      body = blocks.join('\n    ');
    } else {
      body = gridHtml(list);
    }

    return `<section class="plant-index-section">
    <h2>${escapeHtml(label)}</h2>
    ${body}
  </section>`;
  }).filter(Boolean).join('\n  ');

  const content = `<main class="content plant-page">
  <h1 class="articles-title">Справочник растений</h1>
  <p class="articles-intro">Полный цикл ухода за культурой — от подготовки семян и посадки до уборки, зимовки и удаления растения. Стикеры культур в календаре ведут сюда.</p>
  <aside class="rp-goose">
    <h3 class="rp-goose-rubric">Из тетради Гуся</h3>
    <figure class="rp-goose-fig">
      <div class="rp-goose-plate">
        <span class="rp-goose-tape tl" aria-hidden="true"></span>
        <span class="rp-goose-tape br" aria-hidden="true"></span>
        <img class="rp-goose-img" src="../img/goose/spravochnik.webp" alt="Гусь-смотритель со своей тетрадью-справочником" width="720" height="720" loading="lazy">
      </div>
      <figcaption class="rp-goose-cap">полный круг ухода — от посадки до уборки</figcaption>
    </figure>
    <blockquote class="rp-goose-quote">«На каждую культуру тут расписан весь круг: с чего начать, как сажать, чем кормить и укрывать, когда убирать и куда девать ботву, — Гусь листает тетрадь лапой. — Не помнишь, что делать с грядкой в августе, — не гадай, загляни сюда».</blockquote>
  </aside>
  ${sections}
</main>`;

  return pageShell({
    title: 'Справочник растений — По саду',
    description: 'Справочник садовых и огородных культур: полный цикл ухода от посадки до удаления растения, по регионам России.',
    bodyClass: 'plants-index',
    content,
    canonical: `${SITE_URL}/plants/index.html`,
    active: 'plants',
    calendarHref: '../index.html',
    articlesHref: '../articles/index.html',
    plantsHref: 'index.html',
    footerText: 'Справочник культур составлен по открытым агрономическим источникам — ссылки в конце каждой страницы.',
  });
}

// --- сборка ---
if (!fs.existsSync(SRC)) {
  console.error(`Нет папки ${SRC} — справочник растений не собран.`);
  process.exit(1);
}
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md') && f !== 'README.md');
const entries = files.map(file => {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
  let data, content;
  try {
    ({ data, content } = matter(raw));
  } catch (e) {
    // Самая частая причина — двоеточие с пробелом внутри незакавыченного
    // значения front-matter (например, в summary). Такие значения берём в
    // кавычки: `summary: "текст: подробности"`.
    throw new Error(`${file}: не разобран front-matter (YAML).\n  ${e.message}`);
  }
  const id = data.plant || file.replace(/\.md$/, '');
  if (!plantById(id)) {
    throw new Error(`${file}: plant "${id}" не найден в plants.json — id страницы должен совпадать с id культуры.`);
  }
  if (!data.title) throw new Error(`${file}: обязательно поле title во front-matter`);
  return {
    ...data,
    plant: id,
    title: data.title,
    latin: data.latin || '',
    summary: data.summary || '',
    tags: data.tags || [],
    date: data.date ? new Date(data.date) : new Date(),
    sources: data.sources || [],
    related: data.related || [],
    regions_notes: data.regions_notes || null,
    body: content,
  };
}).sort((a, b) => a.title.localeCompare(b.title, 'ru'));

for (const entry of entries) {
  fs.writeFileSync(path.join(OUT, `${entry.plant}.html`), plantPage(entry, entries), 'utf8');
}
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(entries), 'utf8');
fs.writeFileSync(path.join(DATA, 'plant-pages.json'), JSON.stringify(entries.map(e => e.plant)) + '\n', 'utf8');

console.log(`Собрано страниц справочника: ${entries.length}`);
for (const e of entries) {
  const img = fs.existsSync(path.join(IMG, `${e.plant}.webp`)) ? 'акварель' : 'ЗАГЛУШКА';
  console.log(` - plants/${e.plant}.html (${e.title}) [${img}]`);
}
console.log(`plant-pages.json: ${entries.map(e => e.plant).join(', ')}`);
