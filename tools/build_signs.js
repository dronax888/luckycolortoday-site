// Lucky Color Today — build the zodiac pages: /zodiac/ (all 12 signs) and /zodiac/<sign>/ for each sign.
// Usage: python3 tools/sign_images.py && node tools/build_signs.js && node tools/build_journal.js
// Each page targets the searches "<sign> lucky number today" and "<sign> lucky color today".
// Today's and tomorrow's color, numbers and reading are worked out in the visitor's browser with the SAME
// code as the home page (copied out of index.html below), so the sign pages always match the home page.
// The page text that never changes (palette, power day, element, matches, FAQ) is written into the HTML.
// Writes tools/pages.json, which build_journal.js adds to sitemap.xml.
// After publishing new pages, tell Bing and other IndexNow engines: open
//   https://api.indexnow.org/indexnow?url=<page url>&key=02acd3116df379016923a0b21b789fcb   (the key file is /02acd3116df379016923a0b21b789fcb.txt)
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const SITE = 'https://luckycolortoday.com';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const between = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('Could not find ' + a); return html.slice(i, j); };

// ---- the home page's own code ----
const helpers = between('const esc=', '\n\n/* logo */');
const logo = between('/* logo */', '\n\n/* ---------- data ---------- */');
const reading = between('const DAYS=[', '\nconst LIFE=');           // DAYS ... readingFor()
const CLIENT = `${helpers}\n${reading}`;
const { SIGNS, DAYS, PLANET_LINE, esc } = new Function(`${CLIENT}\nreturn {SIGNS, DAYS, PLANET_LINE, esc};`)();
let LOGO = ''; new Function('$', logo.replace('/* logo */', ''))(() => ({ set innerHTML(v) { LOGO = v; } }));
if (SIGNS.length !== 12 || DAYS.length !== 7) throw new Error('Unexpected SIGNS/DAYS in index.html');

const CSS = fs.readFileSync(path.join(ROOT, 'tools', 'journal.css'), 'utf8') + `
.today{display:grid;grid-template-columns:1.05fr 1fr;gap:22px;margin:30px 0 8px}
.swatch{border-radius:var(--r);padding:30px;min-height:260px;display:flex;flex-direction:column;justify-content:space-between;transition:background .4s}
.swatch small{font-size:.9rem;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.swatch b{font-family:var(--display);font-size:clamp(2.1rem,5vw,3.2rem);line-height:1.05;font-weight:600}
.nums{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.nums span{min-width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:1.25rem;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35)}
.nums span.main{background:rgba(0,0,0,.28);font-size:1.5rem;min-width:64px;height:64px}
.card{padding:26px}
.card dl{margin:0}.card dt{color:var(--gold);font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;margin-top:14px}.card dd{margin:4px 0 0}
.stars{color:var(--gold);letter-spacing:3px;font-size:1.15rem}
.tomorrow{display:flex;align-items:center;gap:16px;padding:18px 22px;margin-top:22px}
.tomorrow i{width:44px;height:44px;border-radius:50%;flex:none}
.pal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}
.pal div{border-radius:16px;padding:18px;min-height:110px;display:flex;align-items:flex-end;font-weight:600}
.signs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}
.signs a{display:block;padding:16px;border-radius:16px;background:var(--glass);border:1px solid var(--line);color:var(--text);text-decoration:none}
.signs a:hover{background:var(--glass-2);border-color:var(--gold)}
.signs a b{display:block;font-family:var(--display);font-size:1.25rem}
.signs a small{color:var(--muted)}
.signs a .live{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.95rem}
.signs a .live i{width:16px;height:16px;border-radius:50%;flex:none;background:var(--line)}
.crumbs{font-size:.92rem;color:var(--muted);margin:26px 0 0}.crumbs a{color:var(--muted)}
.faq details{padding:18px 22px;margin-top:12px}.faq summary{cursor:pointer;font-weight:600}
@media (max-width:820px){.today{grid-template-columns:1fr}.signs{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.pal{grid-template-columns:1fr}}
`;
const logoSvg = `<svg viewBox="0 0 100 100" aria-hidden="true">${LOGO}</svg>`;
const POWER = Object.fromEntries(DAYS.map(d => [d.planet, d]));       // planet -> its weekday
const today = new Date().toISOString().slice(0, 10);
const P = n => n + (n.endsWith('s') ? "'" : "'s");   // Aries' / Leo's

