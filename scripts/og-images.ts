/**
 * Renders the social preview cards (Open Graph / Twitter images) in public/og/: the "27" avatar
 * beside a headline, in the site's colors and type. For now every page shares the one card with
 * the slogan (see app/lib/meta.ts).
 *
 *   pnpm og                  # all cards
 *   pnpm og slogan           # just these
 *
 * It needs the network for the Google Fonts the site uses.
 */
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));

interface Card {
  /** The file name in public/og/, without ".png". */
  slug: string;
  /** The headline, as HTML: <em> is red, <span class="soft"> is muted. */
  headline: string;
}

const cards: Card[] = [
  // The home page's headline, styled as the hero styles it.
  { slug: "slogan", headline: `<span class="soft">No more waiting.</span><br>The rebuild starts <em>now.</em>` },
];

/** The avatar's "27" and red bar, without its tile, so the card's own background is the tile. */
const logo = (await readFile(`${root}public/icon.svg`, "utf8"))
  .replace(/<metadata>[\s\S]*?<\/metadata>/, "")
  .replace(/<rect width="64" height="64"[^>]*\/>/, "");

const fonts =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=JetBrains+Mono:wght@700&display=swap";

function page(card: Card) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="${fonts}">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    display: grid; grid-template-columns: 400px 1fr; align-items: center;
    padding: 0 80px 0 40px;
    background: #0B1230; color: #FFFFFF;
    font-family: 'Archivo', sans-serif;
  }
  /* A soft light behind the mark, so the navy isn't flat. */
  body::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(circle at 22% 46%, rgb(255 255 255 / 0.07), transparent 45%);
  }
  .mark { position: relative; width: 400px; height: 400px; margin-top: 10px; }
  .mark svg { width: 100%; height: 100%; display: block; }
  .text { position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 470px; padding-left: 36px; border-left: 2px solid #262C4A; }
  .eyebrow, .url { font: 700 22px/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; color: #B7BEDB; }
  .url { text-transform: none; letter-spacing: 0.02em; }
  h1 {
    font-weight: 900; font-stretch: 70%; line-height: 0.92; text-transform: uppercase;
    text-wrap: balance; letter-spacing: 0.005em;
  }
  h1 em { font-style: normal; color: #FF4458; }
  h1 .soft { color: #B7BEDB; }
</style></head>
<body>
  <div class="mark">${logo}</div>
  <div class="text">
    <p class="eyebrow">Project 2027</p>
    <h1>${card.headline}</h1>
    <p class="url">joinproject2027.org</p>
  </div>
</body></html>`;
}

const only = process.argv.slice(2);
const todo = only.length ? cards.filter((card) => only.includes(card.slug)) : cards;
if (!todo.length) throw new Error(`No cards named ${only.join(", ")}. Try: ${cards.map((c) => c.slug).join(", ")}`);

await mkdir(`${root}public/og`, { recursive: true });
const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of todo) {
    await tab.setContent(page(card), { waitUntil: "networkidle" });
    await tab.evaluate(() => document.fonts.ready);
    // The biggest size that keeps the headline within three lines and its column.
    await tab.evaluate(() => {
      const h1 = document.querySelector("h1")!;
      const box = h1.parentElement!;
      const room = box.clientHeight - 2 * 60;
      for (let size = 132; size >= 48; size -= 2) {
        h1.style.fontSize = `${size}px`;
        const lines = Math.round(h1.scrollHeight / (size * 0.92));
        if (lines <= 3 && h1.scrollHeight <= room && h1.scrollWidth <= h1.clientWidth) break;
      }
    });
    await tab.screenshot({ path: `${root}public/og/${card.slug}.png` });
    console.log(`public/og/${card.slug}.png`);
  }
} finally {
  await browser.close();
}
