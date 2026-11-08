# Insights (blog) publishing

Articles are written in Notion (database "網誌文章 Blog posts"), then published here as static pages.

## Publishing an article

1. In Notion, set the article (and its other-language version) to 待發布.
2. Ask Claude Code to publish it. Claude:
   - reads the Notion page and saves it as `insights-src/en/<slug>.md` or `insights-src/zh/<slug>.md`
     (front matter below; images downloaded to `insights/img/` as WebP, since Notion image links expire)
   - runs `node tools/insights/og.js` for the social preview images in `og/`
   - runs `python3 tools/insights/build.py`, which writes the pages and updates sitemap.xml, llms.txt and _redirects
   - opens a PR; Cloudflare builds a preview for it. Merging publishes.
   - sets the Notion status to 已發布.

Articles dated in the future are skipped unless `--include-future` is passed (useful for previews).
`python3 tools/insights/build.py --check` reports house-rule problems: headings ending in a full stop,
commas in Chinese headings, long search descriptions, and EN/ZH versions with different slugs.

## Front matter

```yaml
---
title: "Why your fee table shouldn't be an image"
description: "Search snippet: English up to 155 characters, Chinese up to 80"
date: 2026-11-18
tags: [收費與報價, 手機與聯絡]   # Notion tags; shown in English on English pages
topic: 1                          # same number pairs the EN and ZH versions (hreflang)
cover: /og/fee-table-image-en.png  # optional; defaults to the generated OG image
notion: https://app.notion.com/...  # optional
---
```

## URLs

- English: `/insights` and `/insights/<slug>` (files `insights.html`, `insights/<slug>.html`)
- Chinese: `/zh/insights` and `/zh/insights/<slug>`; `/zh` redirects (302) to `/zh/insights` until there is a Chinese homepage
- Both versions of a topic share a slug and link to each other with hreflang (en, zh-Hant, x-default = en)

## Changing the end-of-article buttons

`config.json` holds the CTA text and links for each language. When `/zh/professionals` exists,
point the Chinese `cta_secondary_href` at it and rebuild.

`tools/` and `insights-src/` are listed in `.assetsignore`, so they are not deployed.
Needs `pip install markdown pyyaml` and Node with Playwright.