const head = ({ title, desc, url, img, ld }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="max-image-preview:large">
<meta property="og:site_name" content="Lucky Color Today">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07060F">
<link rel="alternate" type="application/rss+xml" title="Lucky Color Today Journal" href="${SITE}/feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ccircle cx=%2750%27 cy=%2750%27 r=%2748%27 fill=%27%230D0A1C%27 stroke=%27%23E6BE6A%27 stroke-width=%274%27/%3E%3Ccircle cx=%2750%27 cy=%2750%27 r=%2722%27 fill=%27%23C8233B%27/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,500;1,6..96,600&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}
<style>
${CSS}</style>
<script>function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"eaa6997fa393e2c9d73971f20e089fc8"})});</script>
</head>
<body>
<header class="bar"><div class="wrap">
  <a class="brand" href="/" aria-label="Lucky Color Today home">${logoSvg}<b>Lucky Color Today</b></a>
  <nav class="links" aria-label="Main"><a href="/">Today's color</a><a href="/zodiac/">Zodiac</a><a href="/day/">By day</a><a href="/journal/">Journal</a></nav>
  <a class="btn btn-gold cta" href="https://www.instagram.com/luckycolortoday/" target="_blank" rel="noopener">Follow us</a>
</div></header>
`;
const follow = `<div class="end-cta glass">
  <b>Get your lucky color every day</b>
  <p>A new color, number and horoscope every midnight, free. See <a href="/">today's color for everyone</a> or follow us.</p>
  <div class="ctas"><a class="btn btn-gold" href="https://www.instagram.com/luckycolortoday/" target="_blank" rel="noopener">Instagram</a><a class="btn btn-glass" href="https://www.pinterest.com/luckycolortoday/" target="_blank" rel="noopener">Pinterest</a><a class="btn btn-glass" href="https://www.facebook.com/luckycolortodayofficial" target="_blank" rel="noopener">Facebook</a></div>
</div>`;
const signLinks = (except) => `<div class="signs">${SIGNS.filter(s => s.id !== except).map(s =>
  `<a href="/zodiac/${s.id}/" data-sign="${s.id}"><b>${s.glyph} ${s.name}</b><small>${s.dates}</small><span class="live"><i></i><em>Lucky color and number</em></span></a>`).join('')}</div>`;
const foot = `<footer><div class="wrap">
  <p><a href="/">Today's lucky color</a> · <a href="/zodiac/">All zodiac signs</a> · <a href="/journal/">Journal</a> · <a href="/feed.xml">RSS</a> · <a href="mailto:info@luckycolortoday.com">info@luckycolortoday.com</a></p>
  <p>${SIGNS.map(s => `<a href="/zodiac/${s.id}/">${s.name}</a>`).join(' · ')}</p>
  <p>Lucky color by day: ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => `<a href="/day/${d.toLowerCase()}/">${d}</a>`).join(' · ')}</p>
  <p class="fine">© ${new Date().getFullYear()} Lucky Color Today. For entertainment and reflection only.</p>
