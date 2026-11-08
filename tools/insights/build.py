#!/usr/bin/env python3
"""Build the Insights (blog) pages from Markdown in insights-src/.

    pip install markdown pyyaml
    python3 tools/insights/build.py            # build pages, sitemap and llms.txt entries
    python3 tools/insights/build.py --check    # only report problems

Each article is insights-src/<lang>/<slug>.md, lang = en or zh, with front matter:

    ---
    title: Why your fee table shouldn't be an image
    description: Many firms post their fees as an image...   (search snippet)
    date: 2026-11-18
    tags: [收費與報價, 手機與聯絡]
    topic: 1                     # same number for the EN and ZH versions of a topic
    cover: /og/fee-table-image-en.png   # optional; defaults to the generated OG image
    notion: https://app.notion.com/...  # optional, for reference
    ---

Writes:
    insights.html, insights/<slug>.html            English  (/insights, /insights/<slug>)
    zh/insights.html, zh/insights/<slug>.html      Chinese  (/zh/insights, /zh/insights/<slug>)
plus the insights block in sitemap.xml and llms.txt, and the /zh redirect once a Chinese
article exists. Nothing is written for a language with no articles.
OG images (/og/<slug>-<lang>.png) come from og.js, run separately.
"""
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "insights-src"
CFG = json.loads((Path(__file__).parent / "config.json").read_text())
SITE = CFG["site"]
LANGS = ("en", "zh")

TAG_EN = {"收費與報價": "Fees & quotes", "手機與聯絡": "Mobile & contact", "多語網站": "Multilingual websites",
          "信任感": "Trust", "健檢清單": "Checklists"}

WA_ICON = ('<svg class="icon-wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>')

ARROW_BACK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'

esc = html.escape


# ---------- reading ----------

def load():
    posts = []
    for lang in LANGS:
        for f in sorted((SRC / lang).glob("*.md")):
            text = f.read_text(encoding="utf-8")
            m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
            if not m:
                sys.exit(f"{f}: missing front matter")
            meta, body = yaml.safe_load(m.group(1)), m.group(2)
            for key in ("title", "description", "date", "topic"):
                if key not in meta:
                    sys.exit(f"{f}: front matter needs '{key}'")
            meta["date"] = meta["date"] if isinstance(meta["date"], dt.date) else dt.date.fromisoformat(str(meta["date"]))
            posts.append({**meta, "lang": lang, "slug": f.stem, "body": body, "file": f})
    by_topic = {}
    for p in posts:
        by_topic.setdefault(p["topic"], {})[p["lang"]] = p
    for p in posts:
        p["other"] = by_topic[p["topic"]].get("zh" if p["lang"] == "en" else "en")
    return posts


def url(lang, slug=None):
    base = CFG[lang]["base"]
    return base + (f"/{slug}" if slug else "")


# ---------- house rules ----------

def check(posts):
    problems = []
    for p in posts:
        heads = [p["title"]] + re.findall(r"^#{1,3}\s+(.+)$", p["body"], re.M)
        for h in heads:
            h = h.strip()
            if h.endswith((".", "。")):
                problems.append(f"{p['file'].name}: heading ends with a full stop: {h}")
            if p["lang"] == "zh" and "，" in h:
                problems.append(f"{p['file'].name}: Chinese heading contains a comma: {h}")
        limit = 155 if p["lang"] == "en" else 80
        if len(p["description"]) > limit:
            problems.append(f"{p['file'].name}: description is {len(p['description'])} characters (limit {limit})")
        if p["other"] and p["other"]["slug"] != p["slug"]:
            problems.append(f"{p['file'].name}: EN and ZH versions of topic {p['topic']} use different slugs")
    return problems


# ---------- rendering ----------

