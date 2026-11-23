/* Français / anglais. Chaque texte a sa version anglaise dans data-en ; le choix est gardé d'une page à l'autre.
   Les attributs : data-en (contenu), data-en-placeholder, data-en-aria, et <title data-en>. */
(function () {
  const CLE = "alyson-langue";
  const garde = el => { if (el.dataset.fr == null) el.dataset.fr = el.innerHTML; };
  function appliquer(langue) {
    document.documentElement.lang = langue;
    document.querySelectorAll("[data-en]").forEach(el => { garde(el); el.innerHTML = langue === "en" ? el.dataset.en : el.dataset.fr; });
    document.querySelectorAll("[data-en-placeholder]").forEach(el => {
      if (el.dataset.frPlaceholder == null) el.dataset.frPlaceholder = el.placeholder;
      el.placeholder = langue === "en" ? el.dataset.enPlaceholder : el.dataset.frPlaceholder;
    });
    document.querySelectorAll("[data-en-aria]").forEach(el => {
      if (el.dataset.frAria == null) el.dataset.frAria = el.getAttribute("aria-label") || "";
      el.setAttribute("aria-label", langue === "en" ? el.dataset.enAria : el.dataset.frAria);
    });
    const t = document.querySelector("title[data-en]");
    if (t) { if (t.dataset.fr == null) t.dataset.fr = t.textContent; document.title = langue === "en" ? t.dataset.en : t.dataset.fr; }
    document.querySelectorAll(".langue").forEach(b => {
      b.textContent = langue === "en" ? "FR" : "EN";
      b.setAttribute("aria-label", langue === "en" ? "Passer en français" : "Switch to English");
      b.setAttribute("lang", langue === "en" ? "fr" : "en");
    });
    window.dispatchEvent(new CustomEvent("alyson-langue", {detail: langue}));
  }
  const choisie = () => localStorage.getItem(CLE) || ((navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en");
  window.alysonLangue = choisie;
  document.addEventListener("DOMContentLoaded", () => {
    appliquer(choisie());
    document.querySelectorAll(".langue").forEach(b => b.addEventListener("click", e => {
      e.stopImmediatePropagation();
      const l = choisie() === "en" ? "fr" : "en"; localStorage.setItem(CLE, l); appliquer(l);
    }, true));
  });
})();
