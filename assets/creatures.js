/* Les trois créatures d'Alyson, en verre rose lumineux (Caterpillar, Crysalis, Butterfly).
   window.Creatures.dessiner(svg) : crée les trois dans le <svg> (viewBox -60 -60 1072 958) et renvoie
   {chenille, chrysalide, papillon, animer(t, ouverture)} : t = temps en secondes, ouverture = 0..1 (ailes). */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a, enfants) => {
    const x = document.createElementNS(NS, n);
    for (const k in a || {}) x.setAttribute(k, a[k]);
    (enfants || []).forEach(c => x.appendChild(c));
    return x;
  };
  const stops = (id, liste, extra) => el("radialGradient", Object.assign({id}, extra), liste.map(([o, c, a]) =>
    el("stop", {offset: o, "stop-color": c, "stop-opacity": a == null ? 1 : a})));

  function defs(svg) {
    const d = el("defs");
    // verre : reflet blanc en haut à gauche, coeur rose, bord plus soutenu et transparent
    d.appendChild(stops("verre", [["0", "#FFF6F8", 1], [".6", "#F8E7E9", 1], ["1", "#EBCBD1", 1]], {cx: "40%", cy: "35%", r: "80%"}));
    d.appendChild(stops("verreDoux", [["0", "#FFF6F8", .95], [".6", "#F8E7E9", .9], ["1", "#EBCBD1", .85]], {cx: "40%", cy: "35%", r: "80%"}));
    d.appendChild(stops("aile", [["0", "#F8E7E9", 1], ["1", "#F8E7E9", 1]], {cx: "50%", cy: "45%", r: "75%"}));
    d.appendChild(stops("sol", [["0", "#FF9CC4", .55], ["1", "#FF9CC4", 0]], {}));
    // lueur néon : flou large + flou serré + l'objet net
    d.appendChild(el("filter", {id: "lueur", x: "-60%", y: "-60%", width: "220%", height: "220%"}, [
      el("feGaussianBlur", {in: "SourceGraphic", stdDeviation: "16", result: "large"}),
      el("feGaussianBlur", {in: "SourceGraphic", stdDeviation: "6", result: "serre"}),
      el("feMerge", {}, [el("feMergeNode", {in: "large"}), el("feMergeNode", {in: "serre"}), el("feMergeNode", {in: "SourceGraphic"})]),
    ]));
    d.appendChild(el("filter", {id: "etincelle", x: "-300%", y: "-300%", width: "700%", height: "700%"}, [
      el("feGaussianBlur", {in: "SourceGraphic", stdDeviation: "5", result: "b"}),
      el("feMerge", {}, [el("feMergeNode", {in: "b"}), el("feMergeNode", {in: "b"}), el("feMergeNode", {in: "SourceGraphic"})]),
    ]));
    svg.appendChild(d);
  }

  const sol = (cx, cy, rx) => el("ellipse", {cx, cy, rx, ry: rx * .07, fill: "url(#sol)"});

  function etincelle() {                                   // petite étoile à 4 branches
    return el("g", {filter: "url(#etincelle)"}, [
      el("path", {d: "M0 -16 L3 -3 L16 0 L3 3 L0 16 L-3 3 L-16 0 L-3 -3Z", fill: "#FFFFFF"}),
      el("circle", {r: 4, fill: "#FFD6E6"}),
    ]);
  }

  // ---------- CHENILLE : perles de verre, la tête devant avec deux antennes
  function chenille() {
    const g = el("g");
    g.appendChild(sol(470, 650, 330));
    const corps = el("g", {filter: "url(#lueur)"});
    const n = 8, segs = [];
    for (let i = 0; i < n; i++) {
      const r = i === n - 1 ? 92 : 56 + i * 4;
      const s = el("g");
      s.appendChild(el("circle", {r, fill: "url(#verre)"}));
      s.appendChild(el("circle", {r: r - 3, fill: "none", stroke: "#FFE4EE", "stroke-opacity": .55, "stroke-width": 3}));
      s.appendChild(el("ellipse", {cx: -r * .32, cy: -r * .42, rx: r * .3, ry: r * .14, fill: "#FFFFFF", opacity: .35, transform: "rotate(-25)"}));
      corps.appendChild(s); segs.push({s, r});
    }
    const ant = el("g");
    const a1 = el("path", {fill: "none", stroke: "url(#verre)", "stroke-width": 10, "stroke-linecap": "round"});
    const a2 = el("path", {fill: "none", stroke: "url(#verre)", "stroke-width": 10, "stroke-linecap": "round"});
    const b1 = el("circle", {r: 15, fill: "url(#verre)"}), b2 = el("circle", {r: 15, fill: "url(#verre)"});
    ant.append(a1, a2, b1, b2);
    corps.insertBefore(ant, corps.lastChild);
    g.appendChild(corps);
    g.animer = t => {
      let tete = null;
      segs.forEach(({s, r}, i) => {
        const x = 150 + i * 82, onde = Math.sin(t * 3 - i * .7);
        const y = 590 - r - Math.max(0, onde) * 34 * (i < n - 1 ? 1 : .5);
        s.setAttribute("transform", `translate(${x},${y})`);
        if (i === n - 1) tete = {x, y, r};
      });
      const bal = Math.sin(t * 2.2) * 10;
      const p = (dx, h) => ({x: tete.x + dx, y: tete.y - tete.r * .7, cx: tete.x + dx + bal, cy: tete.y - tete.r - h * .6, ex: tete.x + dx * 2.2 + bal, ey: tete.y - tete.r - h});
      [[a1, b1, p(-22, 120)], [a2, b2, p(28, 110)]].forEach(([a, b, q]) => {
        a.setAttribute("d", `M${q.x} ${q.y} Q${q.cx} ${q.cy} ${q.ex} ${q.ey}`);
        b.setAttribute("cx", q.ex); b.setAttribute("cy", q.ey);
      });
    };
    return g;
  }

  // ---------- CHRYSALIDE : coquille en spirale, translucide, avec son anneau de lumière en orbite
  function chrysalide() {
    const g = el("g");
    g.appendChild(sol(476, 790, 220));
    const coque = el("g", {filter: "url(#lueur)"});
    const forme = "M476 110 C470 150 455 170 440 190 C330 300 300 520 370 680 C410 760 460 790 486 792 C540 780 600 700 620 600 C650 430 600 250 512 190 C496 175 482 150 476 110Z";
    coque.appendChild(el("path", {d: forme, fill: "url(#verreDoux)"}));
    // les bandes en spirale (chacune un peu plus claire, avec un fil de lumière sur le bord)
    const bandes = [
      "M440 190 C520 175 590 220 612 300 C560 280 470 270 400 300 C405 250 420 215 440 190Z",
      "M385 330 C480 290 580 300 622 380 C628 420 626 450 622 470 C560 420 450 410 365 450 C360 410 368 365 385 330Z",
      "M362 490 C460 450 570 460 616 540 C605 600 585 650 556 690 C520 610 450 575 380 590 C368 560 362 525 362 490Z",
      "M392 640 C450 630 510 660 540 712 C520 750 500 775 486 792 C450 785 420 750 398 700 C392 680 390 660 392 640Z",
    ];
    bandes.forEach((d, i) => {
      coque.appendChild(el("path", {d, fill: "url(#verre)", opacity: .55 - i * .05}));
      coque.appendChild(el("path", {d, fill: "none", stroke: "#FFE6EF", "stroke-width": 3, opacity: .7}));
    });
    coque.appendChild(el("path", {d: forme, fill: "none", stroke: "#FFD3E3", "stroke-width": 4, opacity: .8}));
    coque.appendChild(el("path", {d: "M430 250 C395 360 392 500 430 640", fill: "none", stroke: "#FFFFFF", "stroke-width": 10, "stroke-linecap": "round", opacity: .25}));
    // l'anneau : l'arrière passe derrière la coquille, l'avant devant
    const rx = 330, ry = 92, rot = -16, cx = 476, cy = 440;
    const arriere = el("path", {d: `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`, fill: "none", stroke: "#FFB8D1", "stroke-width": 2.5, opacity: .55,
      transform: `rotate(${rot} ${cx} ${cy})`, filter: "url(#etincelle)"});
    const avant = el("path", {d: `M${cx + rx} ${cy} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}`, fill: "none", stroke: "#FFC9DC", "stroke-width": 3, opacity: .85,
      transform: `rotate(${rot} ${cx} ${cy})`, filter: "url(#etincelle)"});
    const e1 = etincelle(), e2 = etincelle();
    g.append(arriere, coque, avant, e1, e2);
    g.animer = t => {
      [[e1, t * .6], [e2, t * .6 + Math.PI]].forEach(([e, a]) => {
        const x = rx * Math.cos(a), y = ry * Math.sin(a), r = rot * Math.PI / 180;
        const px = cx + x * Math.cos(r) - y * Math.sin(r), py = cy + x * Math.sin(r) + y * Math.cos(r);
        e.setAttribute("transform", `translate(${px},${py}) scale(${.7 + .5 * (Math.sin(a) > 0 ? 1 : .5)})`);
        e.style.opacity = Math.sin(a) > 0 ? 1 : .45;          // derrière : plus discrète
      });
      coque.setAttribute("transform", `rotate(${Math.sin(t * .8) * 2.5} 476 450)`);
    };
    return g;
  }

  // ---------- PAPILLON : les ailes officielles, en verre lumineux
  function papillon() {
    const D = window.PAPILLON.d;
    const [droite, gauche] = D.split(/Z\s*(?=M)/).map((p, i) => (i === 0 ? p + "Z" : p));
    const g = el("g");
    g.appendChild(sol(476, 860, 300));
    const corps = el("g", {filter: "url(#lueur)"});
    const mk = d => {
      const w = el("g", {}, [
        el("path", {d, fill: "url(#aile)"}),
        el("path", {d, fill: "none", stroke: "#FFF0F5", "stroke-width": 5, opacity: .85}),
      ]);
      w.style.transformBox = "fill-box";
      return w;
    };
    const ag = mk(gauche), ad = mk(droite);
    ag.style.transformOrigin = "100% 50%"; ad.style.transformOrigin = "0% 50%";
    corps.append(ag, ad);
    g.appendChild(corps);
    g.animer = (t, ouverture) => {
      const o = ouverture == null ? 1 : ouverture;
      const s = (.2 + .8 * o) * (.82 + .18 * Math.abs(Math.cos(t * 1.4)));
      ag.style.transform = ad.style.transform = `scaleX(${s})`;
    };
    return g;
  }

  window.Creatures = {
    dessiner(svg) {
      defs(svg);
      const c = chenille(), k = chrysalide(), p = papillon();
      svg.append(c, k, p);
      return {chenille: c, chrysalide: k, papillon: p, animer(t, o) { c.animer(t); k.animer(t); p.animer(t, o); }};
    },
  };
})();