def head(lang, title, description, canonical, og_image, alternates, extra=""):
    c = CFG[lang]
    alt = "".join(f'<link rel="alternate" hreflang="{hl}" href="{SITE}{href}">\n' for hl, href in alternates)
    fonts = "Outfit:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300"
    if lang == "zh":
        fonts += "&family=Noto+Sans+TC:wght@400;500;700"
    return f"""<!DOCTYPE html>
<html lang="{c['html_lang']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{SITE}{canonical}">
{alt}<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{SITE}{canonical}">
<meta property="og:type" content="{'article' if extra else 'website'}">
<meta property="og:image" content="{SITE}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/webp" href="/logo-dark.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/insights.css?v=1">
<link rel="stylesheet" href="/smb.css?v=6">
<script src="/consent.js?v=9" defer></script>
<script src="/wa-float.js?v=1" defer{' data-text="' + esc(c['cta_whatsapp_text']) + '"' if lang == 'zh' else ''}></script>
{extra}</head>
<body>
"""


def nav(lang):
    zh = lang == "zh"
    links = [("/web", "Websites"), ("/professionals", "Professionals"), ("/restaurants", "Restaurants"),
             (url(lang), "網誌" if zh else "Insights"), ("/free", "Free redesign")]
    items = "".join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == url(lang) else ""}>{t}</a></li>' for h, t in links)
    return f"""<nav class="smb-nav">
  <a href="/web" class="nav-logo"><img src="/logo-landscape-transparent.webp" alt="UX CIRCLES" class="logo-mark"></a>
  <button class="smb-toggle" type="button" aria-expanded="false" aria-controls="smb-menu" aria-label="Menu"><svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <ul class="nav-links" id="smb-menu">
    {items}
    <li><a href="/contact" class="nav-cta">{'聯絡我們' if zh else 'Get in touch'}</a></li>
  </ul>
</nav>
"""


FOOTER = f"""<footer>
  <div class="footer-top">
    <a href="/"><img src="/logo-landscape-transparent.webp" alt="UX CIRCLES" class="footer-logo-img"></a>
    <div class="footer-nav">
      <a href="/">Home</a><a href="/work">Work</a><a href="/web">Websites</a><a href="/professionals">Professionals</a>
      <a href="/free">Free redesign</a><a href="/restaurants">Restaurants</a><a href="/insights">Insights</a><a href="/contact">Contact</a>
    </div>
  </div>
  <div class="footer-copy"><span>© {dt.date.today().year} UX CIRCLES Ltd · Company No. 15679514 · Registered in England &amp; Wales · 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ · <a href="/privacy" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Privacy Policy</a></span><span class="footer-contact"><a href="mailto:hello@ux-circles.com">hello@ux-circles.com</a><a href="https://wa.me/{CFG['whatsapp']}" target="_blank" rel="noopener">WhatsApp</a></span></div>
</footer>
<script src="/smb.js?v=4" defer></script>
</body>
</html>
"""


def fmt_date(lang, d):
    return d.strftime(CFG[lang]["date_format"])


def tags_html(p):
    names = p.get("tags") or []
    return "".join(f'<span class="tag">{esc(TAG_EN.get(t, t) if p["lang"] == "en" else t)}</span>' for t in names)


def og_path(p):
    return p.get("cover") or f"/og/{p['slug']}-{p['lang']}.png"


def alternates(p):
    """hreflang pairs only when both language versions exist."""
    if not p["other"]:
        return []
    en = p if p["lang"] == "en" else p["other"]
    zh = p["other"] if p["lang"] == "en" else p
    return [("en", url("en", en["slug"])), ("zh-Hant", url("zh", zh["slug"])), ("x-default", url("en", en["slug"]))]


def wa_link(text):
    from urllib.parse import quote
    return f"https://wa.me/{CFG['whatsapp']}?text={quote(text)}"


