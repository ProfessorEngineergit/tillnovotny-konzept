/* Tabs + Sidebar-Navigation für den Konzept-Prototyp */
(function () {
  "use strict";

  function selectTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.tab === name));
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("is-active", p.id === "tab-" + name);
    });
    // mobiles Menü schließen
    var tabs = document.getElementById("tabs");
    if (tabs) tabs.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (history.replaceState) history.replaceState(null, "", "#" + name);
  }

  // Tab-Buttons
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () { selectTab(t.dataset.tab); });
  });

  // Links mit data-go (z. B. Hero-CTA, Brand)
  document.querySelectorAll("[data-go]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      selectTab(a.getAttribute("data-go"));
    });
  });

  // Panlogos-Sidebar: Dokumente umschalten
  var docContent = document.getElementById("doc-content");
  if (docContent) {
    var links = docContent.parentElement.querySelectorAll(".side-nav a[data-doc]");
    var docs = docContent.querySelectorAll(".doc");
    function showDoc(id) {
      docs.forEach(function (d) { d.style.display = d.id === id ? "" : "none"; });
      links.forEach(function (l) { l.classList.toggle("active", l.dataset.doc === id); });
      docContent.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    links.forEach(function (l) {
      l.addEventListener("click", function (e) {
        e.preventDefault();
        showDoc(l.dataset.doc);
      });
    });
    if (links[0]) links[0].classList.add("active");

    // Querverweise INNERHALB eines Dokuments -> Zieldokument öffnen
    docContent.addEventListener("click", function (e) {
      var a = e.target.closest("a.doc-link");
      if (!a) return;
      e.preventDefault();
      showDoc(a.dataset.doc);
    });
  }

  // mobiles Menü
  var mt = document.getElementById("menuToggle");
  if (mt) mt.addEventListener("click", function () {
    document.getElementById("tabs").classList.toggle("open");
  });

  // Deep-Link beim Laden
  var initial = (location.hash || "").replace("#", "");
  if (initial === "panlogos" || initial === "partner" || initial === "enneagramm") {
    selectTab(initial);
  }

  var y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
})();