</div></footer>
`;
// the browser script: same functions as the home page, then fill the page for the visitor's own date
const script = (signId) => `<script>
(function(){"use strict";
${CLIENT}
const P=n=>n+(n.endsWith('s')?"'":"'s");
const now=new Date(),SIGN=${JSON.stringify(signId)};
const more=(r,seed)=>{const out=[r.num];let k=0;while(out.length<3&&k<40){const n=(hash(seed+':'+k++)%9)+1;if(!out.includes(n))out.push(n);}return out;};
function fill(){
  document.querySelectorAll('.signs a[data-sign]').forEach(a=>{const s=SIGNS.find(x=>x.id===a.dataset.sign),r=readingFor(s,now),l=a.querySelector('.live');
    l.querySelector('i').style.background=r.hex;l.querySelector('em').textContent=r.color+' · number '+r.num;});
  if(!SIGN)return;
  const s=SIGNS.find(x=>x.id===SIGN),r=readingFor(s,now),t=readingFor(s,addDays(now,1)),ink=inkOn(r.hex),sw=document.getElementById('swatch');
  const ns=more(r,ymd(now)+s.id);
  sw.style.background='linear-gradient(135deg,'+r.hex+','+rgba(r.hex,.6)+')';sw.style.color=ink;sw.style.boxShadow='0 24px 70px '+rgba(r.hex,.35);
  document.getElementById('tDate').textContent=fmtFull(now);
  document.getElementById('tColor').textContent=r.color;
  document.getElementById('tNums').innerHTML=ns.map((n,i)=>'<span'+(i?'':' class="main"')+'>'+n+'</span>').join('');
  document.getElementById('tLead').textContent=P(s.name)+" lucky number today is "+r.num+' and the lucky color is '+r.color.toLowerCase()+'.';
  document.getElementById('tStars').textContent='★'.repeat(r.stars)+'☆'.repeat(5-r.stars);
  document.getElementById('tStars').setAttribute('aria-label','Luck '+r.stars+' of 5');
  document.getElementById('tPower').textContent=r.power?'Today is '+P(s.name)+' power day: '+r.day.planet+' rules both the day and your sign.':r.day.day+' belongs to '+r.day.planet+'. Your ruler '+s.ruler+' adds its own colors.';
  document.getElementById('tMood').textContent=r.mood;document.getElementById('tLove').textContent=r.love;document.getElementById('tMoney').textContent=r.money;
  document.getElementById('tTry').textContent=r.tip;document.getElementById('tHours').textContent=r.hours;document.getElementById('tMatch').textContent=r.match.name;
  document.getElementById('tmDot').style.background=t.hex;
  document.getElementById('tmText').textContent='Tomorrow ('+fmtLong(addDays(now,1))+'): '+t.color+', lucky number '+t.num+'.';
}
fill();
const ms=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now;setTimeout(()=>location.reload(),ms+2000);
})();
</script>`;

const crumbsLd = (list) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });
const pages = [];

// ---- one page per sign ----
SIGNS.forEach(s => {
  const url = `${SITE}/zodiac/${s.id}/`, img = `${SITE}/zodiac/${s.id}/og.jpg`;
  const pd = POWER[s.ruler];                               // the weekday ruled by the sign's planet
  const mates = SIGNS.filter(x => x.element === s.element && x.id !== s.id);
  const [c1, c2, c3] = s.palette;
  const title = `${s.name} Lucky Number and Lucky Color Today`;
  const desc = `${s.name} lucky number and lucky color for today, new every midnight. Plus ${P(s.name)} daily horoscope for love and money, lucky hours and 3 signature colors.`;
  const faq = [
    [`What is ${P(s.name)} lucky number today?`, `It changes every day. The number at the top of this page is today's main lucky number for ${s.name}, with two more numbers to watch for. It updates at midnight on your own clock.`],
    [`What is ${P(s.name)} lucky color today?`, `Today's color for ${s.name} is shown in the big color card above. On ${pd.day}s, the day ruled by ${s.ruler}, the color of the day is doubly lucky for ${s.name}.`],
    [`What are ${P(s.name)} lucky colors?`, `${P(s.name)} three signature colors are ${c1[0].toLowerCase()}, ${c2[0].toLowerCase()} and ${c3[0].toLowerCase()}. They come from its ${s.element.toLowerCase()} element and its ruling planet, ${s.ruler}.`],
    [`What is ${P(s.name)} luckiest day of the week?`, `${pd.day}. It is ruled by ${s.ruler}, ${P(s.name)} own planet, and its number is ${pd.num}.`],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description: desc, url, image: img, isPartOf: { '@type': 'WebSite', name: 'Lucky Color Today', url: SITE + '/' }, about: { '@type': 'Thing', name: `${s.name} (zodiac sign)` } },
    crumbsLd([['Lucky Color Today', SITE + '/'], ['Zodiac signs', SITE + '/zodiac/'], [s.name, url]]),
  ];
  const page = head({ title: `${title} | Lucky Color Today`, desc, url, img, ld }) +
