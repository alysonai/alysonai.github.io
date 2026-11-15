/* =====================================================================================
   AlysonOrb : la présence interactive d'Alyson (une seule sphère, 6 états).
   Created by TwoHumanPixel.

   const orb = new AlysonOrb(canvas, {taille: 260});
   orb.etat('idle' | 'listening' | 'speaking' | 'thinking' | 'loading' | 'standby');
   orb.micro(0..1)        volume RÉEL du micro (envoyé par le moteur pendant l'écoute)
   orb.voix(0..1)         intensité RÉELLE de la voix d'Alyson pendant qu'elle parle
   orb.progression(null | 0..1)   chargement : un vrai pourcentage, sinon null (indéterminé, jamais inventé)
   orb.pause(true|false)  rien n'est dessiné quand l'Orb est caché

   Rendu canvas 2D (léger, sans dépendance), adapté à l'écran (DPR), mouvement réduit si l'utilisateur le demande.
   Le rendu ne contient aucune logique de l'application : il affiche seulement l'état qu'on lui donne.
   ===================================================================================== */
(function () {
  const ROSE = [248, 231, 233], ROSE2 = [235, 203, 209], LUM = [255, 220, 227], BLANC = [255, 247, 248];
  const c = (k, a) => `rgba(${k[0]},${k[1]},${k[2]},${Math.max(0, Math.min(1, a))})`;
  // cible de chaque état : luminosité, coeur, ondes, rubans, anneau, orbite, arcs latéraux, vitesse, respiration
  const CIBLES = {
    idle:      {lum: .62, coeur: .07, ondes: 0,  rubans: 0,   anneau: 0, orbite: 0, arcs: 0,  vit: .45, resp: 1, spir: 0},
    listening: {lum: .92, coeur: .70, ondes: 1,  rubans: 0,   anneau: 0, orbite: 0, arcs: 0,  vit: .8,  resp: .4, spir: 0},
    speaking:  {lum: .86, coeur: .30, ondes: 0,  rubans: .95, anneau: 0, orbite: 0, arcs: .9, vit: 1.25, resp: .2, spir: 0},
    thinking:  {lum: .76, coeur: .5,  ondes: 0,  rubans: 1,   anneau: 0, orbite: 0, arcs: 0,  vit: 1.7, resp: .3, spir: 1},
    loading:   {lum: .62, coeur: .16, ondes: 0,  rubans: 0,   anneau: 1, orbite: 0, arcs: 0,  vit: 1,   resp: .3, spir: 0},
    standby:   {lum: .32, coeur: .02, ondes: 0,  rubans: 0,   anneau: 0, orbite: 1, arcs: 0,  vit: .22, resp: .6, spir: 0},
  };

  class AlysonOrb {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.cx = canvas.getContext('2d');
      this.taille = opts.taille || 240; this.mini = !!opts.mini;
      this._etat = 'idle'; this.p = Object.assign({}, CIBLES.idle);
      this._micro = 0; this._microL = 0; this._voix = 0; this._voixL = 0; this._prog = null; this._progL = 0;
      this._pause = false; this._t = 0; this._dernier = performance.now(); this._ph = 0;
      this.reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._ondes = [];
      this.redim();
      addEventListener('resize', () => this.redim());
      document.addEventListener('visibilitychange', () => this._boucle());
      this._boucle();
    }
    redim() {
      const d = Math.min(devicePixelRatio || 1, 2), r = this.cv.getBoundingClientRect();
      const w = Math.max(10, r.width || this.taille), h = Math.max(10, r.height || this.taille);
      this.cv.width = Math.round(w * d); this.cv.height = Math.round(h * d); this.dpr = d; this.w = w; this.h = h;
    }
    etat(e) { if (CIBLES[e]) { if (e === 'listening' && this._etat !== 'listening') this._ondes = []; this._etat = e; } return this._etat; }
    micro(v) { this._micro = Math.max(0, Math.min(1, +v || 0)); }
    voix(v) { this._voix = Math.max(0, Math.min(1, +v || 0)); }
    progression(v) { this._prog = (v === null || v === undefined) ? null : Math.max(0, Math.min(1, +v)); }
    pause(b) { this._pause = !!b; this._boucle(); }
    _boucle() {
      if (this._raf || this._pause || document.hidden) return;
      const f = now => { this._raf = 0; if (this._pause || document.hidden) return; this._dessiner(now); this._raf = requestAnimationFrame(f); };
      this._raf = requestAnimationFrame(f);
    }

    _dessiner(now) {
      const dt = Math.min(.05, (now - this._dernier) / 1000); this._dernier = now;
      const cible = CIBLES[this._etat], P = this.p, k = 1 - Math.pow(.02, dt);         // transitions douces (~0,6 s)
      for (const n in cible) P[n] += (cible[n] - P[n]) * k;
      this._microL += (this._micro - this._microL) * Math.min(1, dt * 14);
      this._voixL += (this._voix - this._voixL) * Math.min(1, dt * 18);
      if (this._etat !== 'listening') this._micro *= .9;
      if (this._etat !== 'speaking') this._voix *= .9;
      const vit = P.vit * (this.reduit ? .35 : 1);
      this._t += dt * vit; const t = this._t;
      const x = this.cx, D = this.dpr, W = this.w * D, H = this.h * D;
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
      const mic = this._microL, vx = this._voixL;
      const resp = 1 + P.resp * .014 * Math.sin(now / 1000 * 1.15) + mic * .035 + vx * .025;
      const R = Math.min(W, H) * (this.mini ? .40 : .33) * resp, X = W / 2, Y = H * (this.mini ? .5 : .47);
      const lum = P.lum + mic * .35 + vx * .28;

      // reflet au sol
      if (!this.mini) {
        const g = x.createRadialGradient(X, Y + R * 1.32, 0, X, Y + R * 1.32, R * 1.1);
        g.addColorStop(0, c(LUM, .5 * lum)); g.addColorStop(1, c(LUM, 0));
        x.save(); x.translate(X, Y + R * 1.32); x.scale(1, .22); x.translate(-X, -(Y + R * 1.32));
        x.fillStyle = g; x.beginPath(); x.arc(X, Y + R * 1.32, R * 1.1, 0, 6.283); x.fill(); x.restore();
      }
      // halo
      // le halo s'éteint AVANT le bord du canvas (sinon un carré apparaît sur le fond)
      const haloMax = Math.min(R * 1.75, X * .97, Y * .97, (H - Y) * .97);
      const halo = x.createRadialGradient(X, Y, R * .7, X, Y, haloMax);
      halo.addColorStop(0, c(LUM, .30 * lum)); halo.addColorStop(1, c(ROSE2, 0));
      x.save(); x.beginPath(); x.rect(0, 0, W, H); x.arc(X, Y, R * .97, 0, 6.283, true); x.clip('evenodd');   // halo seulement autour, pas à travers le verre
      x.fillStyle = halo; x.fillRect(0, 0, W, H); x.restore();

      // écoute : ondes concentriques, rythmées par la vraie voix de l'utilisateur
      if (P.ondes > .02) {
        if (!this._ondesT || now - this._ondesT > 520 - mic * 260) { this._ondes.push({n: now, a: .35 + mic * .65}); this._ondesT = now; }
        this._ondes = this._ondes.filter(o => now - o.n < 1800);
        x.lineWidth = Math.max(1, R * .016); x.shadowColor = c(LUM, .9); x.shadowBlur = R * .1;
        for (const o of this._ondes) {
          const u = (now - o.n) / 1800, rr = R * (1.06 + u * .44);
          x.strokeStyle = c(LUM, (1 - u) * (1 - u) * .6 * o.a * P.ondes); x.beginPath(); x.arc(X, Y, rr, 0, 6.283); x.stroke();
        }
        x.shadowBlur = 0;
      }
      // parole : arcs latéraux qui battent avec la voix d'Alyson
      if (P.arcs > .02 && !this.mini) {
        x.lineCap = 'round';
        for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
          const rr = R * (1.12 + i * .13 + vx * .05), a0 = (s < 0 ? Math.PI : 0) - .5 + i * .06, a1 = a0 + 1 - i * .12;
          x.lineWidth = R * (.016 - i * .004); x.strokeStyle = c(LUM, P.arcs * (.25 + vx * .65) * (1 - i * .4));
          x.beginPath(); x.arc(X, Y, rr, a0, a1); x.stroke();
        }
      }
      // veille : orbite (moitié arrière avant la sphère)
      const orbite = (devant) => {
        if (P.orbite < .02) return;
        x.save(); x.translate(X, Y); x.rotate(-.32); x.scale(1, .23);
        x.lineWidth = R * .02 / .5; x.strokeStyle = c(LUM, .55 * P.orbite);
        x.shadowColor = c(LUM, .8 * P.orbite); x.shadowBlur = R * .12;
        x.beginPath(); x.ellipse(0, 0, R * 1.42, R * 1.42, 0, devant ? 0 : Math.PI, devant ? Math.PI : 6.283); x.stroke(); x.restore();
      };
      orbite(false);

      // ---- la sphère de verre
      x.save(); x.beginPath(); x.arc(X, Y, R, 0, 6.283); x.clip();
      const corps = x.createRadialGradient(X - R * .12, Y - R * .16, 0, X - R * .05, Y - R * .07, R * 1.07);
      // un seul dégradé régulier, sans creux : sombre au centre, de plus en plus rose vers le bord
      corps.addColorStop(0, 'rgba(18,17,19,.6)'); corps.addColorStop(.6, 'rgba(34,28,32,.62)');
      corps.addColorStop(.86, 'rgba(70,52,60,.6)'); corps.addColorStop(1, c(LUM, .5 * lum + .12));
      x.fillStyle = corps; x.fillRect(X - R, Y - R, R * 2, R * 2);
      // lumière rose qui remonte du bas de la sphère (douce, sans bord)
      const bas = x.createRadialGradient(X, Y + R * .78, 0, X, Y + R * .78, R * .95);
      bas.addColorStop(0, c(LUM, .10 * lum + .02)); bas.addColorStop(1, c(LUM, 0));
      x.fillStyle = bas; x.fillRect(X - R, Y - R, R * 2, R * 2);
      // coeur lumineux
      const cg = x.createRadialGradient(X + R * .06 * P.spir, Y + R * .05, 0, X, Y + R * .03, R * .7);
      const kc = this.mini ? 1.5 : 1;   // en petit, le coeur doit rester lisible
      cg.addColorStop(0, c(LUM, P.coeur * kc * (1 + mic * .7))); cg.addColorStop(.3, c(LUM, P.coeur * kc * .55)); cg.addColorStop(.65, c(ROSE2, P.coeur * .14)); cg.addColorStop(1, c(ROSE, 0));
      x.fillStyle = cg; x.fillRect(X - R, Y - R, R * 2, R * 2);
      // rubans de lumière intérieurs (réflexion : tournent ; parole : s'épaississent avec la voix)
      if (P.rubans > .02) {
        // voiles de lumière : larges bandes floues + un fil lumineux fin au coeur, qui traversent la sphère
        // sans tous passer par le centre (chaque voile a son décalage et sa vitesse)
        x.globalCompositeOperation = 'lighter';
        const nb = this.mini ? 2 : 3 + Math.round(P.spir);
        for (let i = 0; i < nb; i++) {
          const ph = t * (.55 + i * .21) + i * 2.1;
          const dec = (R * (i - (nb - 1) / 2) * .34 + Math.sin(ph * .8) * R * .12) * (1 - P.spir * .85);          // décalage du voile
          const ondu = R * (.42 + .14 * Math.sin(t * .6 + i * 1.3)) * (1 + vx * .5) * (1 + P.spir * .55);
          const ang = (P.spir > .5 ? t * (.42 + i * .09) + i * 1.7 + .5 * Math.sin(t * .3 + i * 2) : (-.55 + Math.sin(ph * .4) * .5 + i * .5) * (1 - P.arcs * .85)), ca = Math.cos(ang), sa = Math.sin(ang);
          const pt = (u, v) => [X + u * ca - (v + dec) * sa, Y + u * sa + (v + dec) * ca];
          const L = R * (1.05 - P.spir * .2) * (1 - P.spir * .28 * ((i * 7) % 3) / 2);
          const p0 = pt(-L, Math.sin(ph) * R * .2), p3 = pt(L, -Math.sin(ph * 1.2) * R * .2);
          const p1 = pt(-R * .35, -ondu * (P.spir > .5 ? 1 : Math.cos(ph * .9))), p2 = pt(R * .35, ondu * (P.spir > .5 ? 1 : Math.sin(ph * 1.1)));
          const force = (.10 + .30 * P.rubans + vx * .45) * (1 - i * .16);
          const trace = () => { x.beginPath(); x.moveTo(p0[0], p0[1]); x.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); };
          x.lineCap = 'round';
          if (!this.mini) { x.filter = `blur(${Math.max(2, R * .05)}px)`; }
          x.lineWidth = R * (.16 + vx * .08 + P.spir * .1); x.strokeStyle = c(ROSE2, force * (.45 + P.spir * .15)); trace(); x.stroke();
          x.filter = this.mini ? 'none' : `blur(${Math.max(1, R * .018)}px)`; x.lineWidth = R * (.05 + P.spir * .05 * (1 + (i % 2))); x.strokeStyle = c(LUM, force * (.7 + P.spir * .2)); trace(); x.stroke();
          x.filter = 'none';
          x.lineWidth = Math.max(1, R * (.008 + vx * .01)); x.strokeStyle = c(BLANC, force * .9); trace(); x.stroke();
        }
        // réflexion : quelques étincelles qui tournent autour d'un coeur décentré
        if (P.spir > .05) {
          for (let k = 0; k < (this.mini ? 4 : 9); k++) {
            const a = t * (.9 + k * .07) + k * .7, rr = R * (.25 + .5 * ((k * 37) % 10) / 10);
            const sx = X + Math.cos(a) * rr + R * .08, sy = Y + Math.sin(a) * rr * .8 - R * .06;
            const sc = .5 + .5 * Math.sin(t * 4 + k * 2);
            x.fillStyle = c(BLANC, P.spir * sc * .9); x.beginPath(); x.arc(sx, sy, Math.max(.8, R * .012 * (1 + sc)), 0, 6.283); x.fill();
          }
        }
        x.globalCompositeOperation = 'source-over';
      }
      // chargement : petit anneau intérieur
      if (P.anneau > .02) {
        x.lineWidth = R * .045; x.strokeStyle = c(LUM, .75 * P.anneau); x.shadowColor = c(LUM, .9); x.shadowBlur = R * .12;
        x.beginPath(); x.arc(X, Y, R * .27, 0, 6.283); x.stroke(); x.shadowBlur = 0;
      }
      x.restore();

      // contour fresnel + lueur
      x.lineWidth = Math.max(1, R * .018);
      const rim = x.createLinearGradient(X - R, Y - R, X + R, Y + R);
      rim.addColorStop(0, c(ROSE2, .5 * lum + .08)); rim.addColorStop(.5, c(LUM, .6 * lum + .1)); rim.addColorStop(1, c(BLANC, .98 * lum + .1));
      x.strokeStyle = rim; x.shadowColor = c(LUM, .85 * lum); x.shadowBlur = R * (.26 + mic * .18 + vx * .12);
      x.beginPath(); x.arc(X, Y, R * .992, 0, 6.283); x.stroke(); x.shadowBlur = 0;
      // reflet spéculaire (haut gauche)
      const sp = x.createRadialGradient(X - R * .42, Y - R * .5, 0, X - R * .42, Y - R * .5, R * .38);
      sp.addColorStop(0, c(BLANC, .12)); sp.addColorStop(1, c(BLANC, 0));
      x.save(); x.beginPath(); x.arc(X, Y, R, 0, 6.283); x.clip(); x.fillStyle = sp; x.fillRect(X - R, Y - R, R * 2, R * 2);
      x.lineWidth = R * .022; x.lineCap = 'round'; x.strokeStyle = c(BLANC, .38); x.filter = this.mini ? 'none' : `blur(${Math.max(1, R * .006)}px)`;
      x.beginPath(); x.arc(X, Y, R * .84, Math.PI * 1.1, Math.PI * 1.3); x.stroke(); x.filter = 'none'; x.restore();

      orbite(true);
      // chargement : arc qui tourne autour (vrai pourcentage si connu)
      if (P.anneau > .02) {
        x.lineWidth = Math.max(1.5, R * .03); x.lineCap = 'round'; x.strokeStyle = c(LUM, .85 * P.anneau);
        x.shadowColor = c(LUM, .9); x.shadowBlur = R * .15;
        x.beginPath();
        if (this._prog === null) { const a = t * 2.4; x.arc(X, Y, R * 1.1, a, a + 2.1); }
        else { this._progL += (this._prog - this._progL) * .2; x.arc(X, Y, R * 1.1, -Math.PI / 2, -Math.PI / 2 + this._progL * 6.283); }
        x.stroke(); x.shadowBlur = 0;
      }
    }
  }
  window.AlysonOrb = AlysonOrb;
})();
