// Генерирует:
//  1) статический "снимок" рекомендаций текущего месяца для дефолтного региона,
//     который вшивается в docs/index.html между маркерами <!--ssr-snapshot-->
//     и <!--ssr-title--> - чтобы поисковые роботы (не выполняющие JS) видели
//     реальный контент в исходном HTML, а не только после инициализации Alpine;
//  2) четыре статические страницы docs/kalendar/<region>.html - по одной на
//     регион, с тем же снимком и ссылкой на интерактивный календарь
//     (index.html?region=<id>), чтобы у каждого региона был собственный
//     индексируемый URL.
//
// ВАЖНО про актуальность: снимок строится на "текущий месяц" (по дате запуска
// скрипта), поэтому чтобы он не устаревал - build нужно перезапускать не
// только при правке garden-data.xlsx, но и раз в месяц (см. PROJECT.md).
// Разметка снимка руками не редактируется - правки потеряются при пересборке.

const fs = require('fs');
const path = require('path');
const GardenLogic = require('../js/garden-logic.js');
const { escapeHtml, SITE_URL, pageShell } = require('./page-shell');
const { styleFile, appFile, gardenLogicFile, subscribeFile } = require('./version-assets');

const DATA = path.resolve(__dirname, '..', 'data');
const INDEX_HTML = path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'kalendar');

const regions = JSON.parse(fs.readFileSync(path.join(DATA, 'regions.json'), 'utf8'));
const plants = JSON.parse(fs.readFileSync(path.join(DATA, 'plants.json'), 'utf8'));
const worktypes = JSON.parse(fs.readFileSync(path.join(DATA, 'worktypes.json'), 'utf8'));
const calendar = JSON.parse(fs.readFileSync(path.join(DATA, 'calendar.json'), 'utf8'));

const hvoynyeIds = plants.filter(p => p.group === 'hvoynye').map(p => p.id);
const plantById = (id) => plants.find(p => p.id === id);
const worktypeById = (id) => worktypes.find(w => w.id === id);

// id культур с отдельной страницей справочника (генерирует build-plants.js).
// Запускать build-plants.js ДО этого скрипта, иначе список приедет пустым и
// стикеры останутся обычными span'ами. Отсутствие файла — не ошибка (справочник
// ещё не собран).
let plantPages = [];
try {
  plantPages = JSON.parse(fs.readFileSync(path.join(DATA, 'plant-pages.json'), 'utf8'));
} catch (e) { /* справочник ещё не собран — стикеры без ссылок */ }

const now = new Date();
const monthId = GardenLogic.MONTH_IDS[now.getMonth()];
const monthName = GardenLogic.MONTH_NAMES[monthId];
const actualDekada = GardenLogic.dayToDekada(now.getDate());

// Статичная карточка-«запись дневника» — та же вёрстка, что живой Alpine-рендер
// .now-cards .card в docs/index.html, но без x-директив (нет тоггла «Подробнее» —
// текст деталей показан сразу; нет карточки-заглушки «Гусь-смотритель» — она
// чисто декоративная и не нужна роботам). Декада вынесена в заголовок секции
// (.dekada-heading), в карточке её больше нет. pfx — префикс пути к иконкам
// культур ('' для снимка в index.html, '../' для страниц docs/kalendar/).
function cardHtml(wg, pfx) {
  const wt = worktypeById(wg.workType);
  const card = wg.card;

  const cluster = card.plants.slice(0, 3).map((pid, i) =>
    `<img class="pl-ic i${i + 1}" src="${pfx}icons/plants/${plantById(pid)?.icon || 'sprout'}.svg" alt="">`).join('');

  const plantsHtml = card.plants.map(pid => {
    const name = plantById(pid)?.name;
    if (!name) return '';
    return plantPages.includes(pid)
      ? `<a class="plant-tag" href="${pfx}plants/${pid}.html">${escapeHtml(name)}</a>`
      : `<span class="plant-tag">${escapeHtml(name)}</span>`;
  }).join('');

  const meta = escapeHtml(card.categories.join(' · ') + (card.growMethods.length ? ` — ${card.growMethods.join(' · ')}` : ''));

  const detailsHtml = card.details.length ? `<div class="entry-detail-wrap">${card.details.map(d =>
    `<div><p class="entry-detail-label">${escapeHtml(card.details.length > 1 ? `${d.label}:` : 'Препараты и процесс:')}</p><p class="entry-detail">${escapeHtml(d.text)}</p></div>`).join('')}</div>` : '';

  return `<article class="card">
            <svg class="pc a" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc b" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc c" aria-hidden="true"><use href="#pc"></use></svg><svg class="pc d" aria-hidden="true"><use href="#pc"></use></svg>
            <div class="card-plants-ic" aria-hidden="true">${cluster}</div>
            <h3 class="rubric"><svg class="wt-ic" aria-hidden="true"><use href="#wt-${wg.workType}"></use></svg><span>${escapeHtml(wt?.name || wg.workType)}</span></h3>
            <svg class="divider" aria-hidden="true"><use href="#hand-divider"></use></svg>
            <span class="meta">${meta}</span>
            <p class="body">${escapeHtml(card.text)}</p>
            <div class="entry-plants">${plantsHtml}</div>
            ${detailsHtml}
          </article>`;
}