`<main class="wrap list">
  <p class="crumbs"><a href="/">Home</a> / <a href="/zodiac/">Zodiac</a> / ${s.name}</p>
  <span class="eyebrow">${s.glyph} ${s.name} · ${s.dates}</span>
  <h1>${s.name} lucky number and lucky color today</h1>
  <p class="lead" id="tLead">${P(s.name)} lucky number and lucky color for today, worked out fresh every midnight from the planet of the day and ${P(s.name)} ruler, ${s.ruler}.</p>

  <section class="today" aria-label="${s.name} today">
    <div class="swatch" id="swatch" style="background:linear-gradient(135deg,${c1[1]},${c1[1]}99)">
      <small id="tDate">Today</small>
      <div><small>Lucky color</small><br><b id="tColor">${c1[0]}</b></div>
      <div><small>Lucky numbers</small><div class="nums" id="tNums"><span class="main">${pd.num}</span></div></div>
    </div>
    <div class="card glass">
      <div class="stars" id="tStars">★★★★☆</div>
      <p id="tPower" style="margin:.4em 0 0">${pd.day} is ${P(s.name)} power day.</p>
      <dl>
        <dt>Mood</dt><dd id="tMood">Open this page on your phone or computer to see today's reading.</dd>
        <dt>Love</dt><dd id="tLove">Updated every midnight.</dd>
        <dt>Money</dt><dd id="tMoney">Updated every midnight.</dd>
        <dt>Try this</dt><dd id="tTry">Wear ${c1[0].toLowerCase()} close to your skin.</dd>
        <dt>Lucky hours</dt><dd id="tHours">Updated every midnight.</dd>
        <dt>Best match today</dt><dd id="tMatch">${mates[0].name}</dd>
      </dl>
    </div>
  </section>
  <div class="tomorrow glass"><i id="tmDot" style="background:${c2[1]}"></i><span id="tmText">Tomorrow's color and number appear here.</span></div>
  <noscript><p>Turn on JavaScript to see today's lucky color and number for ${s.name}.</p></noscript>

  <article class="prose" style="margin-top:44px">
    <h2>${P(s.name)} three lucky colors</h2>
    <p>${s.name} is a ${s.element.toLowerCase()} sign ruled by ${PLANET_LINE[s.ruler]}. Its signature colors stay the same all year. Wear them on days when you want to feel most like yourself.</p>
    <div class="pal">${s.palette.map(([n, h]) => `<div style="background:${h};color:${inkOn(h)}">${n}</div>`).join('')}</div>
    <h2>${P(s.name)} luckiest day: ${pd.day}</h2>
    <p>${pd.day} belongs to ${s.ruler}, the same planet that rules ${s.name}. Its number is ${pd.num} and its energy is ${pd.vibe}. On ${pd.day}s the color of the day is doubly lucky for you, so it is a good day for the things that matter most.</p>
    <h2>How ${P(s.name)} daily number and color are chosen</h2>
    <p>Each day of the week is ruled by one of the seven classical planets, and each planet has its own colors and number. Your daily color blends the day's planet with ${P(s.name)} ruler, ${s.ruler}, and your ${s.element.toLowerCase()} element. Your main lucky number starts from the day's number and changes every day. Read more in <a href="/journal/lucky-color-for-each-day-of-the-week/">why every day has its own lucky color</a> and <a href="/journal/zodiac-lucky-colors/">lucky colors for all 12 signs</a>.</p>
    <h2>${P(s.name)} best matches</h2>
    <p>${s.name} shares the ${s.element.toLowerCase()} element with ${mates.map(m => `<a href="/zodiac/${m.id}/">${m.name}</a>`).join(' and ')}, so these signs understand each other easily. Your best match changes daily and is shown in today's reading above.</p>
    <h2>Easy ways to use today's color</h2>
    <p>You don't need to dress head to toe in it. Socks, a hair tie, a phone wallpaper or something small in your wallet all count. See <a href="/journal/ways-to-use-your-lucky-color/">10 easy ways to use your lucky color</a>, or find your lifelong <a href="/journal/lucky-color-by-date-of-birth/">color by date of birth</a>.</p>
  </article>

  <section class="faq" aria-labelledby="faq-h"><h2 id="faq-h" style="font-family:var(--display);margin-top:40px">${s.name} lucky number and color: questions</h2>
    ${faq.map(([q, a], i) => `<details class="glass"${i ? '' : ' open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n    ')}
  </section>

  <h2 style="font-family:var(--display);margin-top:48px">Lucky number and color today for the other signs</h2>
  ${signLinks(s.id)}
  ${follow}
