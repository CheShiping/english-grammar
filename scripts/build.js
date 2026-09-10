// =====================================================================
// scripts/build.js · 站点生成主入口（V3 · 每课独立页）
// ---------------------------------------------------------------------
// 流程：
//   1. 读 scripts/build-source.js → 它已经写好"干净源" index.html
//   2. 从干净源拆出每个 <article class="site-lesson" id="Gxx">，
//      写到 dist/<level>/<file>.html，套上站点壳页（顶栏+侧栏+正文+上下页）
//   3. 重新生成首页 index.html：只列课程卡片
//
// 使用：node scripts/build.js
//
// 增量更新流程：
//   1. 改/加/删 原 HTML（在 零基础语法/、基础语法/ 等）
//   2. node scripts/build.js  （先 build-source 重建源，再 build 拆页）
//   3. git add . && git commit && git push
// =====================================================================

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// 1. 先跑 build-source.js 重建干净源
execSync(`node "${path.join(__dirname, "build-source.js")}"`, { stdio: "inherit" });

// 2. 解析干净源里的 <article> 段
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const LEVELS = [
  { dir: "零基础语法", label: "零基础语法", idx: "壹" },
  { dir: "基础语法", label: "基础语法", idx: "贰" },
  { dir: "中级语法", label: "中级语法", idx: "叁" },
  { dir: "高级语法", label: "高级语法", idx: "肆" },
];

// 课程页 dist/<level>/file.html 引用资源时，CSS/首页 都用 ../
function assetBase(level) {
  // 文件位于 dist/<level>/file.html → 回到根目录需要 ../../
  return "../../";
}
function homeBase(level) {
  return "../../index.html";
}

const CSS_LINK = '<link rel="stylesheet" href="../../assets/site.css">';
function jsLink(src) { return `<script src="${src}" defer><\/script>`; }

// 防首屏闪烁：在 CSS 加载前就同步主题
const FLASH_SCRIPT = `<script>(function(){try{var s=localStorage.getItem("eg-theme"),m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches,t=s==="dark"||s==="light"?s:(m?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();<\/script>`;

// SVG 图标
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1z"/></svg>';
const ICON_BURGER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_ARROW_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

// 移动端浮动按钮：回到顶部
const TO_TOP_BTN = `<button class="site-to-top" type="button" aria-label="回到顶部" title="回到顶部">${ICON_ARROW_UP}</button>`;

// 从干净源里拆出所有 <article class="site-lesson" id="...">...</article>
function extractArticles(html) {
  const out = [];
  const re = /<article\b[^>]*class="site-lesson"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // 提取 h2 里的 Gxx chip 和标题
    const code = m[1];
    const body = m[2];
    // title: 抓 <span>标签</span> 后面那个 <span>
    const titleMatch = body.match(/<span class="site-chip">[^<]*<\/span>\s*<span>([\s\S]*?)<\/span>/);
    const title = titleMatch ? titleMatch[1].trim() : code;
    // body-inner: 抓 <div class="site-lesson-body">...</div>
    const innerMatch = body.match(/<div class="site-lesson-body">([\s\S]*?)<\/div>\s*$/);
    const inner = innerMatch ? innerMatch[1] : body;
    out.push({ code, title, inner });
  }
  return out;
}

const articles = extractArticles(src);
console.log(`✓ 从干净源提取 ${articles.length} 课`);

// 3. 决定每课放在哪个 level：从代码前缀 + 顺序判断
//    G001-G005 → 零基础；G01-G09 → 基础；G10+ → 中级（暂）
//    实际更稳：从干净源里的 .site-shelf id 拿到分组
function detectLevel(code, idx) {
  if (/^G0{2}\d/.test(code)) return "零基础语法";       // G001~G009
  if (/^G0[1-9]\b/.test(code) || /^G0[1-9]$/.test(code)) return "基础语法"; // G01~G09
  return "中级语法";
}

// 4. 工具：HTML 编码
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 5. 渲染：每课页
// base 含义：
//   课程页（文件位于 dist/<level>/file.html）：
//     回到 dist/  →  "../"
//     回到根目录  →  "../../"（CSS 文件 ../..//assets/site.css）
//   首页（文件位于根目录 index.html）：
//     课程链接前缀  →  "dist/"
//     CSS link      →  "assets/site.css"
//     顶栏链接      →  "index.html"
//
// 为简化，renderTopbar/renderSidebar 都接收 baseHome（首页 href）
// 和 baseRel（CSS 等资源的相对前缀）。课程页用 baseHome="../../index.html",
// baseRel="../../"。首页用 baseHome="index.html", baseRel=""。

