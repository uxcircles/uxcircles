// Social preview images for the Insights articles: /og/<slug>-<lang>.png, 1200×630.
// Same look as the WhatsApp catalog images: navy-to-purple gradient, lavender kicker, white Outfit title, logo top left.
//   node tools/insights/og.js            # every article in insights-src/ without an image yet
//   node tools/insights/og.js --force    # redo them all
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const root = path.resolve(__dirname, '../..');
const src = path.join(root, 'insights-src');
const out = path.join(root, 'og');
const force = process.argv.includes('--force');
const TAG_EN = { '收費與報價': 'Fees & quotes', '手機與聯絡': 'Mobile & contact', '多語網站': 'Multilingual websites', '信任感': 'Trust', '健檢清單': 'Checklists' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function frontMatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const get = k => { const r = m[1].match(new RegExp('^' + k + ':\\s*(.*)$', 'm')); return r ? r[1].trim().replace(/^["']|["']$/g, '') : ''; };
  const tags = (get('tags').match(/^\[(.*)\]$/) || [, ''])[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  return { title: get('title'), tags };
}

function page(lang, title, tag) {
  const zh = lang === 'zh';
  const logo = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'logo-landscape-transparent.webp')).toString('base64');
  return `<!doctype html><html lang="${zh ? 'zh-Hant' : 'en'}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600&family=Noto+Sans+TC:wght@500;700&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;color:#fff;font-family:'Outfit','Noto Sans TC',sans-serif;position:relative;overflow:hidden;
 background:radial-gradient(800px 560px at 88% 10%,#3b2f8f 0%,rgba(59,47,143,0) 60%),linear-gradient(160deg,#1a1640 0%,#0f1021 70%)}
img{position:absolute;left:72px;top:60px;height:32px;filter:brightness(1.6)}
.k{position:absolute;left:72px;top:140px;font:600 20px/1 'Outfit','Noto Sans TC';letter-spacing:${zh ? '.12em' : '.2em'};text-transform:uppercase;color:#a99cff}
h1{position:absolute;left:72px;right:100px;top:182px;font-weight:700;font-size:${zh ? 62 : 66}px;line-height:${zh ? 1.28 : 1.04};letter-spacing:${zh ? '.01em' : '-.02em'};text-wrap:balance}
.u{position:absolute;left:72px;bottom:60px;border:2px solid rgba(255,255,255,.3);border-radius:12px;padding:12px 18px;font:500 20px/1 'Outfit';color:#e6e2ff}
</style></head><body>
<img src="${logo}" alt=""><div class="k">${esc(tag)}</div><h1>${esc(title)}</h1>
<div class="u">ux-circles.com${zh ? '/zh' : ''}/insights</div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const jobs = [];
  for (const lang of ['en', 'zh']) {
    const dir = path.join(src, lang);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const slug = f.slice(0, -3), dest = path.join(out, `${slug}-${lang}.png`);
      if (fs.existsSync(dest) && !force) continue;
      const fm = frontMatter(path.join(dir, f));
      const tag = fm.tags[0] ? (lang === 'en' ? (TAG_EN[fm.tags[0]] || fm.tags[0]) : fm.tags[0]) : (lang === 'en' ? 'Insights' : '網誌');
      jobs.push({ lang, title: fm.title, tag, dest });
    }
  }
  if (!jobs.length) return console.log('No new OG images to make.');
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const j of jobs) {
    await p.setContent(page(j.lang, j.title, j.tag), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: j.dest });
    console.log('wrote', path.relative(root, j.dest));
  }
  await browser.close();
})();
