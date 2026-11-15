/* =====================================================================================
   ORB « vivant » d'Alyson (WebGL, rendu par la carte graphique).
   Plasma lumineux qui coule à l'intérieur, bord liquide qui ondule, anneau de particules.
   Même façon de s'en servir que l'ancien Orb (orb.js), qui reste le secours sans WebGL :
     const orb = new AlysonOrb(canvas, {taille, mini});
     orb.etat('idle'|'listening'|'speaking'|'thinking'|'loading'|'standby'); orb.micro(0..1); orb.voix(0..1);
     orb.progression(null|0..1); orb.pause(bool)
   Il ne montre que des signaux réels (micro, voix) : rien n'est simulé ici.
   ===================================================================================== */
(function () {
  const Ancien = window.AlysonOrb;                       // rendu 2D d'avant : secours
  // cible de chaque état (transitions douces entre elles)
  const CIBLES = {
    //          lumière  vitesse  tourbillon  ondes  anneau-part.  chargement  veille  coeur
    idle:      {lum: .62, vit: .32, tour: .15, ondes: 0, part: .35, charge: 0, veille: 0, coeur: .35},
    listening: {lum: .95, vit: .55, tour: .2,  ondes: 1, part: .8,  charge: 0, veille: 0, coeur: .85},
    speaking:  {lum: 1.0, vit: .8,  tour: .3,  ondes: 0, part: .6,  charge: 0, veille: 0, coeur: .7},
    thinking:  {lum: .85, vit: 1.1, tour: 1,   ondes: 0, part: 1,   charge: 0, veille: 0, coeur: .6},
    loading:   {lum: .6,  vit: .5,  tour: .4,  ondes: 0, part: .3,  charge: 1, veille: 0, coeur: .4},
    standby:   {lum: .28, vit: .12, tour: .1,  ondes: 0, part: .15, charge: 0, veille: 1, coeur: .1},
  };

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 uRes; uniform float uT, uLum, uTour, uOndes, uPart, uCharge, uVeille, uCoeur, uMic, uVoix, uProg, uMini, uOnde0;
// --- bruit (simplex 3D, Ashima) ---
vec4 permute(vec4 x){return mod(((x*34.)+1.)*x,289.);}
vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
 vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
 vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=mod(i,289.);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 float n_=1./7.;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
 return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float f=0.,a=.55;for(int i=0;i<3;i++){f+=a*snoise(p);p*=1.9;a*=.45;}return f;}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

void main(){
  float S=min(uRes.x,uRes.y);
  vec2 p=(gl_FragCoord.xy-.5*uRes)/(S*(uMini>.5?.40:.30));
  p.y+=uMini>.5?0.:.08;
  float r=length(p), ang=atan(p.y,p.x), t=uT;
  // palette officielle (rose poudré, rose lumineux, blanc rosé) sur fond profond
  vec3 ROSE=vec3(.973,.906,.914), LUMI=vec3(1.,.863,.89), PROF=vec3(.16,.06,.11), CHAUD=vec3(.96,.55,.72), SOIE=vec3(1.,.8,.87);

  // bord liquide : il ondule doucement, plus fort avec la vraie voix / le vrai micro
  float bord=1.+.035*snoise(vec3(cos(ang)*1.4,sin(ang)*1.4,t*.6))+(.05*uVoix+.035*uMic)*sin(ang*5.+t*4.)*snoise(vec3(cos(ang)*1.2,sin(ang)*1.2,t+1.));
  float dedans=smoothstep(bord+.012,bord-.012,r);

  // --- plasma intérieur : bruit déformé par lui-même (domain warping) = matière qui coule
  vec2 q=p*rot(uTour*t*.35+r*uTour*1.6);              // réflexion : la matière s'enroule
  vec3 P=vec3(q*.75,t*.18);
  vec2 w=vec2(fbm(P+vec3(0.,0.,t*.08)),fbm(P+vec3(5.2,1.3,-t*.08)));
  float n=fbm(vec3(q*.85+w*1.25,t*.22));
  // soie : quelques larges rubans de lumière lisses qui ondulent (pas de petits détails)
  float veines=exp(-pow(n*6.,2.))+.6*exp(-pow((n-.34)*7.,2.))+.4*exp(-pow((n+.36)*7.,2.));
  float bloom=exp(-pow(n*2.6,2.))*.3;
  float nappes=smoothstep(.0,.8,n)*.35;               // voiles doux
  float sph=sqrt(max(0.,1.-r*r/(bord*bord)));          // volume de la sphère
  float fresnel=pow(1.-sph,2.2);
  vec3 c=vec3(0.);
  c+=PROF*(.35+.45*sph)*dedans*(.5+uLum*.5);
  c+=CHAUD*nappes*uLum*.45*dedans*(.3+.7*fresnel);
  c+=mix(CHAUD,SOIE,veines*.7)*veines*(uLum*.9+1.3*uVoix+.9*uMic)*dedans*(.6+.4*sph);
  c+=CHAUD*bloom*(uLum*.5+.7*uVoix+.4*uMic)*dedans;
  // coeur : lueur douce au centre (forte quand elle écoute)
  float coeur=exp(-r*r*6.)*uCoeur*(1.+uMic*1.2+uVoix*.8);
  c+=mix(LUMI,vec3(1.),.4)*coeur*1.1*dedans;
  // parole : vagues horizontales qui traversent la sphère, amplitude = vraie voix
  float vague=exp(-pow((p.y-.18*sin(p.x*3.+t*5.)*(.4+uVoix))*7.,2.));
  c+=LUMI*vague*uVoix*1.3*dedans*(1.-r*.6);

  // --- liseré + halo : la lumière vit sur le bord
  float liser=exp(-abs(r-bord)*38.)*(.7+.5*snoise(vec3(cos(ang)*2.,sin(ang)*2.,t*.8+3.)));
  c+=mix(LUMI,vec3(1.),.5)*liser*(.3+1.4*uLum+uVoix);
  float halo=exp(-max(r-bord,0.)*2.4)*(1.-dedans)+exp(-max(r-bord,0.)*9.)*.8*(1.-dedans);
  c+=CHAUD*halo*(.05+.7*uLum+.5*uMic+.45*uVoix);
  // reflet : croissant de lumière en haut à gauche
  vec2 rp=p-vec2(-.34,.42);
  c+=vec3(1.)*exp(-pow(length(rp*vec2(1.,1.6))-.28,2.)*900.)*smoothstep(.0,.3,-rp.x*rp.y+.05)*.35*dedans;

  // --- écoute : ondes qui partent du bord, rythmées par la vraie voix de l'utilisateur
  float o=0.;
  for(int k=0;k<3;k++){float ph=fract(t*.55+float(k)/3.);float rr=bord+ph*.75;
    o+=exp(-abs(r-rr)*70.)*(1.-ph)*(1.-ph);}
  c+=LUMI*o*uOndes*(.25+uMic*1.3);

  // --- anneau de particules (façon Jarvis) : poussière lumineuse qui tourne autour
  if(uPart>.01){
    vec2 pp=p*rot(t*.05*(1.+uTour*2.));
    float rr=length(pp), aa=atan(pp.y,pp.x);
    vec2 cell=vec2(floor((aa+3.1416)*36.),floor(rr*44.));
    float hsh=h21(cell);
    float anneau=exp(-pow((rr-1.32-.08*snoise(vec3(cos(aa)*2.,sin(aa)*2.,t*.3+7.)))*4.,2.));
    float etoile=step(.72,hsh)*anneau*(.55+.45*sin(t*3.+hsh*40.));
    vec2 f=fract(vec2((aa+3.1416)*36.,rr*44.))-.5;
    c+=LUMI*etoile*smoothstep(.42,.0,length(f))*uPart*(1.2+1.5*uMic+uVoix)*(1.-dedans);
  }
  // --- chargement : arc lumineux qui tourne (vrai pourcentage si on l'a, sinon indéterminé)
  if(uCharge>.01){
    float aN=mod(ang+1.5708,6.2832)/6.2832;
    float arc=uProg>=0.?step(1.-uProg,1.-aN):smoothstep(.0,.35,fract(aN+t*.45))*step(fract(aN+t*.45),.35)*3.;
    c+=LUMI*exp(-abs(r-1.16)*90.)*min(arc,1.)*uCharge;
  }
  // --- veille : fine orbite inclinée, lente
  if(uVeille>.01){
    vec2 e=p*rot(.32); float orb=abs(length(e*vec2(1.,3.2))-1.45);
    c+=ROSE*exp(-orb*60.)*.45*uVeille*(.5+.5*sin(atan(e.y*3.2,e.x)+t*.8));
  }
  // reflet au sol
  if(uMini<.5){vec2 s=(p-vec2(0.,-1.42))*vec2(1.,5.);c+=CHAUD*exp(-dot(s,s)*1.2)*.16*uLum;}

  c=1.-exp(-c*1.7);                                   // tonalité douce : jamais brûlé
  float a=clamp(max(c.r,max(c.g,c.b))*1.15,0.,1.);
  gl_FragColor=vec4(c,a);
}`;

  function OrbGL(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', {premultipliedAlpha: false, alpha: true, antialias: true});
    if (!gl) throw new Error('pas de WebGL');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uT', 'uLum', 'uTour', 'uOndes', 'uPart', 'uCharge', 'uVeille', 'uCoeur', 'uMic', 'uVoix', 'uProg', 'uMini']
      .forEach(n => U[n] = gl.getUniformLocation(pr, n));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.cv = canvas; this.gl = gl; this.U = U; this.mini = !!opts.mini; this.taille = opts.taille || 240;
    this._etat = 'idle'; this.p = Object.assign({}, CIBLES.idle);
    this._micro = 0; this._microL = 0; this._voix = 0; this._voixL = 0; this._prog = null;
    this._pause = false; this._t = 0; this._dernier = performance.now(); this._raf = 0;
    this.reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.redim(); addEventListener('resize', () => this.redim());
    document.addEventListener('visibilitychange', () => this._boucle());
    this._boucle();
  }
  OrbGL.prototype = {
    redim() {
      const d = Math.min(devicePixelRatio || 1, this.mini ? 2 : 1.5), r = this.cv.getBoundingClientRect();
      const w = Math.max(10, r.width || this.taille), h = Math.max(10, r.height || this.taille);
      this.cv.width = Math.round(w * d); this.cv.height = Math.round(h * d); this.gl.viewport(0, 0, this.cv.width, this.cv.height);
    },
    etat(e) { if (CIBLES[e]) this._etat = e; return this._etat; },
    micro(v) { this._micro = Math.max(0, Math.min(1, +v || 0)); },
    voix(v) { this._voix = Math.max(0, Math.min(1, +v || 0)); },
    progression(v) { this._prog = (v === null || v === undefined) ? null : Math.max(0, Math.min(1, +v)); },
    pause(b) { this._pause = !!b; this._boucle(); },
    /** nombre de pixels réellement allumés (sert aux tests : preuve que l'Orb est dessiné) */
    couverture() { this._dessiner(performance.now()); const gl = this.gl, w = this.cv.width, h = this.cv.height, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 20) n++; return n; },
    _boucle() {
      if (this._raf || this._pause || document.hidden) return;
      const f = now => { this._raf = 0; if (this._pause || document.hidden) return; this._dessiner(now); this._raf = requestAnimationFrame(f); };
      this._raf = requestAnimationFrame(f);
    },
    _dessiner(now) {
      const dt = Math.min(.05, (now - this._dernier) / 1000); this._dernier = now;
      const C = CIBLES[this._etat], P = this.p, k = 1 - Math.pow(.03, dt);
      for (const n in C) P[n] += (C[n] - P[n]) * k;
      this._microL += (this._micro - this._microL) * Math.min(1, dt * 14);
      this._voixL += (this._voix - this._voixL) * Math.min(1, dt * 18);
      if (this._etat !== 'listening') this._micro *= .9;
      if (this._etat !== 'speaking') this._voix *= .9;
      this._t += dt * P.vit * (this.reduit ? .35 : 1);
      const gl = this.gl, U = this.U;
      gl.uniform2f(U.uRes, this.cv.width, this.cv.height); gl.uniform1f(U.uT, this._t + 7.3);
      gl.uniform1f(U.uLum, P.lum); gl.uniform1f(U.uTour, P.tour); gl.uniform1f(U.uOndes, P.ondes); gl.uniform1f(U.uPart, P.part);
      gl.uniform1f(U.uCharge, P.charge); gl.uniform1f(U.uVeille, P.veille); gl.uniform1f(U.uCoeur, P.coeur);
      gl.uniform1f(U.uMic, this._microL); gl.uniform1f(U.uVoix, this._voixL);
      gl.uniform1f(U.uProg, this._prog === null ? -1 : this._prog); gl.uniform1f(U.uMini, this.mini ? 1 : 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };

  // même nom qu'avant : les écrans n'ont rien à changer. Sans WebGL, l'ancien Orb prend le relais.
  window.AlysonOrb = function (canvas, opts) {
    try { return new OrbGL(canvas, opts); }
    catch (e) { console.warn('Orb WebGL indisponible, Orb 2D utilisé :', e.message); return new Ancien(canvas, opts); }
  };
  window.AlysonOrb.WebGL = OrbGL;
  if (Ancien) Ancien.prototype.couverture = function () { this._dessiner(performance.now()); const c = this.cv, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; };
})();