</main>
${script(s.id)}
` + foot;
  fs.mkdirSync(path.join(ROOT, 'zodiac', s.id), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'zodiac', s.id, 'index.html'), page);
  pages.push([url, today]);
});

// ---- the hub: all 12 signs ----
{
  const url = `${SITE}/zodiac/`, img = `${SITE}/zodiac/og.jpg`;
  const title = 'Lucky Numbers and Colors Today for All 12 Zodiac Signs';
  const desc = "Today's lucky number and lucky color for every zodiac sign, from Aries to Pisces. Updated every midnight, with a free daily horoscope for each sign.";
  const ld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: desc, url, image: img, hasPart: SIGNS.map(s => ({ '@type': 'WebPage', name: `${s.name} Lucky Number and Lucky Color Today`, url: `${SITE}/zodiac/${s.id}/` })) },
    crumbsLd([['Lucky Color Today', SITE + '/'], ['Zodiac signs', url]]),
  ];
  const page = head({ title, desc, url, img, ld }) +
`<main class="wrap list">
  <p class="crumbs"><a href="/">Home</a> / Zodiac</p>
  <span class="eyebrow">Daily, for every sign</span>
  <h1>Lucky numbers and lucky colors today for all 12 zodiac signs</h1>
  <p class="lead">Pick your sign for today's lucky number, lucky color, lucky hours and a short reading for love and money. Everything changes at midnight on your own clock.</p>
  ${signLinks(null)}
  <article class="prose" style="margin-top:44px">
    <h2>How the daily colors and numbers work</h2>
    <p>Each weekday is ruled by one of the seven classical planets: the Sun, the Moon, Mars, Mercury, Jupiter, Venus and Saturn. Every planet has its own colors and number. Each sign's daily color and number blend the planet of the day with the sign's own ruling planet and element. When the day belongs to your sign's planet, it is your power day.</p>
    <div class="tw"><table><thead><tr><th>Sign</th><th>Dates</th><th>Element</th><th>Ruler</th><th>Power day</th></tr></thead><tbody>
    ${SIGNS.map(s => `<tr><td><a href="/zodiac/${s.id}/">${s.name}</a></td><td>${s.dates}</td><td>${s.element}</td><td>${s.ruler}</td><td>${POWER[s.ruler].day}</td></tr>`).join('\n    ')}
    </tbody></table></div>
    <p>Not sure of your sign? Use the <a href="/#birthday">birthday color finder</a> on the home page, or read <a href="/journal/zodiac-lucky-colors/">lucky colors for all 12 zodiac signs</a>.</p>
  </article>
  ${follow}
