// Lucky Color Today — get the website's lucky color for a date.
// Usage: node lucky-day.js <path-to-site-index.html> <YYYY-MM-DD>
// Reads the DAYS table, ANCHOR and luckFor() straight from the live site code, so posts always match luckycolortoday.com.
const fs = require('fs');
const [, , file, dateStr] = process.argv;
const html = fs.readFileSync(file, 'utf8');
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error('Could not find ' + what + ' in index.html'); return m[0]; };
const code = [
  grab(/function dayNum\(d\)\{[^\n]*\}/, 'dayNum'),
  grab(/const ANCHOR=[^\n]*;/, 'ANCHOR'),
  grab(/const DAYS=\[[\s\S]*?\n\];/, 'DAYS'),
  grab(/const PLANET_LINE=\{[^\n]*\};/, 'PLANET_LINE'),
  grab(/function luckFor\(d\)\{[^\n]*\}/, 'luckFor'),
].join('\n');
const [y, m, d] = dateStr.split('-').map(Number);
const date = new Date(y, m - 1, d, 12);
const out = new Function('date', code + '\nreturn {L: luckFor(date), PL: PLANET_LINE};')(date);
const L = out.L;
const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
console.log(JSON.stringify({
  date: dateStr, weekday: L.day, planet: L.planet, name: L.name, hex: L.hex, num: L.num, pair: L.pair, vibe: L.vibe,
  siteLead: `${L.day} belongs to ${out.PL[L.planet]}. Wear ${L.name.toLowerCase()}, carry it or keep it close for ${L.vibe}.`,
  dayLabel: `${L.day.toUpperCase()}  •  ${months[m - 1]} ${d}`,
  vibeLine: `${L.planet}'s day for ${L.vibe}.`,
}, null, 2));
