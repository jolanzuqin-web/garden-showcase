// Генерирует docs/sitemap.xml - список canonical-адресов сайта для
// поисковиков. Не хранится руками - список статей и регионов неизбежно
// разойдётся с реальностью (та же причина, по которой docs/kalendar/*.html
// тоже генерируются, а не пишутся руками). Запускать вручную после правки
// статей/регионов, как и build-articles.js/build-region-pages.js.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { SITE_URL } = require('./page-shell');
const { defaultRegionId } = require('./site-config');

const DOCS = path.resolve(__dirname, '..');
const ARTICLES_SRC = path.resolve(DOCS, 'articles-src');
const PLANTS_SRC = path.resolve(DOCS, 'plants-src');
const DATA = path.resolve(DOCS, 'data');

const regions = JSON.parse(fs.readFileSync(path.join(DATA, 'regions.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const urls = [{ loc: `${SITE_URL}/`, lastmod: today }];

urls.push({ loc: `${SITE_URL}/sevooborot/`, lastmod: today });
urls.push({ loc: `${SITE_URL}/articles/index.html`, lastmod: today });
// urls.push({ loc: `${SITE_URL}/bot/index.html`, lastmod: today }); // временно отключено
const articleFiles = fs.readdirSync(ARTICLES_SRC).filter((f) => f.endsWith('.md'));
for (const file of articleFiles) {
  const { data } = matter(fs.readFileSync(path.join(ARTICLES_SRC, file), 'utf8'));
  const lastmod = data.date ? new Date(data.date).toISOString().slice(0, 10) : today;
  urls.push({ loc: `${SITE_URL}/articles/${data.slug}.html`, lastmod });
}

if (fs.existsSync(PLANTS_SRC)) {
  urls.push({ loc: `${SITE_URL}/plants/index.html`, lastmod: today });
  const plantFiles = fs.readdirSync(PLANTS_SRC).filter((f) => f.endsWith('.md') && f !== 'README.md');
  for (const file of plantFiles) {
    const { data } = matter(fs.readFileSync(path.join(PLANTS_SRC, file), 'utf8'));
    const id = data.plant || file.replace(/\.md$/, '');
    const lastmod = data.date ? new Date(data.date).toISOString().slice(0, 10) : today;
    urls.push({ loc: `${SITE_URL}/plants/${id}.html`, lastmod });
  }
}

// defaultRegionId не включаем - его canonical указывает на главную (см.
// build-region-pages.js), просить робота индексировать его отдельно было бы
// противоречием собственному canonical-указанию.
for (const region of regions) {
  if (region.id === defaultRegionId) continue;
  urls.push({ loc: `${SITE_URL}/kalendar/${region.id}.html`, lastmod: today });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DOCS, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml: ${urls.length} URL`);
for (const u of urls) console.log(` - ${u.loc} (${u.lastmod})`);