</main>
${script(null)}
` + foot;
  fs.writeFileSync(path.join(ROOT, 'zodiac', 'index.html'), page);
  pages.unshift([url, today]);
}

// ---- one page per weekday: /day/<weekday>/ and the hub /day/ ----
// Targets "lucky color for monday", "monday lucky color", "what color to wear on monday" and so on.
// The weekday's planet, number and 4 rotating shades come from the home page's DAYS table; this week's
// shade is worked out in the browser with the same luckFor() as the home page, so it always matches.
const { luckFor } = new Function(`${CLIENT}\nreturn {luckFor};`)();
const DAY_COPY = {
  Sunday: { good: 'job interviews, first impressions, sport and anything where you want to be seen', wear: 'a gold watch or jewelry, a yellow scarf, or an amber phone case', avoid: 'a dull, washed-out outfit when you need to stand out' },
  Monday: { good: 'family time, home projects, rest and listening to your gut', wear: 'a white shirt, silver earrings or a soft grey sweater', avoid: 'loud, clashing colors on a day meant for calm' },
  Tuesday: { good: 'workouts, hard conversations, deadlines and starting something brave', wear: 'red lipstick, a red tie, red sneakers or a red phone wallpaper', avoid: 'starting an argument just because you feel fired up' },
  Wednesday: { good: 'meetings, study, writing, sales calls and short trips', wear: 'a green top, a jade bracelet or a green pen for signing', avoid: 'saying yes too fast. Read the details first' },
  Thursday: { good: 'money matters, asking for a raise, teaching, travel plans and big goals', wear: 'a yellow tie or dress, gold accents, or a yellow note in your wallet', avoid: 'overspending because you feel lucky' },
  Friday: { good: 'dates, friendships, beauty treatments, shopping and anything creative', wear: 'pink or light blue clothes, a rose quartz, or a pastel bag', avoid: 'people-pleasing at your own cost' },
  Saturday: { good: 'planning, cleaning up, saving money and work that needs patience', wear: 'a purple or navy outfit, a dark plum nail color or a charcoal coat', avoid: 'rushing. Saturday rewards slow and steady' },
};
const dayId = d => d.day.toLowerCase();
const nextOf = (wd, from) => { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12); d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7)); return d; };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = d => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
const dayLinks = (except) => `<div class="signs">${DAYS.map((d, i) => [d, i]).filter(([d]) => d.day !== except).map(([d, i]) =>
  `<a href="/day/${dayId(d)}/" data-wd="${i}"><b>${d.day}</b><small>${d.planet} · number ${d.num}</small><span class="live"><i style="background:${d.shades[0][1]}"></i><em>${d.shades.map(x => x[0]).slice(0, 2).join(', ')} …</em></span></a>`).join('')}</div>`;
const dayScript = (wd) => `<script>
(function(){"use strict";
${CLIENT}
const M=${JSON.stringify(MONTHS)},f=d=>M[d.getMonth()]+' '+d.getDate();
const now=new Date();
function nextOf(w){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);d.setDate(d.getDate()+((w-d.getDay()+7)%7));return d;}
document.querySelectorAll('.signs a[data-wd]').forEach(a=>{const L=luckFor(nextOf(+a.dataset.wd)),l=a.querySelector('.live');l.querySelector('i').style.background=L.hex;l.querySelector('em').textContent=(now.getDay()==+a.dataset.wd?'Today: ':f(nextOf(+a.dataset.wd))+': ')+L.name;});
${wd === null ? '' : `const W=${wd},first=nextOf(W),L=luckFor(first),sw=document.getElementById('swatch');
sw.style.background='linear-gradient(135deg,'+L.hex+','+L.hex+'99)';
document.getElementById('tWhen').textContent=(now.getDay()===W?'Today, ':'This ')+L.day+', '+f(first);
document.getElementById('tColor').textContent=L.name;
document.getElementById('tLead').textContent=(now.getDay()===W?'Today':'This '+L.day)+' ('+f(first)+') the lucky color is '+L.name.toLowerCase()+' and the lucky number is '+L.num+'.';
const rows=[];for(let k=1;k<=4;k++){const d=new Date(first);d.setDate(d.getDate()+7*k);const x=luckFor(d);rows.push('<li><i style="background:'+x.hex+'"></i>'+f(d)+': <b>'+x.name+'</b></li>');}
document.getElementById('tNext').innerHTML=rows.join('');`}
})();
</script>`;
const DAY_CSS = `<style>.next{list-style:none;padding:0;margin:14px 0}.next li{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}.next i{width:22px;height:22px;border-radius:50%;flex:none}.pal4{grid-template-columns:repeat(4,1fr)}@media (max-width:620px){.pal4{grid-template-columns:repeat(2,1fr)}}</style>`;
const firstDay = nextOf(0, new Date());
DAYS.forEach((d, wd) => {
  const id = dayId(d), url = `${SITE}/day/${id}/`, img = `${SITE}/og.jpg`;
  const c = DAY_COPY[d.day];
  const pl = ['Sun', 'Moon'].includes(d.planet) ? 'the ' + d.planet : d.planet, cap = x => x[0].toUpperCase() + x.slice(1);
  const first = nextOf(wd, new Date()), L0 = luckFor(first);
  const shades = d.shades.map(x => x[0].toLowerCase());
  const title = `${d.day} Lucky Color and Lucky Number`;
  const desc = `What color to wear on ${d.day} for good luck: ${P(pl)} colors, this ${d.day}'s exact shade, lucky number ${d.num} and easy ways to wear it. Updated every week.`;
  const signsOfPlanet = SIGNS.filter(s => s.ruler === d.planet);
  const faq = [
    [`What is the lucky color for ${d.day}?`, `${d.day} is ruled by ${pl}, so its lucky colors are ${shades.slice(0, -1).join(', ')} and ${shades[shades.length - 1]}. One of them is chosen each week; this ${d.day}'s shade is shown at the top of this page.`],
    [`What is the lucky number for ${d.day}?`, `${d.num}, the number of ${pl}. Your zodiac sign adds its own daily numbers, shown on your sign's page.`],
    [`What color should I wear on ${d.day}?`, `Wear this week's ${d.day} shade, or any of ${P(pl)} colors. A small touch is enough: ${c.wear}. It goes well with ${d.pair.toLowerCase()}.`],
    [`What is ${d.day} good for?`, `${d.day} is ${P(pl)} day, linked with ${d.vibe}. It suits ${c.good}.`],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description: desc, url, image: img, isPartOf: { '@type': 'WebSite', name: 'Lucky Color Today', url: SITE + '/' } },
    crumbsLd([['Lucky Color Today', SITE + '/'], ['Lucky color by day', SITE + '/day/'], [d.day, url]]),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const page = head({ title: `${title} | Lucky Color Today`, desc, url, img, ld }).replace('</head>', DAY_CSS + '\n</head>') +
