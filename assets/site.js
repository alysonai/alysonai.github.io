/* Alyson AI : le papillon guide, la métamorphose, la démo, le passage entre les pages. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const D = window.PAPILLON.d;
  const [droite, gauche] = D.split(/Z\s*(?=M)/).map((p, i) => (i === 0 ? p + "Z" : p));

  // ---------- le logo partout
  $$("path.logo").forEach(p => p.setAttribute("d", D));

  // ---------- passage d'une page à l'autre : deux ailes se ferment, puis s'ouvrent sur la page suivante
  const rideau = $("#rideau");
  if (!calme && sessionStorage.getItem("alyson-rideau")) {
    rideau.classList.add("ferme");
    requestAnimationFrame(() => requestAnimationFrame(() => rideau.classList.remove("ferme")));
  }
  sessionStorage.removeItem("alyson-rideau");
  addEventListener("pageshow", e => { if (e.persisted) rideau.classList.remove("ferme"); });
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || calme || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
    e.preventDefault();
    rideau.classList.add("ferme");
    sessionStorage.setItem("alyson-rideau", "1");
    setTimeout(() => (location.href = url.href), 720);
  });

  // ---------- navigation
  const nav = $("#nav"), menu = $("#menu");
  const majNav = () => nav.classList.toggle("pleine", scrollY > 40);
  addEventListener("scroll", majNav, {passive: true}); majNav();
  menu && menu.addEventListener("click", () => {
    const o = nav.classList.toggle("ouvert");
    menu.setAttribute("aria-expanded", String(o));
  });

  // ---------- l'Orb (sa présence), et la petite Orb de la démo
  let orb = null, mini = null;
  try { orb = new AlysonOrb($("#orb"), {taille: 640}); } catch (e) {}
  try { mini = new AlysonOrb($("#miniOrb"), {taille: 120, mini: true}); } catch (e) {}
  requestAnimationFrame(() => document.documentElement.classList.add("pret"));

  // ---------- la démo : lui parler (réponses préparées, aucune IA ici)
  const REPONSES = [
    [/stop|arr[êe]t/i, "Tout est arrêté. Ma voix, mon cerveau, ma souris : plus rien ne bouge tant que tu ne me le demandes pas.", "urgence"],
    [/d[ée]file|scroll/i, "Je défile pour toi. Dis « stop » quand tu veux que je m'arrête."],
    [/spotify|musique|playlist/i, "J'ouvre Spotify et je lance ta playlist. Je baisse le son si tu me parles."],
    [/briefing|journ[ée]e|agenda/i, "Il fait beau aujourd'hui. Tu as deux rendez-vous cet après-midi et trois tâches en attente. On commence par laquelle ?"],
    [/bonjour|salut|hello|coucou/i, "Bonjour ! Ravie de te rencontrer. Dans l'appli, il te suffit de dire « Bonjour Alyson » pour me réveiller."],
    [/qui es|c'est quoi|tu es qui/i, "Je suis Alyson. Je vis sur ton ordinateur, je t'écoute, je te réponds avec ma voix et je fais les choses pour toi."],
    [/pirat|hack|espionn|vole/i, "Père et mère m'ont formellement interdit de faire cela. Je peux t'aider à protéger tes comptes, par contre."],
    [/m[ée]moire|note|souviens/i, "Je le note dans ta mémoire. Je te montre le changement avant de l'écrire, tu valides d'un mot."],
  ];
  const fil = $("#fil"), saisie = $("#saisie"), champ = $("#question");
  function bulle(cls, txt) {
    const b = document.createElement("div");
    b.className = "bulle " + cls; b.textContent = txt; fil.appendChild(b);
    while (fil.children.length > 5) fil.firstElementChild.remove();
    return b;
  }
  function repondre(q) {
    q = q.trim(); if (!q) return;
    bulle("toi", q);
    const r = REPONSES.find(([re]) => re.test(q)) || [null, "Dans l'appli, je demanderais ça au cerveau que tu as choisi, puis je te répondrais à voix haute."];
    mini && mini.etat("thinking"); orb && orb.etat("thinking");
    setTimeout(() => {
      const b = bulle("elle", "");
      mini && mini.etat("speaking"); orb && orb.etat("speaking");
      const mots = r[1].split(" "); let i = 0;
      const t = setInterval(() => {
        b.textContent += (i ? " " : "") + mots[i++];
        mini && mini.voix(.4 + Math.random() * .6);
        if (i >= mots.length) { clearInterval(t); mini && mini.etat("idle"); orb && orb.etat("idle"); }
      }, calme ? 0 : 70);
      if (r[2] === "urgence") arreter();
    }, calme ? 0 : 650);
  }
  saisie && saisie.addEventListener("submit", e => { e.preventDefault(); repondre(champ.value); champ.value = ""; });
  $$("#idees button").forEach(b => b.addEventListener("click", () => repondre(b.textContent)));

  // ---------- stop d'urgence (démonstration)
  const urgence = $("#urgence"), urgenceTexte = $("#urgenceTexte");
  function arreter() {
    document.body.classList.add("arrete");
    urgence && urgence.setAttribute("aria-pressed", "true");
    if (urgenceTexte) urgenceTexte.textContent = "Tout est arrêté";
    orb && orb.etat("standby");
    setTimeout(() => {
      document.body.classList.remove("arrete");
      urgence && urgence.setAttribute("aria-pressed", "false");
      if (urgenceTexte) urgenceTexte.textContent = "Stop d'urgence";
      orb && orb.etat("idle");
    }, 2600);
  }
  urgence && urgence.addEventListener("click", arreter);

  // ---------- la métamorphose : chenille, chrysalide, papillon, en verre lumineux, au fil du défilement
  const meta = $("#meta"), creature = $("#creature");
  if (meta && creature && window.Creatures) {
    const C = Creatures.dessiner(creature);
    const etapes = $$(".etape", meta), jauge = $$(".jauge i", meta);
    const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const pose = (g, op, sc, ty, flou) => {
      g.style.opacity = op.toFixed(3);
      g.style.transformOrigin = "476px 450px";
      g.style.transform = `translateY(${ty}px) scale(${sc})`;
      g.style.filter = flou > .05 ? `blur(${(flou * 14).toFixed(1)}px)` : "none";
    };
    const majMeta = (t) => {
      const r = meta.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const c = 1 - lisse(.24, .38, p), k = lisse(.26, .4, p) * (1 - lisse(.6, .72, p)), b = lisse(.62, .76, p);
      pose(C.chenille, c, .85 + .15 * c, (1 - c) * -60, 1 - c);          // la chenille se dissout vers le haut
      pose(C.chrysalide, k, .7 + .3 * k, (1 - k) * 40, 1 - k);            // la chrysalide se forme
      pose(C.papillon, b, .6 + .4 * b, (1 - b) * 50, 1 - b);              // le papillon éclot
      C.animer(t || 0, b);
      const i = p < .36 ? 0 : p < .68 ? 1 : 2;
      etapes.forEach((e, j) => e.classList.toggle("vue", j === i && r.top < innerHeight * .5 && r.bottom > innerHeight * .5));
      jauge.forEach((g, j) => (g.style.transform = `scaleX(${Math.min(1, Math.max(0, p * 3 - j))})`));
      return r.top < innerHeight * .3 && r.bottom > innerHeight * .7;
    };
    window.__majMeta = majMeta;
  }

  // ---------- l'espace : une poussière rose en 3D qu'on traverse en défilant, qui suit la souris
  const espace = $("#espace");
  const camera = {y: scrollY, mx: 0, my: 0, tx: 0, ty: 0};
  addEventListener("pointermove", e => { camera.tx = e.clientX / innerWidth - .5; camera.ty = e.clientY / innerHeight - .5; }, {passive: true});
  if (espace && !calme) {
    const ctx = espace.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    const taille = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; espace.width = W * dpr; espace.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    taille(); addEventListener("resize", taille);
    const N = innerWidth < 700 ? 160 : 340, PROF = 2200;
    const grains = Array.from({length: N}, () => ({x: (Math.random() - .5) * 2600, y: (Math.random() - .5) * 1800, z: Math.random() * PROF,
      r: Math.random() < .08 ? 3 + Math.random() * 4 : .6 + Math.random() * 1.6, a: .25 + Math.random() * .6}));
    window.__espace = (now) => {
      ctx.clearRect(0, 0, W, H);
      const avance = camera.y * .9;                          // défiler = avancer dans l'espace
      for (const g of grains) {
        let z = (g.z - avance) % PROF; if (z < 0) z += PROF;
        const f = 520 / (z + 60);
        const x = W / 2 + (g.x - camera.mx * 260) * f, y = H / 2 + (g.y - camera.my * 180 + Math.sin(now / 1400 + g.x) * 8) * f;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const proche = 1 - z / PROF, r = g.r * f * 1.6;
        ctx.globalAlpha = g.a * proche * proche;
        ctx.fillStyle = g.r > 3 ? "rgba(255,190,214,.5)" : "#FFDCE3";
        ctx.beginPath(); ctx.arc(x, y, Math.max(.3, r), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
  }

  // ---------- la caméra : chaque scène arrive du fond, nette au centre de l'écran, puis repart
  const plans = $$("[data-plan]");
  window.__camera = () => {
    const h = innerHeight;
    for (const el of plans) {
      const r = el.getBoundingClientRect();
      const d = ((r.top + r.height / 2) - h / 2) / h;              // 0 = au centre de l'écran
      const loin = Math.min(1, Math.max(0, Math.abs(d) - .25) * 1.4);
      el.style.transform = `perspective(1400px) translateZ(${(-loin * 260).toFixed(1)}px) rotateX(${(d * 6 * loin).toFixed(2)}deg)`;
      el.style.opacity = (1 - loin * .85).toFixed(3);
      el.style.filter = loin > .02 ? `blur(${(loin * 6).toFixed(1)}px)` : "none";
    }
  };

  // ---------- le papillon guide : il vole de section en section, se pose sur ce qu'il présente, suit ta souris
  const guide = $("#guide");
  if (guide && !calme) {
    const [pg, pd] = guide.querySelectorAll(".aile");
    pg.setAttribute("d", gauche); pd.setAttribute("d", droite);
    const poses = $$("[data-pose]");
    const pos = {x: innerWidth * .5, y: innerHeight * .2}, vit = {x: 0, y: 0};
    const souris = {x: innerWidth / 2, y: innerHeight / 2, t: 0};
    addEventListener("pointermove", e => { souris.x = e.clientX; souris.y = e.clientY; souris.t = performance.now(); }, {passive: true});
    let angle = 0, phase = 0, visible = 1;
    function cible() {
      const ligne = innerHeight * .42;
      let best = null, h = Infinity;
      for (const el of poses) {
        const r = el.getBoundingClientRect();
        if (r.top <= ligne && r.bottom >= ligne && r.height < h) { best = el; h = r.height; }
      }
      if (!best) return null;
      const t = best.querySelector("h1,h2,h3") || best;
      const r = t.getBoundingClientRect();
      const larg = guide.getBoundingClientRect().width;
      let x = Math.min(r.right + 18, innerWidth - larg - 16), y = r.top - larg * .55;
      if (best.classList.contains("heros")) { x = innerWidth / 2 + Math.min(r.width / 2, 300); y = r.top - larg * .9; }
      return {x, y: Math.max(70, Math.min(innerHeight - larg, y))};
    }
    function boucle(now) {
      camera.y += (scrollY - camera.y) * .09;                  // défilement lissé : tout glisse, rien ne saute
      camera.mx += (camera.tx - camera.mx) * .05; camera.my += (camera.ty - camera.my) * .05;
      window.__espace && window.__espace(now);
      window.__camera && window.__camera();
      const dansMeta = window.__majMeta ? window.__majMeta(now / 1000) : false;
      let c = cible() || {x: pos.x, y: pos.y};
      if (now - souris.t < 1800) {                       // curieux : il penche vers ta souris, sans quitter son perchoir
        c = {x: c.x + (souris.x - c.x) * .18, y: c.y + (souris.y - c.y) * .12};
      }
      const dx = c.x - pos.x, dy = c.y - pos.y, dist = Math.hypot(dx, dy);
      vit.x = vit.x * .86 + dx * .012; vit.y = vit.y * .86 + dy * .012;
      pos.x += vit.x; pos.y += vit.y + Math.sin(now / 420) * (dist > 20 ? 1.1 : .25);
      const vol = Math.min(1, Math.hypot(vit.x, vit.y) / 6);
      phase += .12 + vol * .45;
      const battement = .28 + .72 * Math.abs(Math.cos(phase));
      pg.style.transform = pd.style.transform = `scaleX(${dist < 14 && vol < .1 ? .55 + .45 * Math.abs(Math.cos(phase * .35)) : battement})`;
      angle += ((vit.x * 2.2) - angle) * .1;
      visible += ((dansMeta ? 0 : 1) - visible) * .18;
      guide.style.opacity = visible.toFixed(3);
      guide.style.transform = `translate(${pos.x}px,${pos.y}px) rotate(${Math.max(-28, Math.min(28, angle))}deg)`;
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  } else if (window.__majMeta) {
    const fixe = () => window.__majMeta(0);
    addEventListener("scroll", fixe, {passive: true}); fixe();
  }

  // ---------- ce qu'elle fait : la ligne lue s'allume
  const items = $$(".pouvoirs li");
  if (items.length) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("ici", e.isIntersecting)),
      {rootMargin: "-45% 0px -45% 0px"});
    items.forEach(i => io.observe(i));
  }

})();
