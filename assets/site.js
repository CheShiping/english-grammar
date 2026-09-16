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
