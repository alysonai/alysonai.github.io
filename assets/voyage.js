/* =====================================================================================
   ALYSON · LE VOYAGE. Une seule scène 3D : on défile, la caméra entre dans Alyson.
   Orb -> à l'intérieur -> à gauche : elle écoute -> à droite : elle agit -> en haut : sa mémoire
   -> ses cerveaux -> la métamorphose (Caterpillar, Crysalis, Butterfly) -> sécurité -> sortie.
   Three.js (MIT). Couleurs et police : la DA d'Alyson.
   ===================================================================================== */
import * as THREE from "three";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {SVGLoader} from "three/addons/loaders/SVGLoader.js";

const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
const petit = innerWidth < 760;
const debout = innerHeight > innerWidth * 1.05;            // téléphone ou tablette à la verticale : la scène en haut, le texte en bas
const ROSE = new THREE.Color("#F8E7E9"), LUEUR = new THREE.Color("#FFDCE3"), NEON = new THREE.Color("#F49BC1"), NUIT = new THREE.Color("#101112");

// ---------- moteur
const canvas = document.getElementById("scene3d");
const renderer = new THREE.WebGLRenderer({canvas, antialias: !petit, powerPreference: "high-performance"});
renderer.setPixelRatio(Math.min(petit ? 1.4 : 1.75, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = NUIT.clone();
scene.fog = new THREE.FogExp2(NUIT, .048);
const camera = new THREE.PerspectiveCamera(debout ? 62 : 48, innerWidth / innerHeight, .05, 400);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.add(new THREE.AmbientLight(0xffe6ee, .35));
const lumiere = new THREE.PointLight(0xffc4da, 5, 24, 1.8);
scene.add(lumiere);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .5, .55, .55);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- matériaux
const verre = (teinte = "#F8E7E9", em = .3) => new THREE.MeshStandardMaterial({     // la matière de l'appli : pétale doux qui luit
  color: "#EFC3CF", emissive: new THREE.Color("#F08BB4"), emissiveIntensity: .02 + em * .1, roughness: .5, metalness: 0, envMapIntensity: .35,
});
const neon = (c = LUEUR, o = 1) => new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false});
const liste = []; let groupe = null;                     // animations, chacune rattachée à sa scène (groupe)
const anim = {push: f => liste.push({f, g: groupe})};

// ---------- texture « point doux » pour toutes les particules
const pointDoux = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,220,230,.8)"); r.addColorStop(1, "rgba(255,200,220,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function poussiere(n, boite, taille, couleur = 0xffdce3, opacite = .9) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = boite.x(); p[i * 3 + 1] = boite.y(); p[i * 3 + 2] = boite.z(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({size: taille, map: pointDoux, color: couleur, transparent: true, opacity: opacite,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true}));
}
const hasard = (a, b) => a + Math.random() * (b - a);

// ---------- l'univers : poussière rose tout le long du voyage
const univers = poussiere(petit ? 1400 : 3000, {x: () => hasard(-60, 60), y: () => hasard(-30, 40), z: () => hasard(-230, 30)}, .12, 0xffdce3, .75);
scene.add(univers);