def render_post(p):
    c = CFG[p["lang"]]
    # Notion checklists ("- [ ] item") become a styled tick box
    md = re.sub(r"^(\s*)- \[( |x)\] ", lambda m: m.group(1) + "- " + ('<span class="check is-done"></span> ' if m.group(2) == "x" else '<span class="check"></span> '), p["body"], flags=re.M)
    body = markdown.markdown(md, extensions=["extra", "sane_lists"])
    body = body.replace('<li><span class="check', '<li class="checklist-item"><span class="check')
    canonical = url(p["lang"], p["slug"])
    schema = {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": p["title"], "description": p["description"],
        "inLanguage": c["html_lang"], "datePublished": p["date"].isoformat(),
        "dateModified": str(p.get("updated") or p["date"].isoformat()),
        "mainEntityOfPage": SITE + canonical, "image": SITE + og_path(p),
        "author": {"@id": f"{SITE}/#organization"}, "publisher": {"@id": f"{SITE}/#organization"},
        "keywords": [TAG_EN.get(t, t) if p["lang"] == "en" else t for t in (p.get("tags") or [])],
    }
    extra = f'<script type="application/ld+json">\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n</script>\n'
    if c.get("cta_primary_is_whatsapp"):
        actions = (f'<a class="primary" href="{wa_link(c["cta_whatsapp_text"])}" target="_blank" rel="noopener">{WA_ICON} {esc(c["cta_primary_label"])}</a>'
                   f'<a class="secondary" href="{c["cta_secondary_href"]}">{esc(c["cta_secondary_label"])}</a>')
    else:
        actions = (f'<a class="primary" href="{c["cta_primary_href"]}">{esc(c["cta_primary_label"])}</a>'
                   f'<a class="secondary" href="{wa_link(c["cta_whatsapp_text"])}" target="_blank" rel="noopener">{WA_ICON} {esc(c["cta_whatsapp_label"])}</a>')
    other = ""
    if p["other"]:
        other = f'<p class="post-other"><a class="lang-switch" href="{url(p["other"]["lang"], p["other"]["slug"])}" lang="{CFG[p["other"]["lang"]]["html_lang"]}">{esc(c["read_other"])}</a></p>'
    return head(p["lang"], f'{p["title"]} — UX CIRCLES', p["description"], canonical, og_path(p), alternates(p), extra) + nav(p["lang"]) + f"""
<main>
<article class="post">
  <a class="post-back" href="{url(p['lang'])}">{ARROW_BACK} {esc(c['back'])}</a>
  <header class="post-head">
    <div class="ins-meta">{tags_html(p)}</div>
    <h1>{esc(p['title'])}</h1>
    <div class="ins-meta"><time datetime="{p['date'].isoformat()}">{fmt_date(p['lang'], p['date'])}</time><span aria-hidden="true">·</span><span>UX CIRCLES</span></div>
  </header>
  <div class="post-body">
{body}
  </div>
  <aside class="post-cta">
    <h2>{esc(c['cta_title'])}</h2>
    <p>{esc(c['cta_text'])}</p>
    <div class="post-cta-actions">{actions}</div>
  </aside>
  {other}
</article>
</main>
""" + FOOTER


def render_index(lang, posts):
    c = CFG[lang]
    other = "zh" if lang == "en" else "en"
    has_other = any(p["lang"] == other for p in ALL)
    alts = [("en", url("en")), ("zh-Hant", url("zh")), ("x-default", url("en"))] if has_other else []
    cards = ""
    for p in posts:
        cards += f"""
    <li><a class="ins-card" href="{url(lang, p['slug'])}">
      <img src="{og_path(p)}" alt="" width="1200" height="630" loading="lazy">
      <div class="ins-card-body">
        <div class="ins-meta">{tags_html(p)}</div>
        <h2>{esc(p['title'])}</h2>
        <p>{esc(p['description'])}</p>
        <div class="ins-meta"><time datetime="{p['date'].isoformat()}">{fmt_date(lang, p['date'])}</time></div>
      </div>
    </a></li>"""
    switch = f'<a class="lang-switch" href="{url(other)}" lang="{CFG[other]["html_lang"]}">{c["switch_label"]}</a>' if has_other else ""
    return head(lang, c["index_title"], c["index_description"], url(lang), og_path(posts[0]), alts) + nav(lang) + f"""
<main class="wrap">
  <header class="ins-hero">
    <p class="eyebrow">{esc(c['index_eyebrow'])}</p>
    <h1>{esc(c['index_h1'])}</h1>
    <p>{esc(c['index_intro'])}</p>
    {switch}
  </header>
  <ul class="ins-list">{cards}
  </ul>
</main>
""" + FOOTER


