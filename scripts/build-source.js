// =====================================================================
// scripts/build-source.js · 重建"干净源" index.html
// ---------------------------------------------------------------------
// 用途：从 4 个目录的原 HTML 抽出每课正文，合成一个 V2 形态的
//       index.html（每课用 <article class="site-lesson" id="Gxx"> 包）。
//       这个 index.html 同时也是 V3 (build.js) 的"数据源"。
//
// 使用：node scripts/build-source.js
// =====================================================================

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LEVELS = [
  { dir: "零基础语法", label: "零基础语法", idx: "壹" },
  { dir: "基础语法", label: "基础语法", idx: "贰" },
  { dir: "中级语法", label: "中级语法", idx: "叁" },
  { dir: "高级语法", label: "高级语法", idx: "肆" },
];

const CSS_LINK = '<link rel="stylesheet" href="assets/site.css">';
const OUT_FILE = path.join(ROOT, "index.html");

function parseFilename(filename) {
  const m = filename.match(/【([^】]+)】(.+?)\.html$/);
  if (m) return { code: m[1], title: m[2].trim() };
  return { code: "X00", title: filename.replace(/\.html$/, "") };
}

function sortByCode(a, b) {
  const na = parseInt(String(a.code).replace(/\D/g, ""), 10);
  const nb = parseInt(String(b.code).replace(/\D/g, ""), 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return String(a.code).localeCompare(String(b.code));
}

/** 手动配对 <div class="container"> 的 innerHTML */
function findContainerInner(html) {
  const m = html.match(/<div[^>]*class="[^"]*\bcontainer\b[^"]*"/i);
  if (!m) return null;
  let i = m.index + m[0].length;
  i = html.indexOf(">", i) + 1;
  let depth = 1, start = i;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", i);
    const nextClose = html.indexOf("</div>", i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = html[nextOpen + 4];
      if (after === " " || after === ">") { depth++; i = nextOpen + 4; }
      else { i = nextOpen + 4; }
    } else { depth--; i = nextClose + 6; }
  }
  return depth === 0 ? html.slice(start, i - 6).trim() : null;
}

function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return "";
  let inner = bodyMatch[1];
  const container = findContainerInner(inner);
  if (container) inner = container;
  // 去掉第一个 H1（无论是否带 site-shell-hidden-h1）
  inner = inner.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "");
  // 去掉 script
  inner = inner.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  // 去掉所有 href（站内跳转统一禁用）
  inner = inner.replace(/\s(href)="[^"]*"/gi, "");
  return inner.trim();
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 扫描
const courses = [];
for (const level of LEVELS) {
  const dir = path.join(ROOT, level.dir);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      return { level: level.dir, levelLabel: level.label, levelIdx: level.idx, file: f, ...parseFilename(f), body: extractBody(raw) };
    })
    .filter((c) => c.body.length > 0)
    .sort(sortByCode);
  courses.push(...files);
}

const sections = LEVELS.map((lv) => {
  const inLevel = courses.filter((c) => c.level === lv.dir);
  if (!inLevel.length) {
    return `<section class="site-shelf" id="${esc(lv.dir)}">
      <header class="site-shelf-head"><span class="idx">${esc(lv.idx)}</span><h2>${esc(lv.label)}</h2><span class="cnt">0 课</span></header>
      <p class="site-empty">尚未收录 —— 内容增量更新后将在此出现。</p>
    </section>`;
  }
  const lessonsHtml = inLevel.map((c) => `
        <article class="site-lesson" id="${esc(c.code)}" data-level="${esc(lv.dir)}">
          <h2 class="site-lesson-title">
            <span class="site-chip">${esc(c.code)}</span>
            <span>${esc(c.title)}</span>
          </h2>
          <div class="site-lesson-body">${c.body}</div>
        </article>`).join("\n");
  return `<section class="site-shelf" id="${esc(lv.dir)}">
      <header class="site-shelf-head"><span class="idx">${esc(lv.idx)}</span><h2>${esc(lv.label)}</h2><span class="cnt">${inLevel.length} 课</span></header>
      <div class="site-lessons">${lessonsHtml}</div>
    </section>`;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>英语语法笔记 · 干净源（build-source 产物）</title>
${CSS_LINK}
</head>
<body>
<a id="top"></a>
${sections}
</body>
</html>
`;

fs.writeFileSync(OUT_FILE, html, "utf8");
console.log(`✓ 重建干净源 index.html（${courses.length} 课）`);