function renderTopbar(levelLabel, baseHome) {
  return `<header class="site-topbar">
  <div class="site-topbar-inner">
    <button class="site-iconbtn site-burger" type="button" aria-label="打开目录" aria-expanded="false" aria-controls="site-aside">${ICON_BURGER}</button>
    <a class="site-brand" href="${baseHome}">
      <span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4.6" fill="currentColor"/><rect x="4" y="16" width="16" height="2.4" rx="1.2" fill="currentColor"/></svg></span>
      <span class="name">ENG GRAMMAR</span>
    </a>
    <nav class="site-topnav">
      <a href="${baseHome}">目录</a>
      <a href="${baseHome}#零基础语法"${levelLabel === "零基础语法" ? ' class="cur"' : ""}>零基础</a>
      <a href="${baseHome}#基础语法"${levelLabel === "基础语法" ? ' class="cur"' : ""}>基础</a>
      <a href="${baseHome}#中级语法"${levelLabel === "中级语法" ? ' class="cur"' : ""}>中级</a>
      <a href="${baseHome}#高级语法"${levelLabel === "高级语法" ? ' class="cur"' : ""}>高级</a>
    </nav>
    <div class="site-searchbox" role="search">⌕&nbsp;&nbsp;搜索课程…&nbsp;&nbsp;<kbd>Ctrl K</kbd></div>
    <button class="site-iconbtn site-theme-toggle" type="button" aria-label="切换主题" title="切换主题">
      <span class="icon-sun">${ICON_SUN}</span>
      <span class="icon-moon">${ICON_MOON}</span>
    </button>
  </div>
</header>
<div class="site-scrim" aria-hidden="true"></div>`;
}

// courseBase：当前所在页在 dist/ 下的"相对的 ../前缀"
// 课程页位于 dist/<level>/file.html → 到同辈 <level>/file.html 只需 "../<level>/"
function renderSidebar(courses, currentFile, courseBase = "../") {
  const groups = LEVELS.map((lv) => {
    const inLevel = courses.filter((c) => c.level === lv.dir);
    const items = inLevel.length
      ? inLevel.map((c) => {
          // 课程页：../<level>/<file>
          // 首页（currentFile=null）：dist/<level>/<file>
          const href = currentFile
            ? `${courseBase}${lv.dir}/${encodeURIComponent(c.file)}`
            : `dist/${lv.dir}/${encodeURIComponent(c.file)}`;
          const isCur = currentFile && c.file === currentFile;
          return `<li><a href="${href}"${isCur ? ' class="cur"' : ""}><span class="num">${esc(c.code)}</span>${esc(c.title)}</a></li>`;
        }).join("")
      : `<li><span class="empty">尚未收录</span></li>`;
    return `<div class="group">
        <h3><span class="dot"></span>${esc(lv.label)} · ${inLevel.length} 课</h3>
        <ul>${items}</ul>
      </div>`;
  }).join("");
  return `<aside class="site-aside" id="site-aside">
  <h2>目录 · INDEX</h2>
  ${groups}
</aside>`;
}

function renderPrevNext(prev, next) {
  // 课程页在 dist/<level>/file.html，链接同辈的课只需 "../<level>/<file>"
  const prevHtml = prev
    ? `<a href="../${prev.level}/${encodeURIComponent(prev.file)}"><em><span class="arrow">←</span>&nbsp;上一篇</em><strong>${esc(prev.code)} · ${esc(prev.title)}</strong></a>`
    : `<a class="site-disabled"><em><span class="arrow">←</span>&nbsp;上一篇</em><strong>已是第一课</strong></a>`;
  const nextHtml = next
    ? `<a class="next" href="../${next.level}/${encodeURIComponent(next.file)}"><em>下一篇&nbsp;<span class="arrow">→</span></em><strong>${esc(next.code)} · ${esc(next.title)}</strong></a>`
    : `<a class="next site-disabled"><em>下一篇&nbsp;<span class="arrow">→</span></em><strong>已是最后一课</strong></a>`;
  return `<div class="site-prevnext">${prevHtml}${nextHtml}</div>`;
}

function renderCoursePage(course, prev, next, allCourses) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>${esc(course.code)} · ${esc(course.title)} · 英语语法笔记</title>
<link rel="stylesheet" href="../../assets/site.css">
${FLASH_SCRIPT}
</head>
<body>
${renderTopbar(course.levelLabel, "../../index.html")}
<div class="site-layout">
  ${renderSidebar(allCourses, course.file, "../")}
  <main class="site-main">
    <div class="site-crumbs">${esc(course.levelLabel)} <em>›</em> <span>${esc(course.code)}</span></div>
    <h1>${esc(course.title)}</h1>
    <p class="site-lede">${esc(course.levelLabel)} · 第 ${esc(course.code)} 课 · 陈老师语法系列整理与注释版。</p>
    <div class="site-meta-row">
      <span class="site-chip accent">${esc(course.code)}</span>
      <span class="site-chip">${esc(course.levelLabel)}</span>
      <span class="site-chip">陈老师系列</span>
    </div>
    <div class="site-lesson-body">${course.inner}</div>
    ${renderPrevNext(prev, next)}
  </main>