# ---------- site files ----------

def replace_block(path, start, end, block, before):
    text = path.read_text(encoding="utf-8")
    new = f"{start}\n{block}{end}"
    if start in text:
        text = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda m: new, text, flags=re.S)
    else:
        text = text.replace(before, new + "\n" + before, 1)
    path.write_text(text, encoding="utf-8")


def update_sitemap(posts):
    rows = []
    for lang in LANGS:
        lp = [p for p in posts if p["lang"] == lang]
        if lp:
            rows.append((url(lang), max(p["date"] for p in lp), "weekly", "0.7"))
        rows += [(url(p["lang"], p["slug"]), p["date"], "monthly", "0.6") for p in lp]
    block = "".join(f"  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{d.isoformat()}</lastmod>\n    <changefreq>{f}</changefreq>\n    <priority>{pr}</priority>\n  </url>\n" for u, d, f, pr in rows)
    replace_block(ROOT / "sitemap.xml", "  <!-- insights:start -->", "  <!-- insights:end -->", block, "</urlset>")


def update_llms(posts):
    lines = "".join(f"- [{p['title']}]({SITE}{url(p['lang'], p['slug'])}): {p['description']}\n"
                    for p in sorted(posts, key=lambda p: (p["date"], p["lang"]), reverse=True))
    block = "## Insights\n\n" + lines
    p = ROOT / "llms.txt"
    t = p.read_text(encoding="utf-8")
    if not t.endswith("\n"):
        t += "\n"
    start, end = "<!-- insights:start -->", "<!-- insights:end -->"
    new = f"{start}\n{block}{end}\n"
    t = re.sub(re.escape(start) + r".*?" + re.escape(end) + r"\n?", lambda m: new, t, flags=re.S) if start in t else t + "\n" + new
    p.write_text(t, encoding="utf-8")


def update_redirects(posts):
    p = ROOT / "_redirects"
    t = p.read_text(encoding="utf-8")
    rule = "# /zh only holds the Chinese blog for now; point it at the blog index until there is a Chinese homepage.\n/zh    /zh/insights  302\n/zh/   /zh/insights  302\n"
    if any(x["lang"] == "zh" for x in posts) and "/zh/insights  302" not in t:
        p.write_text(t.rstrip("\n") + "\n\n" + rule, encoding="utf-8")


ALL = []


def main():
    global ALL
    today = dt.date.today()
    ALL = [p for p in load() if p["date"] <= today or "--include-future" in sys.argv]
    problems = check(ALL)
    for pr in problems:
        print("WARN", pr)
    if "--check" in sys.argv:
        return
    for lang in LANGS:
        lp = sorted([p for p in ALL if p["lang"] == lang], key=lambda p: p["date"], reverse=True)
        if not lp:
            continue
        index = ROOT / ("insights.html" if lang == "en" else "zh/insights.html")
        index.parent.mkdir(parents=True, exist_ok=True)
        index.write_text(render_index(lang, lp), encoding="utf-8")
        for p in lp:
            out = ROOT / url(lang, p["slug"]).lstrip("/")
            out = out.with_suffix(".html")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(render_post(p), encoding="utf-8")
            print("wrote", out.relative_to(ROOT))
    if ALL:
        update_sitemap(ALL)
        update_llms(ALL)
        update_redirects(ALL)


if __name__ == "__main__":
    main()
