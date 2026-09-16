/* =====================================================================
   assets/site.js · 站点行为脚本
   ---------------------------------------------------------------------
   · 暗色主题切换：localStorage 记忆，跟随 prefers-color-scheme 首次
   · 移动端侧栏抽屉：汉堡按钮 + 蒙层 + 点击链接/蒙层自动关闭
   · 主题切换 / 抽屉开关 同步到 <html data-theme="..."> 与 .site-aside
   · 注入主题瞬态样式：避免首屏闪烁
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "eg-theme";
  var html = document.documentElement;
  var burger = document.querySelector(".site-burger");
  var aside = document.querySelector(".site-aside");
  var scrim = document.querySelector(".site-scrim");
  var themeBtn = document.querySelector(".site-theme-toggle");

  // ── 主题 ──
  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (_) {}
  }
  function systemPref() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }
  function currentTheme() {
    return html.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function applyTheme(t) {
    html.setAttribute("data-theme", t);
    if (themeBtn) {
      var label = t === "dark" ? "切换到浅色主题" : "切换到暗色主题";
      themeBtn.setAttribute("aria-label", label);
      themeBtn.setAttribute("title", label);
    }
  }
  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    setStored(next);
  }

  // 初始化主题：localStorage 优先，否则跟随系统
  (function initTheme() {
    var stored = getStored();
    var t = stored === "dark" || stored === "light" ? stored : systemPref();
    applyTheme(t);
  })();

  // 系统偏好变化时，若用户没显式选择就跟随
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (e) {
      if (getStored() == null) applyTheme(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);  // Safari < 14
  }

  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // ── 顶部胶囊导航：当前激活胶囊自动滚动到可见区 ──
  // 顺序固定，激活项 scrollIntoView 到 nav 起始位置（保留少量左 padding）
  (function initTopnav() {
    var nav = document.querySelector(".site-topnav");
    var cur = nav && nav.querySelector("a.cur");
    if (!nav || !cur) return;
    // 等待字体与布局稳定再滚动，避免初次闪烁
    var doScroll = function () {
      var navRect = nav.getBoundingClientRect();
      var curRect = cur.getBoundingClientRect();
      // 仅当激活项超出可见区才滚动
      if (curRect.left < navRect.left + 8 || curRect.right > navRect.right - 8) {
        var offset = cur.offsetLeft - 8;
        nav.scrollTo({ left: offset, behavior: "auto" });
      }
    };
    requestAnimationFrame(doScroll);
    window.addEventListener("load", doScroll);
  })();

  // ── 抽屉 ──
  function isOpen() {
    return aside && aside.classList.contains("is-open");
  }
  function openDrawer() {
    if (!aside) return;
    aside.classList.add("is-open");
    if (scrim) scrim.classList.add("is-open");
    document.body.classList.add("site-no-scroll");
    if (burger) burger.setAttribute("aria-expanded", "true");
  }
  function closeDrawer() {
    if (!aside) return;
    aside.classList.remove("is-open");
    if (scrim) scrim.classList.remove("is-open");
    document.body.classList.remove("site-no-scroll");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  function toggleDrawer() {
    isOpen() ? closeDrawer() : openDrawer();
  }

  if (burger) burger.addEventListener("click", toggleDrawer);
  if (scrim) scrim.addEventListener("click", closeDrawer);

  // 点击抽屉内链接后自动关闭
  if (aside) {
    aside.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a) closeDrawer();
    });
  }

  // ESC 关闭
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) closeDrawer();
  });

  // ── 侧栏分组折叠（手风琴：一次只展开一个层级） ──
  function closeAllGroups() {
    document.querySelectorAll(".site-aside .group").forEach(function (g) {
      g.classList.remove("is-open");
      var h = g.querySelector(".group-head");
      if (h) h.setAttribute("aria-expanded", "false");
    });
  }
  function openGroup(g) {
    if (!g) return;
    g.classList.add("is-open");
    var h = g.querySelector(".group-head");
    if (h) h.setAttribute("aria-expanded", "true");
  }
  function toggleGroup(g) {
    if (!g) return;
    var wasOpen = g.classList.contains("is-open");
    closeAllGroups();
    if (!wasOpen) openGroup(g);
  }
  document.querySelectorAll(".site-aside .group-head").forEach(function (head) {
    head.addEventListener("click", function () { toggleGroup(head.parentElement); });
  });

  // ── 侧栏 active 项自动滚动到可视区顶部（仅不可见时滚动，smooth） ──
  function scrollActiveIntoView(asideEl, linkEl) {
    if (!asideEl || !linkEl) return;
    var aRect = asideEl.getBoundingClientRect();
    var lRect = linkEl.getBoundingClientRect();
    // 视区顶部留 ~12px 头边距；可见则跳过
    var headPad = 12;
    var topOk = lRect.top >= aRect.top + headPad;
    var bottomOk = lRect.bottom <= aRect.bottom - 4;
    if (topOk && bottomOk) return;
    // 计算目标：让 linkEl 顶部对齐 aRect.top + headPad
    var target = linkEl.offsetTop - headPad;
    if (target < 0) target = 0;
    var max = asideEl.scrollHeight - asideEl.clientHeight;
    if (target > max) target = max;
    asideEl.scrollTo({ top: target, behavior: "smooth" });
  }
  // 1) 初始 mount：定位 build 时写入的 .cur
  function initActiveScroll() {
    var sb = document.querySelector(".site-aside");
    if (!sb) return;
    var cur = sb.querySelector("li a.cur") || sb.querySelector("a.cur");
    if (!cur) return;
    // 等待布局/字体稳定；滚动到 group 容器以便折叠也能正常展开
    var run = function () { scrollActiveIntoView(sb, cur); };
    requestAnimationFrame(run);
    window.addEventListener("load", run);
  }

  // 2) 点击侧栏链接：点击后该链接成为 active
  document.querySelectorAll(".site-aside li a").forEach(function (a) {
    a.addEventListener("click", function () {
      document.querySelectorAll(".site-aside li a").forEach(function (x) { x.classList.remove("cur"); });
      a.classList.add("cur");
      // 同步把激活项所在分组展开（build 默认单展开，点击其他层级不展开折叠的兄弟级）
      var grp = a.closest(".group");
      if (grp && !grp.classList.contains("is-open")) openGroup(grp);
      // 稍等展开动画完成后再滚（节流到下一帧）
      requestAnimationFrame(function () {
        scrollActiveIntoView(document.querySelector(".site-aside"), a);
      });
    });
  });

  // 3) 初始化：build 时已写入 .cur；如没写，根据 hash 选中并滚
  initActiveScroll();
  // 若当前页无 .cur（首页），按 URL hash 标记并滚
  (function initByHash() {
    var sb = document.querySelector(".site-aside");
    if (!sb) return;
    if (sb.querySelector("a.cur")) return;
    if (!location.hash) return;
    var name = "";
    try { name = decodeURIComponent(location.hash.slice(1)); } catch (_) {}
    var target = sb.querySelector('.group[data-group="' + name + '"]');
    if (target) openGroup(target);
  })();
  // 初始展开定位：当前课所在分组 > URL 锚点对应分组 > 保持 build 默认
  (function initGroups() {
    var sb = document.querySelector(".site-aside");
    if (!sb) return;
    var curLink = sb.querySelector("li a.cur");
    var grp = curLink ? curLink.closest(".group") : null;
    if (!grp && location.hash) {
      var name = "";
      try { name = decodeURIComponent((location.hash || "").slice(1)); } catch (_) {}
      grp = name ? sb.querySelector('.group[data-group="' + name + '"]') : null;
    }
    if (grp) {
      closeAllGroups();
      openGroup(grp);
    }
  })();

  // ── 回到顶部按钮 ──
  var toTop = document.querySelector(".site-to-top");
  if (toTop) {
    var ticking = false;
    var lastVisible = false;
    function updateToTop() {
      ticking = false;
      var should = window.scrollY > 240;
      if (should !== lastVisible) {
        lastVisible = should;
        toTop.classList.toggle("is-visible", should);
      }
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateToTop);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    updateToTop();

    toTop.addEventListener("click", function () {
      // respect reduced-motion：开启时直接跳，否则 smooth
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }
})();
