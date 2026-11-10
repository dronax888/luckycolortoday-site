// Lucky Color Today — build the Journal article pages, the Journal index, the RSS feed and the sitemap.
// Usage: node tools/build_journal.js
// The article text comes from the GUIDES list in index.html (the same text the home page shows),
// and the list of published articles, dates and Pinterest texts comes from tools/journal.json.
// Run python3 tools/journal_pins.py first so every article has its Pinterest image (journal/<page>/pin.jpg).
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const SITE = 'https://luckycolortoday.com';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'journal.json'), 'utf8')).articles;

// ---- pull the site's own code out of index.html ----
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('Could not find ' + a); return html.slice(i, j); };
const helpers = between('const esc=', '\n\n/* logo */');
const logo = between('/* logo */', '\n\n/* ---------- data ---------- */');
const data = between('/* ---------- data ---------- */', '/* ---------- today ---------- */');
const guides = between('const GUIDES=[', '\nfunction report(');
const artSVG = between('function artSVG(', '\n(function(){');
const code = `${helpers}\n${data}\n${guides}\n${artSVG}\n
let LOGO='';const $=s=>({set innerHTML(v){LOGO=v;}});${logo.replace('/* logo */', '')}
return {GUIDES, artSVG, LOGO, esc};`;
const { GUIDES, artSVG: art, LOGO, esc } = new Function('document', 'matchMedia', code)({}, () => ({ matches: false }));

const byId = Object.fromEntries(GUIDES.map(g => [g.id || g.slug, g]));
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const fmt = iso => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Riyadh' });

const items = META.map(m => {
  const g = byId[m.id];
  if (!g) throw new Error('No article with id ' + m.id + ' in GUIDES');
  const pin = path.join(ROOT, 'journal', m.page, 'pin.jpg');
  if (!fs.existsSync(pin)) throw new Error('Missing ' + pin + ' (run python3 tools/journal_pins.py first)');
  // links inside the article point at sections of the home page
  const body = g.body().replace(/href="#([a-z-]+)"/g, 'href="/#$1"');
  return { ...m, g, body, url: `${SITE}/journal/${m.page}/`, img: `${SITE}/journal/${m.page}/pin.jpg`, imgBytes: fs.statSync(pin).size };
}).sort((a, b) => new Date(b.date) - new Date(a.date));

// ---- shared page parts ----
const SIGN_LINKS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(n => `<a href="/zodiac/${n.toLowerCase()}/">${n}</a>`).join(' · ');
const crumbs = list => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
const CSS = fs.readFileSync(path.join(ROOT, 'tools', 'journal.css'), 'utf8');
const logoSvg = `<svg viewBox="0 0 100 100" aria-hidden="true">${LOGO}</svg>`;
const head = ({ title, desc, url, img, type, extra = '' }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="Lucky Color Today">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="max-image-preview:large">
<meta name="theme-color" content="#07060F">
<link rel="alternate" type="application/rss+xml" title="Lucky Color Today Journal" href="${SITE}/feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ccircle cx=%2750%27 cy=%2750%27 r=%2748%27 fill=%27%230D0A1C%27 stroke=%27%23E6BE6A%27 stroke-width=%274%27/%3E%3Ccircle cx=%2750%27 cy=%2750%27 r=%2722%27 fill=%27%23C8233B%27/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500;1,6..96,600&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
${extra}<style>
${CSS}</style>
</head>
<body>
<header class="bar"><div class="wrap">
  <a class="brand" href="/" aria-label="Lucky Color Today home">${logoSvg}<b>Lucky Color Today</b></a>
  <nav class="links" aria-label="Main"><a href="/">Today's color</a><a href="/zodiac/">Zodiac</a><a href="/journal/">Journal</a></nav>
  <a class="btn btn-gold cta" href="https://www.instagram.com/luckycolortoday/" target="_blank" rel="noopener">Follow us</a>
</div></header>
`;
const follow = `<div class="end-cta glass">
  <b>Get your lucky color every day</b>
  <p>A new color, number and horoscope every morning, free. See <a href="/">today's color</a> or follow us.</p>
  <div class="ctas"><a class="btn btn-gold" href="https://www.instagram.com/luckycolortoday/" target="_blank" rel="noopener">Instagram</a><a class="btn btn-glass" href="https://www.pinterest.com/luckycolortoday/" target="_blank" rel="noopener">Pinterest</a><a class="btn btn-glass" href="https://www.facebook.com/luckycolortodayofficial" target="_blank" rel="noopener">Facebook</a></div>
</div>`;
const card = (it, i) => `<a class="post" href="/journal/${it.page}/"><div class="art">${art(it.g.hex, it.g.hex2, 'c' + i)}</div><div class="txt"><small>${esc(it.g.tag)}</small><h3>${esc(it.g.title)}</h3><p>${esc(it.g.dek)}</p></div></a>`;
const foot = `<footer><div class="wrap">
  <p><a href="/">Today's lucky color</a> · <a href="/zodiac/">All zodiac signs</a> · <a href="/journal/">Journal</a> · <a href="/feed.xml">RSS</a> · <a href="mailto:info@luckycolortoday.com">info@luckycolortoday.com</a></p>
  <p>Lucky number and color today: ${SIGN_LINKS}</p>
  <p class="fine">© ${new Date().getFullYear()} Lucky Color Today. For entertainment and reflection only.</p>
</div></footer>
</body>
</html>
`;

// ---- article pages ----
items.forEach((it, i) => {
  const desc = it.desc || it.g.dek;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: it.g.title, description: desc, image: it.img, datePublished: it.date, dateModified: it.date, mainEntityOfPage: it.url, author: { '@type': 'Organization', name: 'Lucky Color Today', url: SITE + '/' }, publisher: { '@type': 'Organization', name: 'Lucky Color Today', url: SITE + '/' } };
  const more = items.filter(x => x !== it).slice(0, 3).map(card).join('');
  const page = head({ title: `${it.g.title} | Lucky Color Today`, desc, url: it.url, img: it.img, type: 'article',
    extra: `<meta property="article:published_time" content="${it.date}">\n<script type="application/ld+json">${JSON.stringify(ld)}</script>\n<script type="application/ld+json">${JSON.stringify(crumbs([['Lucky Color Today', SITE + '/'], ['Journal', SITE + '/journal/'], [it.g.title, it.url]]))}</script>\n` }) +
`<main>
<div class="hero-art">${art(it.g.hex, it.g.hex2, 'h' + i)}</div>
<article class="reader-body">
  <span class="eyebrow">${esc(it.g.tag)}</span>
  <h1>${esc(it.g.title)}</h1>
  <p class="by">${fmt(it.date)} · Lucky Color Today</p>
  <div class="prose">${it.body}</div>
  <img class="pin" src="pin.jpg" width="1000" height="1500" alt="${esc(it.pinTitle)}: Lucky Color Today guide" loading="lazy">
  ${follow}
</article>
<section class="more"><div class="wrap"><h2>More from the Journal</h2><div class="grid">${more}</div></div></section>
</main>
` + foot;
  fs.mkdirSync(path.join(ROOT, 'journal', it.page), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'journal', it.page, 'index.html'), page);
});

// ---- journal index ----
const indexPage = head({ title: 'The Journal: lucky color guides | Lucky Color Today', desc: 'Free guides to lucky colors, zodiac sign colors, lucky numbers, numerology and palm reading. Learn what your lucky color means and how to use it every day.', url: `${SITE}/journal/`, img: items[0].img, type: 'website',
  extra: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'The Journal', url: `${SITE}/journal/`, hasPart: items.map(it => ({ '@type': 'Article', headline: it.g.title, url: it.url })) })}</script>\n<script type="application/ld+json">${JSON.stringify(crumbs([['Lucky Color Today', SITE + '/'], ['Journal', SITE + '/journal/']]))}</script>\n` }) +
