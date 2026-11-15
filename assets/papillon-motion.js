/* =====================================================================================
   ButterflyMotion : le système d'animations du PAPILLON, logo officiel d'Alyson AI.
   Le papillon = la MARQUE (accueil, notifications, signature, apparition). L'Orb = la conversation.
   Ce fichier ne touche jamais à l'Orb.

   const p = new ButterflyMotion(conteneur, {taille: 120, intensite: 1, vitesse: 1});
   p.jouer('respiration')          // animations en boucle ou ponctuelles (liste : ButterflyMotion.ANIMATIONS)
   p.evenement('notification')     // comportements de l'appli -> la bonne animation
   p.voler(x, y, {duree})          // déplacement élégant vers une position (en px, dans le conteneur)
   p.reglages({intensite, vitesse, taille}) ; p.stop() ; p.detruire()

   Silhouette : window.PAPILLON (papillon-chemin.js), tirée du logo officiel. Jamais redessinée.
   SVG + animations natives (Web Animations). Canvas seulement pour les particules.
   Respecte « mouvement réduit », s'arrête quand la page est cachée, ne garde aucune boucle inutile.
   ===================================================================================== */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const RP = '#F8E7E9', RL = '#FFDCE3', RB = '#FFF5F7', R2 = '#F4DDE1', R3 = '#EBCBD1', LUEUR = '#F7C3D1';
  const M = 300;                                   // marge autour du papillon (halo, anneau, ondes)
  const reduit = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;
  const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };

  // les 18 animations (la planche officielle) : en boucle ou ponctuelles
  const ANIMATIONS = {
    repos:       {boucle: true,  nom: 'Au repos'},
    respiration: {boucle: true,  nom: 'Respiration'},
    pulse:       {boucle: false, nom: 'Pulse'},
    vol:         {boucle: true,  nom: 'Vol léger'},
    battement:   {boucle: true,  nom: 'Battement'},
    eclat:       {boucle: false, nom: 'Éclat'},
    energie:     {boucle: true,  nom: 'Énergie'},
    rotation:    {boucle: true,  nom: 'Rotation'},
    dissipation: {boucle: false, nom: 'Dissipation'},
    apparition:  {boucle: false, nom: 'Apparition'},
    disparition: {boucle: false, nom: 'Disparition'},
    contour:     {boucle: false, nom: 'Contour'},
    neon:        {boucle: true,  nom: 'Néon doux'},
    verre:       {boucle: true,  nom: 'Verre'},
    poussiere:   {boucle: true,  nom: 'Poussière d\'étoiles'},
    activation:  {boucle: false, nom: 'Activation'},
    ondulation:  {boucle: true,  nom: 'Ondulation'},
    derive:      {boucle: true,  nom: 'Dérive'},
  };
  // comportements de l'application -> animation
  const EVENEMENTS = {
    ouverture: 'apparition', notification: 'pulse', voix: 'activation', fermeture: 'disparition',
    accueil: 'respiration', confirmation: 'eclat', erreur: 'erreur',
  };

  class ButterflyMotion {
    constructor(conteneur, o = {}) {
      if (!window.PAPILLON) throw new Error('papillon-chemin.js doit être chargé avant papillon-motion.js');
      this.c = conteneur; this.id = 'bm' + (++uid);
      this.o = Object.assign({taille: 120, intensite: 1, vitesse: 1}, o);
      this.anims = []; this.etat = null; this._raf = 0; this._parts = null;
      this._construire(); this.reglages({});
      this._vis = () => { const h = document.hidden; this.anims.forEach(a => h ? a.pause() : a.play()); if (h) this._stopParticules(); else if (this._partMode) this._particules(this._partMode); };
      document.addEventListener('visibilitychange', this._vis);
      this.jouer(o.etat || 'repos');
    }

    _construire() {
      const P = window.PAPILLON, W = P.w, H = P.h, id = this.id;
      this.cx = W / 2; this.cy = H / 2;
      // deux ailes séparées (le logo a deux formes) : la gauche porte la queue
      const ailes = P.d.split('Z').map(s => s.trim()).filter(Boolean).map(s => s + 'Z');
      const premX = s => parseFloat(s.slice(1));
      ailes.sort((a, b) => premX(a) - premX(b));
      this.d = P.d;
      const box = document.createElement('div'); box.className = 'bm-boite';
      box.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;will-change:transform';
      const svg = el('svg', {viewBox: `${-M} ${-M} ${W + 2 * M} ${H + 2 * M}`, 'aria-hidden': 'true', overflow: 'visible'});
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
      const defs = el('defs', {}, svg);
      const lg = el('linearGradient', {id: id + 'f', x1: .15, y1: 0, x2: .7, y2: 1}, defs);
      [[0, RB], [.4, RP], [.75, RL], [1, R3]].forEach(([o, c]) => el('stop', {offset: o, 'stop-color': c}, lg));
      const rg = el('radialGradient', {id: id + 'h'}, defs);
      [[0, RL, .55], [1, RL, 0]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, rg));
      const fl = el('filter', {id: id + 'g', x: '-50%', y: '-50%', width: '200%', height: '200%'}, defs);
      el('feGaussianBlur', {stdDeviation: 16}, fl);
      const fl2 = el('filter', {id: id + 'b', x: '-50%', y: '-50%', width: '200%', height: '200%'}, defs);
      el('feGaussianBlur', {stdDeviation: 40}, fl2);
      const clip = el('clipPath', {id: id + 'c'}, defs); el('path', {d: P.d}, clip);
      const sg = el('linearGradient', {id: id + 's', x1: 0, y1: 0, x2: 1, y2: 0}, defs);
      [[0, '#fff', 0], [.5, '#fff', .85], [1, '#fff', 0]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, sg));
      const bg = el('linearGradient', {id: id + 'mg', x1: 0, y1: 0, x2: 0, y2: 1}, defs);
      [[0, '#fff', 0], [.035, '#fff', 0], [.04, '#fff', 1], [1, '#fff', 1]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, bg));
      const mk = el('mask', {id: id + 'm', maskUnits: 'userSpaceOnUse', x: -M, y: -M, width: W + 2 * M, height: H + 2 * M}, defs);
      this.voile = el('rect', {x: -M, y: -H * .15, width: W + 2 * M, height: H * 2.4, fill: `url(#${id}mg)`}, mk);
      const hg = el('linearGradient', {id: id + 'hg', x1: 0, y1: 0, x2: 1, y2: 0}, defs);
      [[0, '#fff', 0], [.49, '#fff', 0], [.51, '#fff', 1], [1, '#fff', 1]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, hg));
      const mk2 = el('mask', {id: id + 'm2', maskUnits: 'userSpaceOnUse', x: -M, y: -M, width: W + 2 * M, height: H + 2 * M}, defs);
      this.voile2 = el('rect', {x: -W * 1.2, y: -M, width: W * 2.4 + 2 * M, height: H + 2 * M, fill: `url(#${id}hg)`}, mk2);
      const vg = el('linearGradient', {id: id + 'v', x1: 0, y1: 0, x2: 0, y2: 1}, defs);
      [[0, '#fff', 0], [.5, '#fff', .9], [1, '#fff', 0]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, vg));
      const tg = el('linearGradient', {id: id + 't', x1: 0, y1: 0, x2: 1, y2: 0}, defs);
      [[0, RL, 0], [.5, RL, .9], [1, RL, 0]].forEach(([o, c, a]) => el('stop', {offset: o, 'stop-color': c, 'stop-opacity': a}, tg));

      const G = {};
      G.sol = el('ellipse', {cx: W / 2, cy: H + 110, rx: W * .42, ry: 26, fill: `url(#${id}h)`, opacity: .55}, svg);
      G.halo = el('ellipse', {cx: W / 2, cy: H / 2, rx: W * .62, ry: H * .62, fill: `url(#${id}h)`, opacity: .35}, svg);
      G.trainees = el('g', {fill: 'none', stroke: RL, 'stroke-linecap': 'round', opacity: 0, style: `filter:drop-shadow(0 0 14px ${RL})`}, svg);
      el('path', {d: `M${-180} ${H * .72} C ${W * .1} ${H * 1.05}, ${W * .55} ${H * .2}, ${W + 120} ${H * .35}`, 'stroke-width': 12}, G.trainees);
      el('path', {d: `M${-120} ${H * .55} C ${W * .2} ${H * .85}, ${W * .7} ${H * .05}, ${W + 200} ${H * .2}`, 'stroke-width': 6, opacity: .75}, G.trainees);
      G.anneauArr = el('ellipse', {cx: W / 2, cy: H * .58, rx: W * .78, ry: H * .2, fill: 'none', stroke: RL, 'stroke-width': 5, opacity: 0, 'stroke-dasharray': '1400 900'}, svg);
      G.onde = el('path', {d: P.d, fill: 'none', stroke: LUEUR, 'stroke-width': 26, filter: `url(#${id}g)`, opacity: 0, style: 'mix-blend-mode:screen'}, svg);   // onde = lueur rose floue, jamais un aplat
      G.lueur = el('path', {d: P.d, fill: LUEUR, filter: `url(#${id}g)`, opacity: .45}, svg);
      G.papillon = el('g', {}, svg);
      G.gauche = el('path', {d: ailes[0], fill: `url(#${id}f)`}, G.papillon);
      G.droite = el('path', {d: ailes[1], fill: `url(#${id}f)`}, G.papillon);
      [G.gauche, G.droite].forEach(a => { a.style.transformBox = 'view-box'; a.style.transformOrigin = `${W / 2}px ${H / 2}px`; });
      const dans = el('g', {'clip-path': `url(#${id}c)`}, svg);       // tout ce qui est dedans reste DANS la silhouette
      G.reflet = el('rect', {x: -W * .5, y: -50, width: W * .45, height: H + 100, fill: `url(#${id}s)`, opacity: 0}, dans);
      G.ligne = el('rect', {x: -50, y: -H * .15 + H * 2.4 * .0375 - 4, width: W + 100, height: 8, fill: RB, opacity: 0, style: `filter:drop-shadow(0 0 6px ${RL})`}, dans);
      G.montee = el('rect', {x: -50, y: 0, width: W + 100, height: H * .45, fill: `url(#${id}v)`, opacity: 0}, dans);
      G.trait = el('path', {d: P.d, fill: 'none', stroke: RL, style: `filter:drop-shadow(0 0 6px ${R3})`, 'stroke-width': 9, 'stroke-linejoin': 'round', opacity: 0}, svg);
      G.anneauAv = el('path', {d: '', fill: 'none', stroke: RL, 'stroke-width': 5, opacity: 0}, svg);
      G.rayon = el('rect', {x: W / 2 - 3, y: H * .2, width: 6, height: H * 1.05, fill: `url(#${id}h)`, opacity: 0}, svg);
      G.ondes = el('g', {fill: 'none', stroke: RL, 'stroke-linecap': 'round', opacity: 0}, svg);
      for (let k = 0; k < 3; k++) el('path', {d: `M${-260} ${H * .78 + k * 34} C ${W * .15} ${H * .62 + k * 30}, ${W * .4} ${H * .98 + k * 30}, ${W * .55} ${H * .8 + k * 34} S ${W + 120} ${H * .62 + k * 30}, ${W + 260} ${H * .8 + k * 34}`, 'stroke-width': 6 - k * 1.6, opacity: 1 - k * .28}, G.ondes);
      [G.papillon, G.lueur, G.onde, G.trait, G.halo].forEach(e => { e.style.transformBox = 'view-box'; e.style.transformOrigin = `${W / 2}px ${H / 2}px`; });
      this.longueur = (() => { try { return G.trait.getTotalLength(); } catch (e) { return 6000; } })();
      const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      box.appendChild(svg); box.appendChild(cv);
      this.c.appendChild(box);
      this.box = box; this.svg = svg; this.G = G; this.cv = cv; this.W = W; this.H = H;
    }

    reglages(r) {
      Object.assign(this.o, r || {});
      const t = this.o.taille, W = this.W, H = this.H;
      this.ech = t / W;
      this.box.style.width = (W + 2 * M) * this.ech + 'px'; this.box.style.height = (H + 2 * M) * this.ech + 'px';
      if (this.o.x !== undefined) this._placer(this.o.x, this.o.y);
      this.box.style.setProperty('--i', this.o.intensite);
      this.G.lueur.setAttribute('opacity', .45 * this.o.intensite);
      this.G.halo.setAttribute('opacity', .35 * this.o.intensite);
      this.anims.forEach(a => a.playbackRate = this.o.vitesse);
      const d = Math.min(devicePixelRatio || 1, 2);
      this.cv.width = Math.round(parseFloat(this.box.style.width) * d); this.cv.height = Math.round(parseFloat(this.box.style.height) * d);
    }
    // position = centre du papillon, en px dans le conteneur
    _placer(x, y) { this.px = x; this.py = y; this.box.style.transform = `translate(${x - parseFloat(this.box.style.width) / 2}px,${y - parseFloat(this.box.style.height) / 2}px)`; }

    // ---------------------------------------------------------------- animations
    _a(cible, images, opts) {
      const a = cible.animate(images, Object.assign({easing: 'ease-in-out', fill: 'both'}, opts));
      a.playbackRate = this.o.vitesse; this.anims.push(a);
      a.finished.then(() => { if (!opts.iterations || opts.iterations !== Infinity) { const i = this.anims.indexOf(a); if (i >= 0 && !opts.garder) this.anims.splice(i, 1); } }).catch(() => {});
      return a;
    }
    stop() {
      this.anims.forEach(a => a.cancel()); this.anims = []; this._stopParticules(); this._partMode = null;
      const G = this.G, I = this.o.intensite;
      // retour à l'état de base (logo exact, net)
      G.papillon.style.opacity = 1; G.papillon.style.transform = ''; G.papillon.style.filter = ''; G.papillon.removeAttribute('mask'); G.lueur.removeAttribute('mask'); if (this.voile) this.voile.style.transform = ''; if (this.voile2) this.voile2.removeAttribute('transform'); G.gauche.style.transform = ''; G.droite.style.transform = '';
      [G.reflet, G.montee, G.ligne, G.trait, G.onde, G.trainees, G.anneauArr, G.anneauAv, G.rayon, G.ondes].forEach(e => e.style.opacity = 0);
      G.lueur.style.opacity = ''; G.lueur.setAttribute('opacity', .45 * I); G.halo.style.opacity = ''; G.halo.style.transform = ''; G.sol.style.opacity = '';
      G.gauche.setAttribute('fill', `url(#${this.id}f)`); G.droite.setAttribute('fill', `url(#${this.id}f)`);
      G.gauche.removeAttribute('stroke'); G.droite.removeAttribute('stroke');
      this.box.style.opacity = 1;
    }

    /** joue une animation ; renvoie une promesse résolue à la fin (les boucles : tout de suite) */
    jouer(nom, opts = {}) {
      if (nom === 'erreur') return this._erreur();
      if (!ANIMATIONS[nom]) return Promise.resolve();
      const garder = ANIMATIONS[nom].boucle === false && opts.garder;
      if (!opts.ajouter) this.stop();
      this.etat = nom;
      const G = this.G, I = this.o.intensite, inf = Infinity, R = reduit();
      // mouvement réduit : pas de boucle qui bouge, les apparitions deviennent de simples fondus
      if (R && ANIMATIONS[nom].boucle) { if (nom === 'neon' || nom === 'verre') this['_' + nom](true); return Promise.resolve(); }
      const fin = a => a ? a.finished.catch(() => {}) : Promise.resolve();
      switch (nom) {
        case 'repos':
          this._a(G.lueur, [{opacity: .4 * I}, {opacity: .5 * I}], {duration: 5200, iterations: inf, direction: 'alternate'});
          return Promise.resolve();
        case 'respiration':
          this._a(G.papillon, [{transform: 'scale(.97)'}, {transform: 'scale(1.06)'}], {duration: 3200, iterations: inf, direction: 'alternate'});
          this._a(G.lueur, [{opacity: .25 * I, transform: 'scale(.97)'}, {opacity: .85 * I, transform: 'scale(1.1)'}], {duration: 3200, iterations: inf, direction: 'alternate'});
          return Promise.resolve();
        case 'pulse': {
          const a = this._a(G.onde, R ? [{opacity: .6}, {opacity: 0}] : [{opacity: 1, transform: 'scale(1)'}, {opacity: .7, transform: 'scale(1.28)', offset: .5}, {opacity: 0, transform: 'scale(1.55)'}], {duration: 1900, easing: 'cubic-bezier(.2,.7,.3,1)', garder});
          this._a(G.lueur, [{opacity: .45 * I}, {opacity: .8 * I}, {opacity: .45 * I}], {duration: 900});
          return fin(a);
        }
        case 'vol':
          this._a(G.papillon, [{transform: 'translate(0,0) rotate(0deg)'}, {transform: 'translate(18px,-34px) rotate(-6deg)'}, {transform: 'translate(-14px,-16px) rotate(5deg)'}, {transform: 'translate(0,0) rotate(0deg)'}], {duration: 6400, iterations: inf, easing: 'ease-in-out'});
          this._a(G.lueur, [{transform: 'translate(0,0)'}, {transform: 'translate(18px,-34px)'}, {transform: 'translate(-14px,-16px)'}, {transform: 'translate(0,0)'}], {duration: 6400, iterations: inf});
          this._a(G.sol, [{opacity: .55}, {opacity: .3}, {opacity: .42}, {opacity: .55}], {duration: 6400, iterations: inf});
          return Promise.resolve();
        case 'battement':
          // battement subtil : chaque aile se replie un peu vers l'axe, la forme reste celle du logo
          this._a(G.gauche, [{transform: 'scaleX(1)'}, {transform: 'scaleX(.84) skewY(-2deg)'}, {transform: 'scaleX(1)'}], {duration: 1100, iterations: inf});
          this._a(G.droite, [{transform: 'scaleX(1)'}, {transform: 'scaleX(.84) skewY(2deg)'}, {transform: 'scaleX(1)'}], {duration: 1100, iterations: inf});
          return Promise.resolve();
        case 'eclat': {
          const a = this._a(G.lueur, [{opacity: .45 * I, transform: 'scale(1)'}, {opacity: 1 * I, transform: 'scale(1.12)', offset: .3}, {opacity: .45 * I, transform: 'scale(1)'}], {duration: 1300, garder});
          this._a(G.halo, [{opacity: .35 * I}, {opacity: .75 * I, offset: .3}, {opacity: .35 * I}], {duration: 1300});
          return fin(a);
        }
        case 'energie':
          G.trainees.style.opacity = 1;
          [...G.trainees.children].forEach((p, k) => { p.style.strokeDasharray = '520 900'; this._a(p, [{strokeDashoffset: 1420}, {strokeDashoffset: 0}], {duration: 2600 + k * 700, iterations: inf, easing: 'linear'}); });
          this._a(G.lueur, [{opacity: .45 * I}, {opacity: .7 * I}], {duration: 1600, iterations: inf, direction: 'alternate'});
          return Promise.resolve();
        case 'rotation':
          this._orbite();
          return Promise.resolve();
        case 'dissipation': return this._dissipation();
        case 'apparition': {
          this.box.style.opacity = 1;
          const a = this._a(G.papillon, R ? [{opacity: 0}, {opacity: 1}] : [{opacity: 0, transform: 'scale(.88)', filter: 'blur(6px)'}, {opacity: 1, transform: 'scale(1)', filter: 'blur(0px)'}], {duration: 1200, easing: 'cubic-bezier(.2,.8,.2,1)', garder});
          this._a(G.lueur, [{opacity: 0}, {opacity: .9 * I, offset: .6}, {opacity: .45 * I}], {duration: 1600});
          this._a(G.rayon, [{opacity: 0, transform: 'scaleY(.3)'}, {opacity: .8, transform: 'scaleY(1)', offset: .5}, {opacity: 0, transform: 'scaleY(1)'}], {duration: 1400});
          this._a(G.sol, [{opacity: 0}, {opacity: .55}], {duration: 1400});
          return fin(a);
        }
        case 'disparition': {
          // le papillon s'efface de haut en bas par un balayage doux, en restant rose (pas de transparence qui grise)
          let a;
          if (R) a = this._a(G.papillon, [{opacity: 1}, {opacity: 0}], {duration: 600, garder: true});
          else {
            G.papillon.setAttribute('mask', `url(#${this.id}m)`);
            a = this._a(this.voile, [{transform: 'translateY(0)'}, {transform: `translateY(${this.H * 1.3}px)`}], {duration: 1100, easing: 'cubic-bezier(.5,0,.75,0)', garder: true});
            G.ligne.style.opacity = .9;
            this._a(G.ligne, [{transform: 'translateY(0)'}, {transform: `translateY(${this.H * 1.3}px)`}], {duration: 1100, easing: 'cubic-bezier(.5,0,.75,0)', garder: true});
          }
          this._a(G.lueur, [{opacity: .45 * I}, {opacity: .8 * I, offset: .6}, {opacity: 0}], {duration: 1100, garder: true});
          this._a(G.halo, [{opacity: .35 * I}, {opacity: 0}], {duration: 1100, garder: true});
          this._a(G.sol, [{opacity: .55}, {opacity: 0}], {duration: 900, garder: true});
          return fin(a);
        }
        case 'contour': {
          const L = this.longueur;
          G.trait.style.strokeDasharray = L;
          this._a(G.papillon, [{opacity: 0}, {opacity: 0, offset: .7}, {opacity: 1}], {duration: 3000, garder});
          this._a(G.lueur, [{opacity: 0}, {opacity: 0, offset: .7}, {opacity: .45 * I}], {duration: 3000});
          const a = this._a(G.trait, [{opacity: 1, strokeDashoffset: L}, {opacity: 1, strokeDashoffset: 0, offset: .7}, {opacity: 0, strokeDashoffset: 0}], {duration: 3000, easing: 'ease-in-out'});
          return fin(a);
        }
        case 'neon': this._neon(false); return Promise.resolve();
        case 'verre': this._verre(false); return Promise.resolve();
        case 'poussiere':
          G.papillon.style.opacity = .7; G.lueur.style.opacity = .35 * I;
          this._particules('poussiere');
          return Promise.resolve();
        case 'activation': {
          // une lumière discrète traverse le papillon
          G.montee.style.opacity = 1;
          this._a(G.papillon, [{opacity: .35}, {opacity: .35, offset: .1}, {opacity: 1}], {duration: 1300, easing: 'ease-in'});
          const a = this._a(G.montee, [{transform: `translateY(${this.H * 1.1}px)`}, {transform: `translateY(${-this.H * .6}px)`}], {duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)', garder});
          this._a(G.rayon, [{opacity: 0}, {opacity: .7, offset: .45}, {opacity: 0}], {duration: 1200});
          this._a(G.lueur, [{opacity: .45 * I}, {opacity: .85 * I, offset: .45}, {opacity: .45 * I}], {duration: 1200});
          return fin(a);
        }
        case 'ondulation':
          G.ondes.style.opacity = .85;
          [...G.ondes.children].forEach((p, k) => this._a(p, [{transform: 'translateX(-30px)', opacity: .35}, {transform: 'translateX(30px)', opacity: 1}], {duration: 2600 + k * 500, iterations: inf, direction: 'alternate'}));
          this._a(G.papillon, [{transform: 'translateY(0) scale(.62)'}, {transform: 'translateY(-14px) scale(.62)'}], {duration: 2600, iterations: inf, direction: 'alternate'});
          this._a(G.lueur, [{transform: 'translateY(0) scale(.62)'}, {transform: 'translateY(-14px) scale(.62)'}], {duration: 2600, iterations: inf, direction: 'alternate'});
          return Promise.resolve();
        case 'derive':
          G.trainees.style.opacity = .8;
          [...G.trainees.children].forEach((p, k) => { p.style.strokeDasharray = '700 900'; this._a(p, [{strokeDashoffset: 1600}, {strokeDashoffset: 0}], {duration: 4600 + k * 900, iterations: inf, easing: 'linear'}); });
          this._a(G.papillon, [{transform: 'translate(-40px,30px) rotate(-6deg) scale(.7)'}, {transform: 'translate(60px,-50px) rotate(4deg) scale(.7)'}], {duration: 5200, iterations: inf, direction: 'alternate'});
          this._a(G.lueur, [{transform: 'translate(-40px,30px) scale(.7)'}, {transform: 'translate(60px,-50px) scale(.7)'}], {duration: 5200, iterations: inf, direction: 'alternate'});
          return Promise.resolve();
      }
      return Promise.resolve();
    }

    _neon(fixe) {
      const G = this.G, I = this.o.intensite;
      [G.gauche, G.droite].forEach(a => { a.setAttribute('fill', 'rgba(255,220,227,.22)'); a.setAttribute('stroke', RL); a.setAttribute('stroke-width', 9); });
      G.lueur.style.opacity = 0;                                   // pas de remplissage flou derrière
      G.papillon.style.filter = `drop-shadow(0 0 10px ${RL}) drop-shadow(0 0 26px rgba(255,220,227,.55))`;
      if (!fixe) this._a(G.papillon, [{filter: `drop-shadow(0 0 8px ${RL}) drop-shadow(0 0 20px rgba(255,220,227,.4))`}, {filter: `drop-shadow(0 0 12px ${RL}) drop-shadow(0 0 34px rgba(255,220,227,.7))`}], {duration: 2400, iterations: Infinity, direction: 'alternate'});
    }
    _verre(fixe) {
      const G = this.G;
      [G.gauche, G.droite].forEach(a => { a.setAttribute('fill', 'rgba(255,214,224,.62)'); a.setAttribute('stroke', 'rgba(255,245,247,.9)'); a.setAttribute('stroke-width', 4); });
      G.lueur.style.opacity = .3 * this.o.intensite; G.reflet.style.opacity = .7;
      if (!fixe) this._a(G.reflet, [{transform: 'translateX(0)'}, {transform: `translateX(${this.W * 1.55}px)`}], {duration: 4200, iterations: Infinity, easing: 'ease-in-out'});
    }
    _orbite() {
      const G = this.G, W = this.W, H = this.H;
      // l'anneau passe derrière (moitié haute) puis devant (moitié basse) : vraie impression de 3D
      G.anneauArr.style.opacity = .55;
      const rx = W * .78, ry = H * .2, cy = H * .58;
      G.anneauAv.setAttribute('d', `M${W / 2 - rx} ${cy} A ${rx} ${ry} 0 0 0 ${W / 2 + rx} ${cy}`);
      G.anneauAv.style.opacity = .9;
      G.anneauAv.style.strokeDasharray = '700 1100';
      this._a(G.anneauAv, [{strokeDashoffset: 1800}, {strokeDashoffset: 0}], {duration: 3600, iterations: Infinity, easing: 'linear'});
      this._a(G.anneauArr, [{strokeDashoffset: 0}, {strokeDashoffset: -2300}], {duration: 3600 * 1.3, iterations: Infinity, easing: 'linear'});
    }
    _erreur() {
      // variation lumineuse discrète : un léger refroidissement, sans secousse
      this.etat = 'erreur';
      const G = this.G, I = this.o.intensite;
      const a = this._a(G.lueur, [{opacity: .45 * I, filter: 'none'}, {opacity: .3 * I, filter: 'saturate(.3) brightness(.85)', offset: .35}, {opacity: .45 * I, filter: 'none'}], {duration: 1600});
      this._a(G.papillon, [{opacity: 1}, {opacity: .7, offset: .35}, {opacity: 1}], {duration: 1600});
      return a.finished.catch(() => {});
    }

    // ---------------------------------------------------------------- particules (canvas)
    _points(n) {
      // points tirés À L'INTÉRIEUR de la vraie silhouette
      if (this._pts && this._pts.length === n) return this._pts;
      const p = new Path2D(this.d), cx = document.createElement('canvas').getContext('2d'), out = [];
      let essais = 0;
      while (out.length < n && essais++ < n * 40) {
        const x = Math.random() * this.W, y = Math.random() * this.H;
        if (cx.isPointInPath(p, x, y)) out.push([x, y]);
      }
      return (this._pts = out);
    }
    _particules(mode, duree) {
      this._stopParticules(); this._partMode = mode;
      const cv = this.cv, x = cv.getContext('2d'), n = mode === 'poussiere' ? 240 : 680;
      const pts = this._points(n).map(([px, py], i) => ({x: px, y: py, ph: Math.random() * 6.28, v: .4 + Math.random(), dx: 60 + Math.random() * 260, dy: -40 - Math.random() * 220, r: .8 + Math.random() * 1.8, d: (px / this.W) * .55 + Math.random() * .15}));
      const t0 = performance.now(), sx = cv.width / (this.W + 2 * M);
      return new Promise(res => {
        const f = now => {
          const t = (now - t0) / 1000 * this.o.vitesse;
          x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
          x.setTransform(sx, 0, 0, sx, M * sx, M * sx);
          x.globalCompositeOperation = 'lighter';
          let fini = false;
          if (mode === 'poussiere') {
            for (const p of pts) {
              const a = (.35 + .65 * Math.abs(Math.sin(t * 1.6 * p.v + p.ph))) * this.o.intensite;
              x.fillStyle = `rgba(255,236,240,${a})`; x.beginPath(); x.arc(p.x, p.y + Math.sin(t + p.ph) * 3, p.r * 1.5, 0, 6.283); x.fill();
            }
          } else {                          // dissipation : se défait de gauche à droite, puis se reconstitue
            const T = duree / 1000, u = Math.min(1, t / T);
            const aller = u < .5 ? u * 2 : (1 - u) * 2;               // 0 -> 1 -> 0
            for (const p of pts) {
              const k = Math.max(0, Math.min(1, (aller * 1.25 - p.d) / .45)); const e = k * k * (3 - 2 * k);
              const px = p.x + p.dx * e + Math.sin(t * 2 + p.ph) * 6 * e, py = p.y + p.dy * e;
              x.fillStyle = `rgba(255,228,234,${Math.min(1, e * 6) * (1 - e * .85) * this.o.intensite})`;   // une particule n'existe qu'en s'envolant
              x.beginPath(); x.arc(px, py, p.r * 2.4, 0, 6.283); x.fill();
            }
            this._vide = aller;
            const bord = Math.max(0, Math.min(1.15, (aller * 1.25 - .02) / .58)) * this.W;   // là où les particules partent
            this.voile2.setAttribute('transform', `translate(${bord},0)`);
            fini = u >= 1;
          }
          if (fini) { if (mode !== 'poussiere') { this.G.papillon.removeAttribute('mask'); this.G.lueur.removeAttribute('mask'); this.voile2.removeAttribute('transform'); } x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); this._raf = 0; this._partMode = null; return res(); }
          this._raf = requestAnimationFrame(f);
        };
        this._raf = requestAnimationFrame(f);
      });
    }
    _stopParticules() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; const x = this.cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.cv.width, this.cv.height); }
    _dissipation() {
      const G = this.G, D = 4200;
      if (reduit()) return this._a(G.papillon, [{opacity: 1}, {opacity: .2}, {opacity: 1}], {duration: 1600}).finished.catch(() => {});
      // le papillon s'efface de gauche à droite pendant que ses particules s'envolent, puis l'inverse
      G.reflet.style.opacity = 0;
      // balayage gauche → droite, synchronisé image par image avec les particules (dans _particules)
      G.papillon.setAttribute('mask', `url(#${this.id}m2)`); G.lueur.setAttribute('mask', `url(#${this.id}m2)`);
      this._a(G.papillon, [{filter: 'brightness(1)'}, {filter: 'brightness(1.3)', offset: .3}, {filter: 'brightness(1.3)', offset: .7}, {filter: 'brightness(1)'}], {duration: D});
      this._a(G.lueur, [{opacity: .45 * this.o.intensite}, {opacity: 0, offset: .35}, {opacity: 0, offset: .65}, {opacity: .45 * this.o.intensite}], {duration: D});
      return this._particules('dissipation', D);
    }

    // ---------------------------------------------------------------- comportements et déplacement
    evenement(nom) { const a = EVENEMENTS[nom]; return a ? this.jouer(a, {ajouter: nom !== 'ouverture' && nom !== 'fermeture' && nom !== 'accueil'}) : Promise.resolve(); }

    /** vol élégant vers (x, y) : départ doux, léger flottement, arrivée qui se pose. */
    voler(x, y, o = {}) {
      const d = (o.duree || 1600) / this.o.vitesse, x0 = this.px ?? x, y0 = this.py ?? y;
      if (reduit()) { this._placer(x, y); return Promise.resolve(); }
      const w = parseFloat(this.box.style.width) / 2, h = parseFloat(this.box.style.height) / 2;
      const mx = (x0 + x) / 2 + (o.courbe ?? -40), my = Math.min(y0, y) - (o.hauteur ?? 60);
      const pts = []; for (let k = 0; k <= 24; k++) { const u = k / 24, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        pts.push({transform: `translate(${a * x0 + b * mx + c * x - w}px,${a * y0 + b * my + c * y - h}px) rotate(${Math.sin(u * 3.14) * -6}deg)`}); }
      const an = this.box.animate(pts, {duration: d, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards'});
      this.anims.push(an);
      return an.finished.then(() => { this._placer(x, y); an.cancel(); const i = this.anims.indexOf(an); if (i >= 0) this.anims.splice(i, 1); }).catch(() => {});
    }

    detruire() { this.stop(); document.removeEventListener('visibilitychange', this._vis); this.box.remove(); }
  }
  ButterflyMotion.ANIMATIONS = ANIMATIONS;
  ButterflyMotion.EVENEMENTS = EVENEMENTS;
  window.ButterflyMotion = ButterflyMotion;
})();
