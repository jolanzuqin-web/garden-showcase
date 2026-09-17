// Общая HTML-обвязка (шапка/шрифт-сезон/футер/рамка-«лист») для статических
// страниц сайта - используется build-articles.js (раздел «Статьи») и
// build-region-pages.js (SEO-страницы регионов), чтобы шапка/навигация/рамка
// не разъезжались по копиям.
//
// РЕДИЗАЙН «Дневник садовода» (2026-08-30): логотип, спрайт иконок типов работ
// и блок рамки .page-frame ниже — копии инлайновой разметки docs/index.html.
// При правке лого/иконок/рамки синхронизировать оба места (см. отчёт
// reports/2026-08-30_redizayn-ostatok.md, пункт код-ревью — вынести в общий
// партиал).

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const { styleFile } = require('./version-assets');

const SEASON_SCRIPT = `<script>document.documentElement.setAttribute('data-season', ['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][new Date().getMonth()]);</script>`;

// Тема наследуется с главной: тот же ключ localStorage 'garden.theme', иначе
// prefers-color-scheme. Ставится в <head> до CSS — без вспышки. Тумблер тут
// вешается ванильным скриптом (Alpine на статических страницах нет).
const THEME_INIT = `<script>(function(){try{var t=localStorage.getItem('garden.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;
const THEME_TOGGLE = `<script>(function(){var b=document.querySelector('.btn-theme');if(!b)return;function cur(){return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';}b.setAttribute('aria-pressed',String(cur()==='dark'));b.addEventListener('click',function(){var n=cur()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('garden.theme',n);}catch(e){}b.setAttribute('aria-pressed',String(n==='dark'));});})();</script>`;

// Знак «П в кольце С» + венок (редизайн). viewBox 64×64.
const LOGO_SVG = `<svg class="logo" viewBox="0 0 64 64" role="img" aria-label="По саду — календарь садовода">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
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
      </g>
    </svg>`;

// исторический знак-росток — оставлен для совместимости, не используется
const BRAND_ICON_SVG = LOGO_SVG;

// Спрайт иконок типов работ + фотоуголок + рисованный разделитель (для <use> в карточках).
const CHROME_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="wt-obrabotka" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-0.12 0.53) scale(0.929)"><path d="M11 12 h6 l1 11 a2 2 0 0 1 -2 2 h-4 a2 2 0 0 1 -2 -2 z"/><path d="M11.5 12 V9 h5 v3"/><path d="M16.5 10 L20 8"/><circle cx="22.5" cy="7" r=".9" fill="currentColor" stroke="none"/><circle cx="24.5" cy="9.5" r=".9" fill="currentColor" stroke="none"/><circle cx="21.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/><path d="M7 4 v4 M5 6 h4" stroke-width="1.7"/></g></g></symbol>
<symbol id="wt-udobrenie" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(2.92 -1.44) scale(0.947)"><path d="M12 11 h10 v12 a1.6 1.6 0 0 1 -1.6 1.6 h-6.8 a1.6 1.6 0 0 1 -1.6 -1.6 z"/><path d="M12 11 l1.6 -3 h6.8 l1.6 3"/><path d="M13.6 8 q3.4 1.4 6.8 0"/><path d="M15 15 h4 M14.6 18.5 h4.8" stroke-width="1" opacity=".5"/><path d="M1.5 24.5 q3.6 -3.2 7.2 0 Z"/><path d="M5.1 24.5 V17.6"/><path d="M5.1 20 c-2.4 -0.2 -3.7 -1.8 -3.7 -4.2 c2.4 0.2 3.7 1.8 3.7 4.2 Z"/><path d="M5.1 21.5 c2.1 -0.2 3.3 -1.6 3.3 -3.7 c-2.1 0.2 -3.3 1.6 -3.3 3.7 Z"/></g></g></symbol>
<symbol id="wt-obrezka" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.42 0.42) scale(0.97)"><circle cx="7" cy="8" r="3.1"/><circle cx="7" cy="20" r="3.1"/><path d="M9 10 L24 19"/><path d="M9 18 L24 9"/><circle cx="14" cy="14" r="1" fill="currentColor" stroke="none"/></g></g></symbol>
<symbol id="wt-posev" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-2.82 -1.66) scale(1.16)"><g transform="rotate(45 14 14)"><path d="M12.5 4 h3 v1.2 a1.5 1.5 0 0 1 -3 0 z"/><path d="M14 6.4 V17"/><path d="M11.5 17 h5"/><path d="M11.5 17 h5 l-.5 2.7 q-.35 1.9 -2 2.8 q-1.65 -0.9 -2 -2.8 z"/></g></g></g></symbol>
<symbol id="wt-poliv" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(3.08 0.31) scale(0.84)"><path d="M9 11 L20 11 L18.5 22 Q18.5 24 16.5 24 L12.5 24 Q10.5 24 10.5 22 Z"/><path d="M8 9 L21 9 L20 11 L9 11 Z"/><path d="M9.5 14.5 L4 10.5 L1 8.5 L1 15 L4 13.2 L9.9 17.5 Z"/><path d="M4 10.5 L4 13.2"/><path d="M19.5 10 C26.5 6 27.5 22 19 20.5"/></g></g></symbol>
<symbol id="wt-mulcha" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.35 -0.92) scale(0.975)"><path d="M14 16v-4"/><path d="M14 12c-1-3-4-4-7-3 1 3 4 4 7 3Z"/><path d="M4 18c3-1.5 7-1.5 10 0 3-1.5 7-1.5 10 0"/><path d="M4 22c3-1.5 7-1.5 10 0 3-1.5 7-1.5 10 0"/></g></g></symbol>
<symbol id="wt-ukrytie" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(1.6 1.15) scale(0.886)"><path d="M3 23 L14 6 L25 23 Z"/><path d="M14 23 V15"/><path d="M14 16.8 c-1.9 0 -3 -1.3 -3 -3.2 c1.9 0 3 1.3 3 3.2 Z"/><path d="M14 18.4 c1.8 0 2.8 -1.2 2.8 -3 c-1.8 0 -2.8 1.2 -2.8 3 Z"/></g></g></symbol>
<symbol id="wt-urozhay" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.35 -2.09) scale(0.975)"><path d="M6 14 L8.4 21.6 C8.4 23.2 9 23.6 10.4 23.6 L17.6 23.6 C19 23.6 19.6 23.2 19.6 21.6 L22 14 Z"/><path d="M7.8 14 A2.3 2.3 0 0 1 12.4 14"/><path d="M11.5 14 A2.9 2.9 0 0 1 17.3 14"/><path d="M16.4 14 A2.1 2.1 0 0 1 20.6 14"/><path d="M14.4 11.1 q0 -1.3 1.3 -1.7" stroke-width="1.1"/><path d="M4 14 h20"/></g></g></symbol>
<symbol id="wt-razmnozhenie" viewBox="0 0 28 28"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-1.17 -2.25) scale(1.083)"><path d="M9 24c-2 0-3-1.5-3-3.5S8 16 12 16h4c4 0 6 2.5 6 4.5S20 24 18 24z"/><path d="M14 16V6"/><path d="M14 10c2-3 5-3 7-2-1 3-4 4-7 2Z"/><path d="M14 13c-2-2-5-2-7-1 1 2.5 4 3 7 1Z"/></g></g></symbol>
<symbol id="pc" viewBox="0 0 26 26"><path d="M0 0 L26 0 L0 26 Z" fill="currentColor"/></symbol>
<symbol id="hand-divider" viewBox="0 0 120 8"><path d="M2 5 C20 1 34 8 52 4 C70 0 86 8 104 4 C110 3 116 4 118 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
</defs></svg>`;

const FRAME_HTML = `<div class="page-frame noprint" aria-hidden="true">
  <svg class="grain" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <filter id="pf-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.23  0 0 0 0 0.11  0 0 0 0.04 0"/></filter>
    <rect width="100%" height="100%" filter="url(#pf-grain)"></rect>
  </svg>
  <svg class="corner tl" viewBox="0 0 74 74" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 70 C6 44 16 18 44 8"></path><path d="M44 8 C34 18 27 32 25 48 C36 36 50 33 66 38 C50 42 37 52 30 66 C29 56 24 50 15 48"></path><path d="M25 48 C22 40 16 36 8 36"></path><circle cx="66" cy="38" r="2.4" fill="currentColor" stroke="none"></circle></svg>
  <svg class="corner tr" viewBox="0 0 74 74" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 70 C6 44 16 18 44 8"></path><path d="M44 8 C34 18 27 32 25 48 C36 36 50 33 66 38 C50 42 37 52 30 66 C29 56 24 50 15 48"></path><path d="M25 48 C22 40 16 36 8 36"></path><circle cx="66" cy="38" r="2.4" fill="currentColor" stroke="none"></circle></svg>
  <svg class="corner bl" viewBox="0 0 74 74" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 70 C6 44 16 18 44 8"></path><path d="M44 8 C34 18 27 32 25 48 C36 36 50 33 66 38 C50 42 37 52 30 66 C29 56 24 50 15 48"></path><path d="M25 48 C22 40 16 36 8 36"></path><circle cx="66" cy="38" r="2.4" fill="currentColor" stroke="none"></circle></svg>
  <svg class="corner br" viewBox="0 0 74 74" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 70 C6 44 16 18 44 8"></path><path d="M44 8 C34 18 27 32 25 48 C36 36 50 33 66 38 C50 42 37 52 30 66 C29 56 24 50 15 48"></path><path d="M25 48 C22 40 16 36 8 36"></path><circle cx="66" cy="38" r="2.4" fill="currentColor" stroke="none"></circle></svg>
