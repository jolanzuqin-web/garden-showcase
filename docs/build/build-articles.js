// Собирает docs/articles/*.html и docs/articles/index.html из markdown-источников
// в docs/articles-src/*.md (front-matter + текст). По аналогии с build-from-xlsx.js:
// редактировать только .md-источники, сгенерированный HTML в docs/articles/ руками
// не трогать - правки потеряются при следующей сборке.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { escapeHtml, SITE_URL, pageShell } = require('./page-shell');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.resolve(__dirname, '..', 'articles-src');
const OUT = path.resolve(__dirname, '..', 'articles');

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function articlePage(article) {
  const sourcesHtml = article.sources.length
    ? `<section class="article-sources">
  <h2>Источники</h2>
  <ul>
    ${article.sources.map(([label, url]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></li>`).join('\n    ')}
  </ul>
</section>`
    : '';

  const heroHtml = article.image
    ? `<figure class="plant-plate">
      <span class="tape tl" aria-hidden="true"></span><span class="tape br" aria-hidden="true"></span>
      <img src="../${article.image}" alt="${escapeHtml(article.title)} — иллюстрация" width="700" height="700" loading="eager" decoding="async">
    </figure>`
    : '';

  const content = `<main class="content article-page">
  <a class="article-back" href="index.html">← Все статьи</a>
  <article>
    <div class="article-hero">
      ${heroHtml}
      <header class="article-head">
        <h1>${escapeHtml(article.title)}</h1>
        <div class="article-meta">
          <span>${dateFmt.format(article.date)}</span>
          ${article.tags.map(t => `<span class="meta-tag">${escapeHtml(t)}</span>`).join('\n          ')}
        </div>
      </header>
    </div>
    <div class="article-body">
      ${article.html}
    </div>
  </article>
  ${sourcesHtml}
</main>`;

  return pageShell({
    title: `${article.title} — По саду`,
    description: article.summary,
    bodyClass: 'article',
    content,
    image: article.image,
    canonical: `${SITE_URL}/articles/${article.slug}.html`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.summary,
      datePublished: article.date.toISOString().slice(0, 10),
      inLanguage: 'ru',
      url: `${SITE_URL}/articles/${article.slug}.html`,
    },
  });
}

function indexPage(articles) {
  const cards = articles.map(a => `
    <a class="article-card" href="${a.slug}.html">
      <h2>${escapeHtml(a.title)}</h2>
      <p>${escapeHtml(a.summary)}</p>
      <div class="article-meta">
        <span>${dateFmt.format(a.date)}</span>
        ${a.tags.map(t => `<span class="meta-tag">${escapeHtml(t)}</span>`).join('\n        ')}
      </div>
    </a>`).join('\n');

  const content = `<main class="content">
  <h1 class="articles-title">Статьи об агротехнике</h1>
  <p class="articles-intro">Разборы конкретных приёмов — от мульчирования до обрезки, дополняют календарь сезонных работ.</p>
  <div class="article-grid">${cards}
  </div>
</main>`;

  return pageShell({
    title: 'Статьи — По саду',
    description: 'Статьи об агротехнических приёмах: мульчирование, обрезка, компост, черенкование и уход за садом.',
    bodyClass: 'articles-index',
    content,
    canonical: `${SITE_URL}/articles/index.html`,
  });
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md'));
const articles = files.map(file => {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8');
  const { data, content } = matter(raw);
  if (!data.slug || !data.title || !data.date) {
    throw new Error(`${file}: обязательны поля slug, title и date во front-matter`);
  }
  return {
    slug: data.slug,
    title: data.title,
    summary: data.summary || '',
    tags: data.tags || [],
    date: new Date(data.date),
    sources: data.sources || [],
    image: data.image ? `img/${data.image}` : null,
    html: marked.parse(content),
  };
}).sort((a, b) => b.date - a.date);

for (const article of articles) {
  fs.writeFileSync(path.join(OUT, `${article.slug}.html`), articlePage(article));
}
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(articles));

console.log(`Собрано статей: ${articles.length}`);
for (const a of articles) console.log(` - ${a.slug}.html (${a.title})`);