// =====================================================================================
// 1. L'ORB : sa présence (sphère de plasma, bord lumineux, anneau de particules)
// =====================================================================================
groupe = null; const orbe = new THREE.Group(); groupe = orbe; scene.add(orbe);
const orbeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: {t: {value: 0}, dedans: {value: 0}},
  vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV;
    void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; vP=position; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float t; uniform float dedans; varying vec3 vN; varying vec3 vP; varying vec3 vV;
    float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
    float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
    void main(){
      float fres=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4);
      vec3 q=vP*1.25+vec3(0.,t*.25,t*.12);
      float f=fbm(q+fbm(q*1.7+t*.15));
      float veines=smoothstep(.48,.62,f)*smoothstep(.75,.6,f);
      vec3 rose=vec3(.97,.91,.92), neon=vec3(.96,.6,.76);
      vec3 col=mix(neon,rose,f*.55)*(.08+veines*.9)+mix(rose,neon,.6)*fres*.75;
      float a=(.10+veines*.55+fres*.75)*(1.-dedans*.6);
      gl_FragColor=vec4(col*a,a);
    }`,
});
const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.2, petit ? 64 : 128, petit ? 64 : 128), orbeMat);
orbe.add(sphere);
const coeur = new THREE.Mesh(new THREE.SphereGeometry(.38, 32, 32), neon(LUEUR, .55)); orbe.add(coeur);
const halo = poussiere(petit ? 500 : 1100, (() => { let a = 0, r = 0; return {
  x: () => (a = Math.random() * 6.283, r = hasard(2.6, 3.4), Math.cos(a) * r), y: () => hasard(-.12, .12), z: () => Math.sin(a) * r}; })(), .05, 0xffd6e6, .9);
halo.rotation.x = .35; orbe.add(halo);
anim.push(t => { orbeMat.uniforms.t.value = t; halo.rotation.y = t * .08; coeur.scale.setScalar(1 + Math.sin(t * 2) * .06); });

// =====================================================================================
// 2. À L'INTÉRIEUR : un tunnel de lumière (toujours animé) (ses pensées) qui mène plus loin
// =====================================================================================
groupe = null; const tunnel = poussiere(petit ? 1000 : 2200, (() => { let a = 0; return {
  x: () => (a = Math.random() * 6.283, Math.cos(a) * hasard(2.2, 4.5)), y: () => Math.sin(a) * hasard(2.2, 4.5), z: () => hasard(-30, -2)}; })(), .07, 0xffc6dc, .85);
scene.add(tunnel);
for (let i = 0; i < 9; i++) {                             // anneaux de lumière tout le long
  const r = new THREE.Mesh(new THREE.TorusGeometry(3.6, .012, 8, 160), neon(NEON, .55));
  r.position.z = -4 - i * 3.2; scene.add(r);
  anim.push(t => { r.rotation.z = t * .1 + i; r.material.opacity = .35 + .25 * Math.sin(t * 1.5 - i * .7); });
}

// =====================================================================================
// 3. À GAUCHE : ELLE T'ÉCOUTE (ondes de voix concentriques + égaliseur circulaire)
// =====================================================================================
groupe = null; const ecoute = new THREE.Group(); groupe = ecoute; ecoute.position.set(-16, 0, -40); ecoute.rotation.y = Math.PI / 2.4; scene.add(ecoute);
const ondes = [];
for (let i = 0; i < 7; i++) {
  const o = new THREE.Mesh(new THREE.TorusGeometry(1, .018, 8, 200), neon(LUEUR, .8)); ecoute.add(o); ondes.push(o);
}
const barres = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, 1, .022), new THREE.MeshBasicMaterial({color: NEON, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false}), 144);
ecoute.add(barres);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), AXE_Z = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3();
anim.push(t => {
  ondes.forEach((o, i) => { const k = ((t * .35 + i / ondes.length) % 1); o.scale.setScalar(1 + k * 5); o.material.opacity = (1 - k) * .8; });
  for (let i = 0; i < 144; i++) {
    const a = i / 144 * 6.283, h = .3 + Math.abs(Math.sin(t * 3 + i * .45) * Math.sin(t * 1.3 + i * .13)) * 1.8;
    v.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0); q.setFromAxisAngle(AXE_Z, a - Math.PI / 2);
    s3.set(1, h, 1); m4.compose(v.addScaledVector(dir.set(Math.cos(a), Math.sin(a), 0), h / 2), q, s3);
    barres.setMatrixAt(i, m4);
  }
  barres.instanceMatrix.needsUpdate = true;
});

// =====================================================================================
// 4. À DROITE : ELLE AGIT (fenêtres de verre en arc, une souris-papillon qui passe de l'une à l'autre)
// =====================================================================================
if (!CanvasRenderingContext2D.prototype.roundRect) {        // vieux navigateurs : un rectangle simple
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}
const redessins = [];                                    // les textes dessinés en Bodoni sont redessinés quand la police est prête
function ecranTexture(titre, lignes) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 320;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const dessiner = () => { g.clearRect(0, 0, 512, 320);
  const fond = g.createLinearGradient(0, 0, 512, 320); fond.addColorStop(0, "rgba(40,34,38,.88)"); fond.addColorStop(1, "rgba(26,24,27,.88)");
  g.fillStyle = fond; g.beginPath(); g.roundRect(0, 0, 512, 320, 26); g.fill();
  g.strokeStyle = "rgba(248,231,233,.35)"; g.lineWidth = 2; g.stroke();
  ["#F49BC1", "#EBCBD1", "#F8E7E9"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(30 + i * 22, 28, 6, 0, 6.3); g.fill(); });
  g.fillStyle = "#FAF7F7"; g.font = "500 26px 'Bodoni Moda', Georgia, serif"; g.fillText(titre[enAnglais() ? 1 : 0], 30, 88, 450);
  g.fillStyle = "rgba(240,232,235,.95)"; g.font = "24px 'Hanken Grotesk', sans-serif";
  lignes.forEach((l, i) => g.fillText(l[enAnglais() ? 1 : 0], 30, 140 + i * 36));
  tex.needsUpdate = true; };
  dessiner(); redessins.push(dessiner); return tex;
}
groupe = null; const agit = new THREE.Group(); groupe = agit; agit.position.set(20, 1, -62); agit.rotation.y = -Math.PI / 2.6; scene.add(agit);
const enAnglais = () => document.documentElement.lang === "en";
const FENETRES = [[["Musique", "Music"], [["Ta playlist du matin", "Your morning playlist"], ["Volume : 40 %", "Volume: 40%"]]],
  [["Navigateur", "Browser"], [["Défile pour moi…", "Scroll for me…"], ["Stop.", "Stop."]]],
  [["Notes", "Notes"], [["Idée de reel", "Reel idea"], ["Écrite à la voix", "Written by voice"]]],
  [["Réglages", "Settings"], [["Luminosité : 70 %", "Brightness: 70%"], ["Mode concentration", "Focus mode"]]],
  [["Messages", "Messages"], [["Brouillon prêt", "Draft ready"], ["Tu envoies quand tu veux", "Send it when you want"]]]];
const panneaux = FENETRES.map(([t, l], i) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({map: ecranTexture(t, l), transparent: true, opacity: .96, side: THREE.DoubleSide, depthWrite: false}));
  const a = (i - 2) * .34; m.position.set(Math.sin(a) * 5.4, (i % 2 ? .95 : -.65), -Math.cos(a) * 5.4 + 7); m.lookAt(0, 0, 7);
  const cadre = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 2.25), neon(NEON, .18)); cadre.position.z = -.02; m.add(cadre);
  agit.add(m); return m;
});
anim.push(t => panneaux.forEach((m, i) => { m.position.y += Math.sin(t * .8 + i) * .002; }));

// =====================================================================================
// LE PAPILLON (ailes officielles en verre) : on s'en sert comme curseur, comme créature, et à la sortie
// =====================================================================================
const ailesSVG = new SVGLoader().parse(`<svg viewBox="0 0 952 838"><path d="${window.PAPILLON.d}"/></svg>`);
const formes = ailesSVG.paths.flatMap(p => SVGLoader.createShapes(p));
const aileDoux = new THREE.MeshStandardMaterial({color: "#F6DDE3", emissive: new THREE.Color("#F4B3C8"), emissiveIntensity: .72, roughness: .5, metalness: 0, side: THREE.DoubleSide});
function papillon(echelle = 1, mat) {
  const g = new THREE.Group();
  const geo = s => {
    const e = new THREE.ExtrudeGeometry(s, {depth: 3, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 3, curveSegments: 32});
    e.translate(-476, -419, 0); e.scale(.0042 * echelle, -.0042 * echelle, .0042 * echelle); return e;
  };
  const centre = s => s.getPoints().reduce((a, p) => a + p.x, 0) / s.getPoints().length;
  const [droite, gauche] = formes.slice().sort((a, b) => centre(b) - centre(a));
  const pivot = (s, signe) => {
    const p = new THREE.Group(), m = new THREE.Mesh(geo(s), mat || aileDoux);
    p.add(m); p.userData.signe = signe; g.add(p); return p;
  };
  g.userData.ailes = [pivot(gauche, 1), pivot(droite, -1)];

  g.userData.battre = (t, ampleur = 1) => g.userData.ailes.forEach(p => (p.rotation.y = p.userData.signe * (.15 + Math.abs(Math.sin(t)) * .9 * ampleur)));
  return g;
}
const curseur = papillon(.35); agit.add(curseur);
anim.push(t => {
  const k = (t * .25) % FENETRES.length, i = Math.floor(k), f = k - i, a = panneaux[i].position, b = panneaux[(i + 1) % panneaux.length].position;
  const e = f * f * (3 - 2 * f);
  curseur.position.lerpVectors(a, b, e); curseur.position.y += Math.sin(e * Math.PI) * 1.4 + .4; curseur.position.z += .4;
  curseur.lookAt(0, 0, 7); curseur.userData.battre(t * 7, .8);
});

// =====================================================================================
// 5. EN HAUT : SA MÉMOIRE (une constellation de notes reliées, comme ton Brain)
// =====================================================================================
groupe = null; const memoire = new THREE.Group(); groupe = memoire; memoire.position.set(0, 13, -88); scene.add(memoire);
const NOTES = petit ? 90 : 160, pts = [];
for (let i = 0; i < NOTES; i++) { const u = Math.random() * 6.283, w = Math.acos(hasard(-1, 1)), r = hasard(1.6, 5);
  pts.push(new THREE.Vector3(Math.sin(w) * Math.cos(u) * r, Math.cos(w) * r * .7, Math.sin(w) * Math.sin(u) * r)); }
const noeuds = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 12, 12), new THREE.MeshBasicMaterial({color: LUEUR}), NOTES);
pts.forEach((p, i) => { m4.makeScale(1, 1, 1).setPosition(p); if (i % 11 === 0) m4.scale(new THREE.Vector3(2.6, 2.6, 2.6)); noeuds.setMatrixAt(i, m4); });
memoire.add(noeuds);
const liens = [];
pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && a.distanceTo(b) < 1.9) liens.push(a.x, a.y, a.z, b.x, b.y, b.z); }));
const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(liens, 3));
memoire.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color: NEON, transparent: true, opacity: .28, blending: THREE.AdditiveBlending})));
anim.push(t => { memoire.rotation.y = t * .05; memoire.rotation.x = Math.sin(t * .1) * .1; });

// =====================================================================================
// 6. SES CERVEAUX (des sphères de verre en orbite autour de la sienne, chacune avec son nom)
// =====================================================================================
function etiquette(texte, taille = 64) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = `400 ${taille}px 'Bodoni Moda', Georgia, serif`; c.width = Math.ceil(g.measureText(texte).width) + 40; c.height = taille * 1.6;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const dessiner = () => { g.clearRect(0, 0, c.width, c.height);
    g.font = `400 ${taille}px 'Bodoni Moda', Georgia, serif`; g.fillStyle = "#FAF7F7"; g.textBaseline = "middle"; g.fillText(texte, 20, c.height / 2); tex.needsUpdate = true; };
  dessiner(); redessins.push(dessiner);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, transparent: true, depthWrite: false}));
  const h = petit ? .34 : .55; sp.scale.set(c.width / c.height * h, h, 1); return sp;
}
groupe = null; const cerveaux = new THREE.Group(); groupe = cerveaux; cerveaux.position.set(-12, -5, -114); scene.add(cerveaux);
const centreC = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 48), verre("#F8E7E9", .6)); cerveaux.add(centreC);
const NOMS = ["Claude", "ChatGPT", "Gemini", "Grok", "DeepSeek", "Qwen", "Local"];
const orbites = NOMS.map((n, i) => {
  const o = new THREE.Group(); o.rotation.set(hasard(-.5, .5), 0, hasard(-.4, .4));
  const b = new THREE.Mesh(new THREE.SphereGeometry(.42, 32, 32), verre(i === 6 ? "#FFE3EE" : "#F6A9C8", .35));
  const e = etiquette(n); e.position.y = .85; b.add(e);
  const r = 2.5 + (i % 3) * .75; b.position.x = r; o.add(b);
  const trace = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 220), neon(NEON, .3)); trace.rotation.x = Math.PI / 2; o.add(trace);
  cerveaux.add(o); return {o, v: .25 + i * .04, d: i};
});
anim.push(t => orbites.forEach(({o, v, d}) => (o.rotation.y = t * v + d)));

// =====================================================================================
// 7. LA MÉTAMORPHOSE : Caterpillar, Crysalis, Butterfly, en verre rose lumineux
// =====================================================================================
groupe = null; const meta = new THREE.Group(); groupe = meta; meta.position.set(0, 0, -142); scene.add(meta);
const sol = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({map: pointDoux, color: 0xff9cc4, transparent: true, opacity: .035, depthWrite: false, blending: THREE.AdditiveBlending}));
sol.rotation.x = -Math.PI / 2; sol.position.y = -1.6; meta.add(sol);
// Caterpillar : perles de verre + deux antennes
const chenille = new THREE.Group(); chenille.position.set(-7.5, 0, 0); meta.add(chenille);
const perles = [];
for (let i = 0; i < 8; i++) {
  const r = i === 7 ? .78 : .46 + i * .035;
  const p = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), verre());
  p.userData.r = r; chenille.add(p); perles.push(p);
}
const antennes = [-1, 1].map(c => {
  const g = new THREE.Group(), v0 = new THREE.Vector3(0, 0, 0), v1 = new THREE.Vector3(.05, .6, c * .1), v2 = new THREE.Vector3(.35, .9, c * .35);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v0, v1, v2), 20, .035, 8), verre("#F9BCD3", .5)));
  const bout = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 20), verre("#FFE3EE", .8)); bout.position.copy(v2); g.add(bout);
  chenille.add(g); return {g, c};
});
anim.push(t => {
  let tete;
  perles.forEach((p, i) => { const x = -3 + i * .62, up = Math.max(0, Math.sin(t * 2.6 - i * .75)) * .38;
    p.position.set(x, -1.6 + p.userData.r + up, Math.sin(i * .5 + t) * .08); if (i === 7) tete = p.position; });
  antennes.forEach(({g, c}) => {
    g.position.copy(tete); g.position.x += .05; g.position.y += .6; g.position.z += c * .22;
    g.rotation.z = Math.sin(t * 2.2 + c) * .12; g.rotation.x = Math.sin(t * 1.7) * .06 * c;
  });
});
// Crysalis : coquille en spirale (tour) + bandes en hélice + anneau de lumière en orbite avec deux étincelles
const chrysalide = new THREE.Group(); chrysalide.scale.setScalar(1.3); chrysalide.position.y = .5; meta.add(chrysalide);
const profil = []; for (let i = 0; i <= 40; i++) { const y = i / 40; profil.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(y, .85)) * 1.15 * (1 - y * .25) + .001, y * 3.6 - 1.6)); }
chrysalide.add(new THREE.Mesh(new THREE.LatheGeometry(profil, 96), verre("#F6A9C8", .3)));
for (let b = 0; b < 3; b++) {
  const pts = []; for (let i = 0; i <= 120; i++) { const k = i / 120, y = k * 3.3 - 1.5, prof = Math.sin(Math.PI * Math.pow((y + 1.6) / 3.6, .85)) * 1.15 * (1 - (y + 1.6) / 3.6 * .25);
    const a = k * 6.283 * 1.6 + b * 2.09; pts.push(new THREE.Vector3(Math.cos(a) * (prof + .03), y, Math.sin(a) * (prof + .03))); }
  chrysalide.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, .07, 10), verre("#FFD3E3", .55)));
}
const anneau = new THREE.Mesh(new THREE.TorusGeometry(2.6, .014, 8, 260), neon(LUEUR, .9)); anneau.rotation.set(Math.PI / 2 - .3, .25, 0); chrysalide.add(anneau);
const etincelles = [0, Math.PI].map(d => { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: pointDoux, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false}));
  s.scale.setScalar(.6); anneau.add(s); return {s, d}; });
anim.push(t => { chrysalide.rotation.y = t * .25; etincelles.forEach(({s, d}) => s.position.set(Math.cos(t * .9 + d) * 2.6, Math.sin(t * .9 + d) * 2.6, 0)); });
// Butterfly : les ailes officielles, en verre néon
const aileMat = aileDoux;
const grand = papillon(1.05, aileMat); grand.position.set(8, .4, 0); meta.add(grand);
anim.push(t => { grand.userData.battre(t * 1.6, .7); grand.position.y = .3 + Math.sin(t * 1.2) * .2; });

// =====================================================================================
// 8. SÉCURITÉ : un halo calme ; « stop d'urgence » fige tout le voyage
// =====================================================================================
groupe = null; const securite = new THREE.Group(); groupe = securite; securite.position.set(0, 0, -172); scene.add(securite);
for (let i = 0; i < 3; i++) {
  const h = new THREE.Mesh(new THREE.TorusGeometry(2.5 + i * .9, .02, 8, 200), neon(i ? NEON : LUEUR, .7 - i * .18));
  securite.add(h); anim.push(t => { h.rotation.x = t * (.1 + i * .05); h.rotation.y = t * (.13 - i * .03); });
}
const bouclier = new THREE.Mesh(new THREE.SphereGeometry(1.4, 64, 64), verre("#F8E7E9", .9)); securite.add(bouclier);

// =====================================================================================
// 9. SORTIE : le papillon s'envole vers toi
// =====================================================================================
const envol = papillon(1.6, aileMat); groupe = envol; envol.position.set(0, 0, -200); scene.add(envol);
anim.push(t => { envol.userData.battre(t * 4.5, 1); envol.rotation.z = Math.sin(t) * .08; envol.position.y = Math.sin(t * 1.3) * .3; });

// =====================================================================================
// LA CAMÉRA : un chemin à travers tout (on entre, on tourne à gauche, à droite, on monte, on revient au centre)
// =====================================================================================
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CHEMIN = [  // [progression, position caméra, point regardé]
  [0.00, V(-4.6, .5, 10.5), V(-2.4, .2, 0)],         // devant l'Orb : l'Orb à droite, le texte à gauche
  [0.07, V(-1.4, .2, 6.5), V(-.4, 0, 0)],
  [0.13, V(0, 0, 1.2), V(0, 0, -6)],                // on entre dans Alyson
  [0.20, V(0, 0, -18), V(0, 0, -34)],               // le tunnel de ses pensées
  [0.28, V(-3, .3, -35), V(-16, 0, -45)],           // à gauche : elle écoute (la scène à gauche, le texte à droite)
  [0.33, V(-4.5, .3, -38), V(-16, 0, -45)],
  [0.41, V(5, 1, -55), V(20, 1, -68.6)],              // à droite : elle agit (la scène à droite, le texte à gauche)
  [0.46, V(7, 1.2, -57), V(20, 1, -68.6)],
  [0.53, V(2, 8, -76), V(-3.6, 12, -88)],             // on monte : sa mémoire (à droite, le texte à gauche)
  [0.58, V(0, 11, -76.5), V(-4, 12.6, -88)],
  [0.65, V(-3, -2, -100), V(-8.2, -5, -117)],       // ses cerveaux (à gauche, le texte à droite)
  [0.70, V(-5, -3, -103), V(-8.2, -5, -117)],
  [0.75, V(-7.5, 1.6, -132), V(-7.5, -1.4, -142)],  // Caterpillar (en haut de l'écran, le nom en bas)
  [0.80, V(0, 1.7, -131), V(0, -1.3, -142)],        // Crysalis
  [0.85, V(8, 1.9, -130.5), V(8, -.8, -142)],      // Butterfly
  [0.91, V(0, 0, -162), V(-1.6, 0, -172)],          // sécurité : retour au centre (le halo à droite, le texte à gauche)
  [0.97, V(0, .5, -183), V(-2.6, .6, -200)],         // sortie : le papillon à droite, le texte à gauche
  [1.00, V(.4, .7, -184.5), V(-2.4, .6, -200)],
];
if (debout) {                                             // écran vertical : l'Orb en haut, le texte en bas ; tout un peu plus loin
  CHEMIN[0][1] = V(0, .2, 12.5); CHEMIN[0][2] = V(0, -2.8, 0); CHEMIN[1][2] = V(0, -1.4, 0);
  for (const i of [10, 11]) { CHEMIN[i][1] = CHEMIN[i][1].clone().add(V(3, 1, 6)); CHEMIN[i][2] = V(-12, -6.5, -114); }
  for (const i of [12, 13, 14]) { CHEMIN[i][1] = CHEMIN[i][1].clone().add(V(0, .6, 4)); CHEMIN[i][2].y += .4; }
  for (const i of [8, 9]) CHEMIN[i][2] = V(0, 13.5, -88);
  CHEMIN[15][2] = V(0, -2.4, -172);
  for (const i of [6, 7]) CHEMIN[i][1] = CHEMIN[i][1].clone().add(V(-3, .5, 4));
  for (const i of [16, 17]) { CHEMIN[i][1] = CHEMIN[i][1].clone().add(V(0, -1, 3)); CHEMIN[i][2] = V(0, -3.3, -200); }
}
const courbePos = new THREE.CatmullRomCurve3(CHEMIN.map(c => c[1]), false, "centripetal");
const courbeCib = new THREE.CatmullRomCurve3(CHEMIN.map(c => c[2]), false, "centripetal");
const pos = new THREE.Vector3(), cib = new THREE.Vector3();
function poseCamera(p) {
  let i = 0; while (i < CHEMIN.length - 2 && p > CHEMIN[i + 1][0]) i++;
  const k = Math.min(1, Math.max(0, (p - CHEMIN[i][0]) / (CHEMIN[i + 1][0] - CHEMIN[i][0])));
  const u = (i + k) / (CHEMIN.length - 1);                   // même passage à chaque point, sans arrêt entre deux
  courbePos.getPoint(u, pos); courbeCib.getPoint(u, cib);
}

// ---------- défilement lissé, souris, chapitres de texte
const etat = {p: 0, vise: 0, mx: 0, my: 0, tx: 0, ty: 0, fige: false}, ecart = {x: 0, y: 0};
const longueur = () => document.documentElement.scrollHeight - innerHeight;
addEventListener("scroll", () => (etat.vise = scrollY / Math.max(1, longueur())), {passive: true});
addEventListener("pointermove", e => { etat.tx = e.clientX / innerWidth - .5; etat.ty = e.clientY / innerHeight - .5; }, {passive: true});
const chapitres = [...document.querySelectorAll("[data-de]")].map(el => ({el, de: +el.dataset.de, a: +el.dataset.a, o: 0,
  cote: el.id === "ch-orb" ? 0 : /gauche/.test(el.className) ? 1 : /droite/.test(el.className) ? -1 : 0}));
chapitres.forEach(c => { const t = c.el.querySelector("h1, h2, .petit-titre"); if (t && !t.hasAttribute("tabindex")) t.tabIndex = 0; });
const allerA = p => scrollTo({top: Math.max(0, p) * longueur(), behavior: calme ? "auto" : "smooth"});
chapitres.forEach(c => c.el.addEventListener("focusin", () => { if (etat.p < c.de || etat.p > c.a) allerA((Math.max(0, c.de) + Math.min(1, c.a)) / 2); }));
document.querySelectorAll('a[href="#voyage"]').forEach(a => a.addEventListener("click", e => { e.preventDefault(); allerA(.165); }));
function majTextes(p) {
  for (const c of chapitres) {
    const dedans = p >= c.de && p <= c.a, bord = Math.min(p - c.de, c.a - p);
    const o = dedans ? Math.min(1, bord / .012) : 0;
    c.o = o; c.el.style.opacity = o.toFixed(3);
    c.el.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    c.el.style.filter = o < .99 ? `blur(${((1 - o) * 8).toFixed(1)}px)` : "none";
    c.el.style.pointerEvents = o > .3 ? "" : "none";                       // jamais cachés au clavier
  }
  document.documentElement.style.setProperty("--avance", p.toFixed(4));
}

// ---------- stop d'urgence : tout se fige, puis repart
window.figerVoyage = (oui) => { etat.fige = oui; bloom.strength = oui ? .2 : .62; };

// ---------- boucle
const horloge = new THREE.Clock(); let temps = 0;
const SCENES = [orbe, ecoute, agit, memoire, cerveaux, meta, securite, envol], tmp = new THREE.Vector3();
function image() { if (!document.hidden) etape(); requestAnimationFrame(image); }
// pour les tests : afficher n'importe quel moment du voyage tout de suite (même si l'onglet est caché)
window.voyageA = (p, t) => { scrollTo({top: p * longueur(), behavior: "instant"}); etat.p = etat.vise = p; if (t != null) temps = t; etape(true); return camera.position.toArray().map(x => +x.toFixed(2)); };
function etape(direct) {
  const dt = direct ? 0 : Math.min(.05, horloge.getDelta());
  if (!etat.fige) temps += dt;
  if (!direct) etat.p += (etat.vise - etat.p) * (calme ? 1 : 1 - Math.exp(-dt * 3.2));
  if (direct) { etat.mx = etat.my = 0; }
  const km = 1 - Math.exp(-dt * 2.2); etat.mx += (etat.tx - etat.mx) * km; etat.my += (etat.ty - etat.my) * km;
  poseCamera(etat.p);
  camera.position.copy(pos); camera.position.x += etat.mx * .9; camera.position.y -= etat.my * .6;
  camera.lookAt(cib.x + etat.mx * 1.4, cib.y - etat.my * .9, cib.z);
  lumiere.position.copy(camera.position); lumiere.position.y += 1.5; lumiere.position.z -= 2;
  orbeMat.uniforms.dedans.value = Math.min(1, Math.max(0, (2.2 - camera.position.length()) / 1.5));
  for (const g of SCENES) g.visible = g.getWorldPosition(tmp).distanceTo(camera.position) < 34;
  for (const a of liste) if (!a.g || a.g.visible) a.f(temps, dt);
  majTextes(etat.p);
  let vx = 0, vy = 0;
  for (const c of chapitres) { if (!debout) vx += c.cote * c.o; if (debout && c.el.id !== "ch-orb") vy += c.o; }
  ecart.x += (vx - ecart.x) * (direct ? 1 : 1 - Math.exp(-dt * 3)); ecart.y += (vy - ecart.y) * (direct ? 1 : 1 - Math.exp(-dt * 3));
  const W = innerWidth, H = innerHeight;
  camera.setViewOffset(W, H, -ecart.x * W * .11, ecart.y * H * .16, W, H);
  composer.render();
}
addEventListener("orientationchange", () => location.reload());
addEventListener("resize", () => { if ((innerHeight > innerWidth * 1.05) !== debout) location.reload(); });   // passage vertical ↔ horizontal : on recadre
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
if (calme) document.documentElement.classList.add("sans3d");
addEventListener("alyson-langue", () => redessins.forEach(f => f()));
document.fonts.ready.finally(() => {
  redessins.forEach(f => f()); document.documentElement.classList.add("pret");
  if (calme) { etape(true); return; }                     // une seule image, immobile
  requestAnimationFrame(image);
});