</div>`;

const SITE_URL = 'https://posadu.ru';

function pageShell({ title, description, bodyClass, content, canonical, jsonLd, image, active = 'articles', footerText, calendarHref = '../index.html', articlesHref = 'index.html', plantsHref = '../plants/index.html', sevooborotHref = '../sevooborot/', headExtra = '', bodyEnd = '' }) {
  const ogImage = image ? `${SITE_URL}/${image}` : `${SITE_URL}/og-image.png`;
  const ogImageSize = image ? { width: 1024, height: 1024 } : { width: 1200, height: 630 };
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
${SEASON_SCRIPT}
${THEME_INIT}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<meta name="description" content="${escapeHtml(description)}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">\n` : ''}<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">\n` : ''}<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="${ogImageSize.width}">
<meta property="og:image:height" content="${ogImageSize.height}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<link rel="stylesheet" href="../css/${styleFile}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}${headExtra ? headExtra + '\n' : ''}</head>
<body class="${bodyClass} app">
${CHROME_SPRITE}
<div class="page-sheet">
${FRAME_HTML}
<header class="topbar noprint">
  <a class="brand" href="/" aria-label="По саду — на главную">
    ${LOGO_SVG}
    <div class="wm">По саду<small>календарь садовода</small></div>
  </a>
  <nav class="site-nav" aria-label="Разделы сайта">
    <a href="${calendarHref}"${active === 'calendar' ? ' aria-current="page"' : ''}>Календарь</a>
    <a href="${sevooborotHref}"${active === 'sevooborot' ? ' aria-current="page"' : ''}>Севооборот</a>
    <a href="${plantsHref}"${active === 'plants' ? ' aria-current="page"' : ''}>Растения</a>
    <a href="${articlesHref}"${active === 'articles' ? ' aria-current="page"' : ''}>Статьи</a>
  </nav>
  <div class="topbar-controls">
    <button class="btn-theme noprint" type="button" aria-label="Переключить тёмную тему"
            title="Светлая / тёмная тема"></button>
  </div>
</header>
${content}
<footer class="footer noprint">
  <span>${escapeHtml(footerText || 'Материалы составлены по открытым источникам — ссылки указаны в конце каждой статьи.')}</span>
</footer>
</div>
${THEME_TOGGLE}
${bodyEnd ? bodyEnd + '\n' : ''}</body>
</html>
`;
}

module.exports = { escapeHtml, SEASON_SCRIPT, BRAND_ICON_SVG, LOGO_SVG, CHROME_SPRITE, FRAME_HTML, SITE_URL, pageShell };
