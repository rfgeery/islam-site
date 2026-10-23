/*
  Shared interaction script for the translated pages (en, es, pt, hi, zh).
  Every visible string comes from window.I18N, defined inline in each page
  before this file is loaded. Vanilla JS only — no external libraries.
*/
(function () {
  "use strict";
  var T = window.I18N || {};
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function fmt(s, v) { return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ""; }); }
  var ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  /* ---------- dark mode ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t === "dark") return true;
    if (t === "light") return false;
    return !!(mq && mq.matches);
  }
  function syncDark() {
    root.setAttribute("data-dark", isDark() ? "1" : "0");
    var b = $("#themeBtn");
    if (b) b.setAttribute("aria-label", isDark() ? T.toLight : T.toDark);
  }
  var savedTheme = store.get("theme");
  if (savedTheme === "light" || savedTheme === "dark") root.setAttribute("data-theme", savedTheme);
  syncDark();
  if (mq && mq.addEventListener) mq.addEventListener("change", syncDark);
  $("#themeBtn").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("theme", next);
    syncDark();
  });

  /* ---------- font size ---------- */
  var scale = parseFloat(store.get("scale")) || 1;
  function applyScale() {
    scale = Math.min(1.4, Math.max(0.9, Math.round(scale * 100) / 100));
    root.style.setProperty("--scale", scale);
    store.set("scale", String(scale));
    measureNav();
  }
  function sizeToast() { toast(fmt(T.fontSize, { n: Math.round(scale * 100) })); }
  $("#fontUp").addEventListener("click", function () { scale += 0.1; applyScale(); sizeToast(); });
  $("#fontDown").addEventListener("click", function () { scale -= 0.1; applyScale(); sizeToast(); });

  /* ---------- nav height (offset when jumping to a section) ---------- */
  var nav = $("nav.topnav");
  function measureNav() { if (nav) root.style.setProperty("--nav-h", nav.offsetHeight + "px"); }
  measureNav();
  window.addEventListener("resize", measureNav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureNav);
  applyScale();

  /* ---------- toast + copy ---------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copy(text, label) {
    var done = function () { toast(fmt(T.copied, { what: label || T.lblText })); };
    var fail = function () { fallbackCopy(text) ? done() : toast(T.copyFail); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  }
  function clean(t) { return (t || "").replace(/\s+/g, " ").trim(); }
  function actBtn(label, onClick) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "act";
    b.innerHTML = ICON_COPY + "<span></span>";
    b.lastChild.textContent = label;
    b.addEventListener("click", function (e) { e.preventDefault(); onClick(); });
    return b;
  }
  function actions() { var d = document.createElement("div"); d.className = "mini-actions"; return d; }

  /* ---------- section anchors ---------- */
  $$("h2.section-title").forEach(function (h) {
    var sec = h.closest("section");
    if (!sec || !sec.id) return;
    var head = document.createElement("div");
    head.className = "section-head";
    h.parentNode.insertBefore(head, h);
    head.appendChild(h);
    var a = document.createElement("a");
    a.className = "anchor"; a.href = "#" + sec.id;
    a.textContent = "#";
    a.setAttribute("aria-label", fmt(T.anchor, { name: clean(h.textContent) }));
    head.appendChild(a);
  });

  /* ---------- copy verses (Arabic + translation + reference) ---------- */
  $$(".verse-box").forEach(function (box) {
    var q = $(".quote-ar", box), tr = $(".quote-tr", box), r = $(".verse-ref", box);
    var a = actions();
    a.appendChild(actBtn(T.copyVerse, function () {
      var parts = [];
      if (q) parts.push("﴿" + clean(q.textContent) + "﴾");
      if (tr) parts.push("“" + clean(tr.textContent) + "”");
      if (r) parts.push(clean(r.textContent));
      copy(parts.join("\n"), T.lblVerse);
    }));
    box.appendChild(a);
  });

  /* ---------- copy shahada ---------- */
  var sh = $(".shahada-box");
  if (sh) {
    var sa = actions();
    sa.appendChild(actBtn(T.copyShahada, function () {
      var parts = [clean($(".shahada-ar", sh).textContent), clean($(".shahada-translit", sh).textContent)];
      var m = $(".shahada-meaning", sh); if (m) parts.push(clean(m.textContent));
      copy(parts.join("\n"), T.lblShahada);
    }));
    sh.appendChild(sa);
  }

  /* ---------- collapsible cards: ids + copy ---------- */
  var listSections = ["stories", "hadith", "bukhari", "faq"];
  listSections.forEach(function (sid) {
    var sec = document.getElementById(sid);
    if (!sec) return;
    $$("details.story", sec).forEach(function (d, i) {
      d.id = sid + "-" + (i + 1);
      var name = $("summary .name", d);
      name.setAttribute("data-orig", name.textContent);
      var body = $(".story-body", d);
      var a = actions();
      var label = sid === "faq" ? T.copyQA : sid === "stories" ? T.copyStory : T.copyHadith;
      a.appendChild(actBtn(label, function () {
        var parts = [clean(name.textContent)];
        $$("p, .story-ref, .tr-note", body).forEach(function (el) { parts.push(clean(el.textContent)); });
        copy(parts.join("\n"), sid === "faq" ? T.lblAnswer : sid === "stories" ? T.lblStory : T.lblHadith);
      }));
      body.appendChild(a);
    });
  });

  /* ---------- search & filter ---------- */
  // Normalisation: lower-case, strip Latin accents (á → a, ç → c), and the
  // same Arabic folding as the Arabic page (for Arabic words typed anywhere).
  function norm2(s) {
    s = s || "";
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s
      .replace(/[ً-ٰٟـ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); })
      .toLowerCase();
  }
  function normChar(c) { return /\s/.test(c) ? " " : norm2(c); }
  function norm(s) { return norm2((s || "").replace(/\s+/g, " ")).trim(); }
  function highlight(el, q) {
    var orig = el.getAttribute("data-orig");
    if (!q) { el.textContent = orig; return; }
    var map = [], n = "";
    for (var i = 0; i < orig.length; i++) {
      var c = normChar(orig[i]);
      for (var j = 0; j < c.length; j++) { n += c[j]; map.push(i); }
    }
    var at = n.indexOf(q);
    if (at < 0) { el.textContent = orig; return; }
    var s = map[at], e = map[at + q.length - 1] + 1;
    el.textContent = "";
    el.appendChild(document.createTextNode(orig.slice(0, s)));
    var m = document.createElement("mark"); m.textContent = orig.slice(s, e);
    el.appendChild(m);
    el.appendChild(document.createTextNode(orig.slice(e)));
  }
  var placeholders = T.placeholders || {};
  listSections.forEach(function (sid) {
    var sec = document.getElementById(sid);
    if (!sec) return;
    var items = $$("details.story", sec);
    if (items.length < 4) return;
    var index = items.map(function (d) {
      var num = $(".hnum", d);
      return { d: d, name: $("summary .name", d), num: num ? norm(num.textContent) : "", text: norm(d.textContent) };
    });
    var bar = document.createElement("div");
    bar.className = "toolbar";
    bar.setAttribute("role", "search");
    var label = document.createElement("label");
    label.className = "search";
    label.innerHTML = ICON_SEARCH;
    var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = T.searchLabel;
    var input = document.createElement("input");
    input.id = "q-" + sid; input.type = "search"; input.autocomplete = "off";
    input.placeholder = placeholders[sid] || "";
    label.appendChild(sr); label.appendChild(input);
    var count = document.createElement("span"); count.className = "count"; count.setAttribute("aria-live", "polite");
    var toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "act toggle-all";
    var tspan = document.createElement("span"); tspan.textContent = T.openAll; toggle.appendChild(tspan);
    bar.appendChild(label); bar.appendChild(count); bar.appendChild(toggle);
    items[0].parentNode.insertBefore(bar, items[0]);
    var empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = T.noResults;
    items[items.length - 1].insertAdjacentElement("afterend", empty);

    function update() {
      var q = norm(input.value), shown = 0;
      index.forEach(function (it) {
        var hit = !q || it.text.indexOf(q) >= 0 || (/^\d+$/.test(q) && it.num === q);
        it.d.hidden = !hit;
        if (hit) shown++;
        highlight(it.name, q);
      });
      count.textContent = q ? shown + " / " + items.length : fmt(T.items, { n: items.length });
      empty.style.display = shown ? "none" : "block";
    }
    var t;
    input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(update, 90); });
    input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; update(); } });
    toggle.addEventListener("click", function () {
      var visible = items.filter(function (d) { return !d.hidden; });
      var openAll = visible.some(function (d) { return !d.open; });
      visible.forEach(function (d) { d.open = openAll; });
      tspan.textContent = openAll ? T.closeAll : T.openAll;
    });
    update();
  });

  /* ---------- open the card named in the URL hash (#hadith-12 etc.) ---------- */
  function openFromHash() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === "DETAILS") {
      el.hidden = false; el.open = true;
      setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 30);
    }
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  /* ---------- progress bar + back-to-top ---------- */
  var pbar = $(".progress span"), toTop = $("#toTop"), ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    pbar.style.setProperty("--p", p.toFixed(4));
    toTop.classList.toggle("show", window.scrollY > 700);
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
    var home = $(".brand"); if (home) home.focus({ preventScroll: true });
  });

  /* ---------- scrollspy: highlight current section chip ---------- */
  var links = $$("#chips a");
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  var current = null;
  function setCurrent(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) { a.removeAttribute("aria-current"); });
    var a = byId[id];
    if (!a) return;
    a.setAttribute("aria-current", "true");
    var c = $("#chips"), cr = c.getBoundingClientRect(), ar = a.getBoundingClientRect();
    if (ar.left < cr.left || ar.right > cr.right) {
      c.scrollBy({ left: (ar.left + ar.width / 2) - (cr.left + cr.width / 2), behavior: "smooth" });
    }
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$("main section[id]").forEach(function (s) { io.observe(s); });
    var hero = $("#home");
    if (hero) new IntersectionObserver(function (en) { if (en[0].isIntersecting) setCurrent("home"); }, { rootMargin: "-40% 0px -55% 0px" }).observe(hero);
  }
})();