`<main class="wrap list">
  <span class="eyebrow">The Journal</span>
  <h1>Guides to lucky colors, signs and numbers</h1>
  <p class="lead">Everything behind your daily lucky color: the planets, the zodiac, numerology and palm reading. For today's color and number, visit the <a href="/">home page</a>.</p>
  <div class="grid">${items.map(card).join('')}</div>
  ${follow}
</main>
` + foot;
fs.mkdirSync(path.join(ROOT, 'journal'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'journal', 'index.html'), indexPage);

// ---- RSS feed (Pinterest auto-publish reads title, description, link and the image) ----
const now = new Date().toUTCString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>Lucky Color Today Journal</title>
<link>${SITE}/journal/</link>
<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Guides to lucky colors, zodiac colors, numerology and palm reading.</description>
<language>en</language>
<lastBuildDate>${now}</lastBuildDate>
${items.map(it => `<item>
<title>${xml(it.pinTitle)}</title>
<link>${it.url}</link>
<guid isPermaLink="true">${it.url}</guid>
<pubDate>${new Date(it.date).toUTCString()}</pubDate>
<description>${xml(it.pinText)}</description>
<enclosure url="${it.img}" length="${it.imgBytes}" type="image/jpeg"/>
<media:content url="${it.img}" medium="image" type="image/jpeg" width="1000" height="1500"/>
</item>`).join('\n')}
</channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed);

// ---- point the home page's guide cards at the new pages ----
const jmap = 'const JPAGE=' + JSON.stringify(Object.fromEntries(META.map(m => [m.id, m.page]))) + ';/*journal-pages*/';
const home = html.replace(/const JPAGE=\{[^\n]*\};\/\*journal-pages\*\//, jmap);
if (home === html && !html.includes(jmap)) throw new Error('JPAGE marker missing in index.html');
fs.writeFileSync(path.join(ROOT, 'index.html'), home);

// ---- sitemap + robots ----
// extra pages from tools/build_signs.js (the zodiac pages), if it has been run
const extraFile = path.join(ROOT, 'tools', 'pages.json');
const extra = fs.existsSync(extraFile) ? JSON.parse(fs.readFileSync(extraFile, 'utf8')).pages.map(p => [p.url, p.lastmod]) : [];
const urls = [[`${SITE}/`, new Date().toISOString().slice(0, 10)], ...extra, [`${SITE}/journal/`, items[0].date.slice(0, 10)], ...items.map(it => [it.url, it.date.slice(0, 10)])];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `<url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${items.length} articles, journal/index.html, feed.xml, sitemap.xml`);