// Секция одной декады: заголовок (номер + даты + бейдж «Сегодня» на текущей) и
// сетка карточек этой декады. group.index === 3 — «Весь месяц» (без дат/бейджа).
function sectionHtml(group, pfx) {
  const isToday = group.index === actualDekada;
  const cards = group.worktypeGroups.map(wg => cardHtml(wg, pfx)).join('\n          ');
  return `<section class="dekada-group">
        <h2 class="dekada-heading${isToday ? ' is-today' : ''}">
          <span>${escapeHtml(group.label)}</span>
          ${group.dateRange ? `<span class="dekada-dates">${escapeHtml(group.dateRange)}</span>` : ''}
          ${isToday ? '<span class="dekada-today-badge">Сегодня</span>' : ''}
        </h2>
        <div class="now-cards">
          ${cards}
        </div>
      </section>`;
}

function renderSnapshot(regionId, pfx = '') {
  const region = regions.find(r => r.id === regionId);
  const entries = calendar.filter(e => e.region === regionId && e.month === monthId);
  const grouped = GardenLogic.buildGroupedEntries(entries, hvoynyeIds, worktypeById, plantById);

  if (!grouped.length) {
    return `<p class="kalendar-region-empty">На ${escapeHtml(monthName.toLowerCase())} в регионе «${escapeHtml(region.name)}» по календарю нет активных рекомендаций — это обычное дело для межсезонья. Загляните в другой месяц через интерактивный календарь.</p>`;
  }

  const sections = grouped.map(group => sectionHtml(group, pfx)).join('\n      ');

  return `<div class="results now">
      ${sections}
  </div>`;
}

// --- 1) снимок дефолтного региона в docs/index.html ---

const { defaultRegionId } = require('./site-config');
const defaultRegion = regions.find(r => r.id === defaultRegionId);

let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');

indexHtml = replaceBetween(
  indexHtml,
  '<!--ssr-title-->', '<!--/ssr-title-->',
  escapeHtml(`Работы на ${monthName} — ${defaultRegion.name}`)
);
indexHtml = replaceBetween(
  indexHtml,
  '<!--ssr-snapshot-->', '<!--/ssr-snapshot-->',
  `<div id="ssr-snapshot">${renderSnapshot(defaultRegionId)}</div>`
);
indexHtml = replaceBetween(
  indexHtml,
  '<!--ssr-region-links-->', '<!--/ssr-region-links-->',
  regions.map(r => `<a href="kalendar/${r.id}.html">${escapeHtml(r.name)}</a>`).join(' · ')
);

// style.css/app.js и т.д. версионируются хэшем содержимого (см.
// version-assets.js) - кэш где-то на пути к посетителю игнорировал новые
// деплои этих файлов; новое имя при любом изменении гарантирует промах кэша.
indexHtml = replaceBetween(
  indexHtml,
  '<!--style-link-->', '<!--/style-link-->',
  `<link rel="stylesheet" href="css/${styleFile}">`
);
indexHtml = replaceBetween(
  indexHtml,
  '<!--app-scripts-->', '<!--/app-scripts-->',
  `\n<script src="js/${subscribeFile}"></script>\n<script src="js/${gardenLogicFile}"></script>\n<script src="js/${appFile}"></script>\n`
);

fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');

// Браузерная копия того же defaultRegionId, что и в site-config.js - app.js
// и subscribe.js читают её вместо собственных захардкоженных копий (require()
// из site-config.js в браузере недоступен, сборщика на сайте нет).
const SITE_CONFIG_JS = path.resolve(__dirname, '..', 'js', 'site-config.js');
fs.writeFileSync(
  SITE_CONFIG_JS,
  `// Автогенерируется build-region-pages.js из docs/build/site-config.js - не редактировать руками.\n`
  + `window.SITE_CONFIG = ${JSON.stringify({ defaultRegionId })};\n`
  + `window.PLANT_PAGES = ${JSON.stringify(plantPages)};\n`,
  'utf8'
);

function replaceBetween(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Маркеры ${startMarker} / ${endMarker} не найдены в index.html — разметка изменилась?`);
  }
  return html.slice(0, start + startMarker.length) + replacement + html.slice(end);
}

// --- 2) отдельные статические страницы по регионам ---

fs.mkdirSync(OUT, { recursive: true });

for (const region of regions) {
  const others = regions.filter(r => r.id !== region.id);
  const content = `<main class="content kalendar-region">
  <h1 class="articles-title">${escapeHtml(monthName)} — работы в саду и огороде: ${escapeHtml(region.name)}</h1>
  <p class="articles-intro">Актуальные садово-огородные рекомендации на ${escapeHtml(monthName.toLowerCase())} для региона «${escapeHtml(region.name)}». Ниже — список по декадам месяца; чтобы отфильтровать по типу работ, найти конкретную культуру или посмотреть другой месяц, откройте интерактивный календарь.</p>
  <a class="btn-secondary" href="../?region=${encodeURIComponent(region.id)}">Открыть интерактивный календарь →</a>

  ${renderSnapshot(region.id, '../')}

  <p class="kalendar-region-others">Другие регионы: ${others.map(r => `<a href="${r.id}.html">${escapeHtml(r.name)}</a>`).join(' · ')}</p>
</main>`;

  // У дефолтного региона (см. defaultRegionId выше) текст-снимок - точный
  // дубль того, что вшито в саму index.html (см. блок 1 выше), поэтому его
  // canonical указывает на главную, а не на себя - иначе два URL с
  // одинаковым содержательным текстом конкурировали бы за одну и ту же
  // выдачу. Остальные регионы уникальны и canonical'ятся сами на себя.
  const canonical = region.id === defaultRegionId ? `${SITE_URL}/` : `${SITE_URL}/kalendar/${region.id}.html`;

  // Хлебная крошка - только для страниц, которые canonical'ятся сами на
  // себя. У defaultRegionId canonical и так указывает на главную (см. выше);
  // добавлять ему ещё и BreadcrumbList на собственный URL было бы тем же
  // противоречием, что и включать его в sitemap.xml.
  const jsonLd = region.id === defaultRegionId ? undefined : {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: region.name, item: canonical },
    ],
  };

  const html = pageShell({
    title: `${monthName} — работы в саду и огороде: ${region.name} | По саду`,
    description: `Садово-огородные рекомендации на ${monthName.toLowerCase()} для региона «${region.name}»: что делать в саду и огороде прямо сейчас.`,
    bodyClass: 'kalendar-region',
    content,
    canonical,
    jsonLd,
    active: 'calendar',
    articlesHref: '../articles/index.html',
    footerText: 'Данные покрывают 4 региона РФ и составлены на основе общих агрономических знаний — рекомендуется сверка с местными садовыми обществами для точных сроков.',
  });

  fs.writeFileSync(path.join(OUT, `${region.id}.html`), html, 'utf8');
}

console.log(`SSR-снимок в index.html обновлён: ${defaultRegion.name}, ${monthName}.`);
console.log(`Сгенерировано страниц регионов: ${regions.length}`);
for (const r of regions) console.log(` - kalendar/${r.id}.html (${r.name})`);