</div>
${TO_TOP_BTN}
${jsLink("../../assets/site.js")}
</body>
</html>
`;
}

function renderIndex(allCourses) {
  const sections = LEVELS.map((lv) => {
    const inLevel = allCourses.filter((c) => c.level === lv.dir);
    const cards = inLevel.length
      ? inLevel.map((c) => `<a class="site-card" href="dist/${lv.dir}/${encodeURIComponent(c.file)}">
          <span class="code">${esc(c.code)}</span>
          <span class="ttl">${esc(c.title)}</span>
          <span class="arrow">→</span>
        </a>`).join("")
      : `<p class="site-empty">尚未收录 —— 内容增量更新后将在此出现。</p>`;
    return `<section class="site-shelf" id="${esc(lv.dir)}">
      <header class="site-shelf-head">
        <span class="idx">${esc(lv.idx)}</span>
        <h2>${esc(lv.label)}</h2>
        <span class="cnt">${inLevel.length} 课</span>
      </header>
      <div class="site-cards">${cards}</div>
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>英语语法笔记 · ENG GRAMMAR</title>
<link rel="stylesheet" href="assets/site.css">
${FLASH_SCRIPT}
</head>
<body>
${renderTopbar(null, "index.html")}
<div class="site-layout">
  ${renderSidebar(allCourses, null, "../")}
  <main class="site-main">
    <header class="site-intro">
      <div class="site-crumbs">全部 <em>›</em> <span>${allCourses.length} 课</span></div>
      <h1>英语语法笔记</h1>
      <p class="site-lede">陈老师语法系列 · 整理与注释版 · 由浅入深随时翻阅。零基础 → 基础 → 中级 → 高级。</p>
      <div class="site-meta-row">
        <span class="site-chip accent">ENG GRAMMAR</span>
        <span class="site-chip">陈老师系列</span>
        <span class="site-chip">${allCourses.length} 课</span>
        <span class="site-chip">增量更新中</span>
      </div>
    </header>
    ${sections}
  </main>
</div>
${TO_TOP_BTN}
${jsLink("assets/site.js")}
</body>
</html>
`;
}

// 6. 把每篇文章映射到 level / file / 排序 → 写入 dist/
const coursesForPages = articles.map((a, i) => ({
  code: a.code,
  title: a.title,
  inner: a.inner,
  level: detectLevel(a.code, i),
  levelLabel: LEVELS.find((l) => l.dir === detectLevel(a.code, i)).label,
  file: `【${a.code}】${a.title}.html`,
}));

// 按"零基础 → 基础 → 中级 → 高级" + G 编号 排序
function sortCourses(a, b) {
  const la = LEVELS.findIndex((l) => l.dir === a.level);
  const lb = LEVELS.findIndex((l) => l.dir === b.level);
  if (la !== lb) return la - lb;
  const na = parseInt(a.code.replace(/\D/g, ""), 10);
  const nb = parseInt(b.code.replace(/\D/g, ""), 10);
  return na - nb;
}
coursesForPages.sort(sortCourses);

// 7. 清空 dist/ 并写
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST, { recursive: true });

for (let i = 0; i < coursesForPages.length; i++) {
  const c = coursesForPages[i];
  const prev = i > 0 ? coursesForPages[i - 1] : null;
  const next = i < coursesForPages.length - 1 ? coursesForPages[i + 1] : null;

  const dir = path.join(DIST, c.level);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, c.file);
  fs.writeFileSync(file, renderCoursePage(c, prev, next, coursesForPages), "utf8");
  console.log(`  · 写 dist/${c.level}/${c.file}`);
}

// 8. 写首页
fs.writeFileSync(path.join(ROOT, "index.html"), renderIndex(coursesForPages), "utf8");
console.log(`✓ 写首页 index.html`);

// 9. 拷贝 site.css 到根目录（保证 dist/ 子页能通过 ../assets/site.css 访问到）
//    （已经存在 ROOT/assets/site.css，无需处理）
console.log(`\n完成。共 ${coursesForPages.length} 课。`);
console.log(`本地预览：python -m http.server 8765  →  http://localhost:8765/`);