`<main class="wrap list">
  <p class="crumbs"><a href="/">Home</a> / <a href="/day/">Lucky color by day</a> / ${d.day}</p>
  <span class="eyebrow">${d.day} · ruled by ${d.planet} · number ${d.num}</span>
  <h1>${d.day} lucky color and lucky number</h1>
  <p class="lead" id="tLead">This ${d.day} (${fmt(first)}) the lucky color is ${L0.name.toLowerCase()} and the lucky number is ${d.num}.</p>

  <section class="today" aria-label="${d.day} lucky color">
    <div class="swatch" id="swatch" style="background:linear-gradient(135deg,${L0.hex},${L0.hex}99);color:${inkOn(L0.hex)}">
      <small id="tWhen">This ${d.day}, ${fmt(first)}</small>
      <div><small>Lucky color</small><br><b id="tColor">${L0.name}</b></div>
      <div><small>Lucky number</small><div class="nums"><span class="main">${d.num}</span></div></div>
    </div>
    <div class="card glass">
      <dl>
        <dt>Planet</dt><dd>${cap(PLANET_LINE[d.planet])}</dd>
        <dt>Energy</dt><dd>${d.vibe[0].toUpperCase() + d.vibe.slice(1)}</dd>
        <dt>Good for</dt><dd>${c.good[0].toUpperCase() + c.good.slice(1)}</dd>
        <dt>Pairs well with</dt><dd>${d.pair}</dd>
        <dt>Avoid</dt><dd>${c.avoid[0].toUpperCase() + c.avoid.slice(1)}</dd>
      </dl>
    </div>
  </section>
  <div class="glass card" style="margin-top:22px"><b>The next four ${d.day}s</b><ul class="next" id="tNext">${[1, 2, 3, 4].map(k => { const x = new Date(first); x.setDate(x.getDate() + 7 * k); const y = luckFor(x); return `<li><i style="background:${y.hex}"></i>${fmt(x)}: <b>${y.name}</b></li>`; }).join('')}</ul></div>

  <article class="prose" style="margin-top:44px">
    <h2>${P(d.day)} four lucky colors</h2>
    <p>${d.day} belongs to ${PLANET_LINE[d.planet]}. ${cap(P(pl))} colors are ${shades.slice(0, -1).join(', ')} and ${shades[shades.length - 1]}. We rotate through them, one per week, so every ${d.day} has its own shade but always stays in ${P(pl)} family.</p>
    <div class="pal pal4">${d.shades.map(([n, h]) => `<div style="background:${h};color:${inkOn(h)}">${n}</div>`).join('')}</div>
    <h2>What to wear on ${d.day} for good luck</h2>
    <p>You don't need a whole outfit. One clear touch of the color is enough: ${c.wear}. ${d.pair} is ${P(d.day)} partner color, so it is a safe match if you want to wear two colors.</p>
    <h2>What ${d.day} is good for</h2>
    <p>${cap(P(pl))} energy is ${d.vibe}. That makes ${d.day} a good day for ${c.good}. Try to avoid ${c.avoid.replace(/\. .*/, '')}.</p>
    <h2>Lucky number ${d.num}</h2>
    <p>${d.num} is ${P(pl)} number. Use it for small choices on ${d.day}: a seat, a locker, the time you send an important message (for example at ${d.num}:${d.num < 10 ? '0' + d.num : d.num}), or the number of minutes you spend on a short break.</p>
    ${signsOfPlanet.length ? `<h2>Signs that feel lucky on ${d.day}</h2><p>${d.day} is the power day of ${signsOfPlanet.map(s => `<a href="/zodiac/${s.id}/">${s.name}</a>`).join(' and ')}, because ${pl} rules ${signsOfPlanet.length > 1 ? 'both signs' : 'that sign'}. On ${d.day}s the color of the day is doubly lucky for ${signsOfPlanet.length > 1 ? 'them' : s0(signsOfPlanet)}.</p>` : ''}
    <p>Want your personal color for today? See <a href="/">today's lucky color</a>, pick your sign on the <a href="/zodiac/">zodiac page</a>, or read <a href="/journal/lucky-color-for-each-day-of-the-week/">why every day of the week has its own lucky color</a>.</p>
  </article>

  <section class="faq" aria-labelledby="faq-h"><h2 id="faq-h" style="font-family:var(--display);margin-top:40px">${d.day} lucky color: questions</h2>
    ${faq.map(([q, a], i) => `<details class="glass"${i ? '' : ' open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n    ')}
  </section>

  <h2 style="font-family:var(--display);margin-top:48px">Lucky colors for the other days</h2>
  ${dayLinks(d.day)}
  ${follow}
</main>
${dayScript(wd)}
` + foot;
  fs.mkdirSync(path.join(ROOT, 'day', id), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'day', id, 'index.html'), page);
  pages.push([url, today]);
});
function s0(list) { return list[0].name; }
{
  const url = `${SITE}/day/`, img = `${SITE}/og.jpg`;
  const title = 'Lucky Color for Each Day of the Week';
  const desc = 'What color to wear each day of the week for good luck, from Sunday gold to Saturday purple, with each day\'s lucky number and this week\'s exact shades.';
  const order = [1, 2, 3, 4, 5, 6, 0];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: desc, url, image: img, hasPart: DAYS.map(d => ({ '@type': 'WebPage', name: `${d.day} Lucky Color and Lucky Number`, url: `${SITE}/day/${dayId(d)}/` })) },
    crumbsLd([['Lucky Color Today', SITE + '/'], ['Lucky color by day', url]]),
  ];
  const page = head({ title: `${title} | Lucky Color Today`, desc, url, img, ld }) +
`<main class="wrap list">
  <p class="crumbs"><a href="/">Home</a> / Lucky color by day</p>
  <span class="eyebrow">Monday to Sunday</span>
  <h1>Lucky color for each day of the week</h1>
  <p class="lead">Every day of the week is ruled by one of the seven classical planets, and each planet has its own colors and number. Pick a day to see its lucky colors, its number and this week's exact shade.</p>
  ${dayLinks(null)}
  <article class="prose" style="margin-top:44px">
    <h2>The weekly color chart</h2>
    <div class="tw"><table><thead><tr><th>Day</th><th>Planet</th><th>Lucky colors</th><th>Number</th></tr></thead><tbody>
    ${order.map(i => DAYS[i]).map(d => `<tr><td><a href="/day/${dayId(d)}/">${d.day}</a></td><td>${d.planet}</td><td>${d.shades.map(x => x[0]).join(', ')}</td><td>${d.num}</td></tr>`).join('\n    ')}
    </tbody></table></div>
    <p>Each week we use one shade from each day's family, so the colors rotate every four weeks. Your zodiac sign adds its own twist: see your <a href="/zodiac/">sign's lucky color and number today</a>, or read the full story in <a href="/journal/lucky-color-for-each-day-of-the-week/">why every day of the week has its own lucky color</a>.</p>
  </article>
  ${follow}
</main>
${dayScript(null)}
` + foot;
  fs.mkdirSync(path.join(ROOT, 'day'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'day', 'index.html'), page);
  pages.push([url, today]);
}

fs.writeFileSync(path.join(ROOT, 'tools', 'pages.json'), JSON.stringify({ _about: 'Extra pages made by tools/build_signs.js. build_journal.js adds them to sitemap.xml.', pages: pages.map(([url, lastmod]) => ({ url, lastmod })) }, null, 1) + '\n');
console.log(`Built zodiac/index.html, ${SIGNS.length} sign pages, day/index.html and 7 day pages; wrote tools/pages.json`);

function inkOn(hex) { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .42 ? '#1A1426' : '#FFFFFF'; }
