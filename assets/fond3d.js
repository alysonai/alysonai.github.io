/* Fond 3D des pages intérieures : le même univers que le voyage, plus calme, pour lire tranquillement.
   <body data-fond="constellation|chrysalide|halo|orbe|anneaux|papillon"> choisit l'objet de la page.
   Le défilement fait glisser la caméra autour de l'objet ; la souris la fait pencher légèrement. */
import * as THREE from "three";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {SVGLoader} from "three/addons/loaders/SVGLoader.js";

const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
const petit = innerWidth < 760;
const canvas = document.getElementById("fond3d");
const NUIT = new THREE.Color("#101112"), NEON = new THREE.Color("#F49BC1"), LUEUR = new THREE.Color("#FFDCE3");
const renderer = new THREE.WebGLRenderer({canvas, antialias: !petit, powerPreference: "high-performance"});
renderer.setPixelRatio(Math.min(petit ? 1.3 : 1.6, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = NUIT.clone(); scene.fog = new THREE.FogExp2(NUIT, .05);
const camera = new THREE.PerspectiveCamera(petit ? 60 : 45, innerWidth / innerHeight, .05, 200);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.add(new THREE.AmbientLight(0xffe6ee, .35));
const lumiere = new THREE.PointLight(0xffc4da, 8, 24, 1.8); scene.add(lumiere);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .45, .55, .55); composer.addPass(bloom);
composer.addPass(new OutputPass());

const verre = (teinte = "#F8E7E9", em = .3) => new THREE.MeshStandardMaterial({     // la matière de l'appli : pétale doux qui luit
  color: "#EFC3CF", emissive: new THREE.Color("#F08BB4"), emissiveIntensity: .02 + em * .1, roughness: .5, metalness: 0, envMapIntensity: .35,
});
const neon = (c = LUEUR, o = 1) => new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false});
const pointDoux = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,220,230,.8)"); r.addColorStop(1, "rgba(255,200,220,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const hasard = (a, b) => a + Math.random() * (b - a);
function poussiere(n, f, taille, opacite = .8) {
  const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = f(); p[i * 3] = v[0]; p[i * 3 + 1] = v[1]; p[i * 3 + 2] = v[2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({size: taille, map: pointDoux, color: 0xffdce3, transparent: true, opacity: opacite, depthWrite: false, blending: THREE.AdditiveBlending}));
}
const anim = [];
const univers = poussiere(petit ? 700 : 1600, () => [hasard(-40, 40), hasard(-25, 25), hasard(-40, 12)], .1, .7); scene.add(univers);
const objet = new THREE.Group(); scene.add(objet);

// ---------- les objets de chaque page
const FONDS = {
  constellation() {
    const pts = []; for (let i = 0; i < (petit ? 80 : 150); i++) { const u = Math.random() * 6.283, w = Math.acos(hasard(-1, 1)), r = hasard(2, 6.5);
      pts.push(new THREE.Vector3(Math.sin(w) * Math.cos(u) * r, Math.cos(w) * r * .7, Math.sin(w) * Math.sin(u) * r)); }
    const m4 = new THREE.Matrix4(), n = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 10, 10), new THREE.MeshBasicMaterial({color: LUEUR}), pts.length);
    pts.forEach((p, i) => { m4.makeScale(i % 9 ? 1 : 2.4, i % 9 ? 1 : 2.4, i % 9 ? 1 : 2.4).setPosition(p); n.setMatrixAt(i, m4); }); objet.add(n);
    const l = []; pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && a.distanceTo(b) < 1.9) l.push(a.x, a.y, a.z, b.x, b.y, b.z); }));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(l, 3));
    objet.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: NEON, transparent: true, opacity: .25, blending: THREE.AdditiveBlending})));
    anim.push(t => (objet.rotation.y = t * .04));
  },
  chrysalide() {
    const prof = []; for (let i = 0; i <= 40; i++) { const y = i / 40; prof.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(y, .85)) * 1.15 * (1 - y * .25) + .001, y * 3.6 - 1.8)); }
    objet.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), verre("#F6A9C8", .3)));
    for (let b = 0; b < 3; b++) { const p = []; for (let i = 0; i <= 120; i++) { const k = i / 120, y = k * 3.3 - 1.7, pr = Math.sin(Math.PI * Math.pow((y + 1.8) / 3.6, .85)) * 1.15 * (1 - (y + 1.8) / 3.6 * .25), a = k * 10 + b * 2.09;
      p.push(new THREE.Vector3(Math.cos(a) * (pr + .03), y, Math.sin(a) * (pr + .03))); }
      objet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 200, .07, 10), verre("#FFD3E3", .55))); }
    const an = new THREE.Mesh(new THREE.TorusGeometry(2.6, .014, 8, 260), neon(LUEUR, .9)); an.rotation.set(Math.PI / 2 - .3, .25, 0); objet.add(an);
    const e = [0, Math.PI].map(d => { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: pointDoux, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false})); s.scale.setScalar(.6); an.add(s); return {s, d}; });
    anim.push(t => { objet.rotation.y = t * .2; e.forEach(({s, d}) => s.position.set(Math.cos(t * .9 + d) * 2.6, Math.sin(t * .9 + d) * 2.6, 0)); });
  },
  halo() {
    objet.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 64, 64), verre("#F8E7E9", .35)));
    for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(2.5 + i * .9, .02, 8, 200), neon(i ? NEON : LUEUR, .7 - i * .18)); objet.add(h);
      anim.push(t => { h.rotation.x = t * (.1 + i * .05); h.rotation.y = t * (.13 - i * .03); }); }
  },
  orbe() {
    const mat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: {t: {value: 0}},
      vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; vP=position; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float t; varying vec3 vN; varying vec3 vP; varying vec3 vV;
        float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
        float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
        float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
        void main(){ float fr=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4); vec3 q=vP*1.25+vec3(0.,t*.25,t*.12); float f=fbm(q+fbm(q*1.7+t*.15));
          float v=smoothstep(.48,.62,f)*smoothstep(.75,.6,f); vec3 r=vec3(.97,.91,.92), ne=vec3(.96,.6,.76);
          vec3 c=mix(ne,r,f)*(.08+v*.9)+mix(r,ne,.35)*fr*.75; float a=.1+v*.55+fr*.75; gl_FragColor=vec4(c*a,a);}`});
    objet.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 96, 96), mat));
    const r = poussiere(700, () => { const a = Math.random() * 6.283, d = hasard(2.6, 3.4); return [Math.cos(a) * d, hasard(-.12, .12), Math.sin(a) * d]; }, .05, .9);
    r.rotation.x = .35; objet.add(r);
    anim.push(t => { mat.uniforms.t.value = t; r.rotation.y = t * .08; });
  },
  anneaux() {
    for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.4, .012, 8, 160), neon(NEON, .5)); r.position.z = -i * 3; objet.add(r);
      anim.push(t => { r.rotation.z = t * .1 + i; r.material.opacity = .3 + .25 * Math.sin(t * 1.5 - i * .7); }); }
    objet.add(poussiere(1200, () => { const a = Math.random() * 6.283, d = hasard(2, 4.5); return [Math.cos(a) * d, Math.sin(a) * d, hasard(-30, 2)]; }, .07, .8));
  },
  papillon() {
    const formes = new SVGLoader().parse(`<svg viewBox="0 0 952 838"><path d="${window.PAPILLON.d}"/></svg>`).paths.flatMap(p => SVGLoader.createShapes(p));
    const centre = s => s.getPoints().reduce((a, p) => a + p.x, 0) / s.getPoints().length;
    const [droite, gauche] = formes.slice().sort((a, b) => centre(b) - centre(a));
    const mat = new THREE.MeshStandardMaterial({color: "#F8E7E9", emissive: new THREE.Color("#F4B3C8"), emissiveIntensity: .12, roughness: .55, metalness: 0, side: THREE.DoubleSide});
    const aile = (s, signe) => { const e = new THREE.ExtrudeGeometry(s, {depth: 3, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 3, curveSegments: 32});
      e.translate(-476, -419, 0); e.scale(.0045, -.0045, .0045); const p = new THREE.Group(); p.add(new THREE.Mesh(e, mat)); p.userData.s = signe; objet.add(p); return p; };
    const ailes = [aile(gauche, 1), aile(droite, -1)];
    anim.push(t => { ailes.forEach(p => (p.rotation.y = p.userData.s * (.15 + Math.abs(Math.sin(t * 1.6)) * .7))); objet.position.y = Math.sin(t * 1.2) * .15; });
  },
};
(FONDS[document.body.dataset.fond] || FONDS.orbe)();

// ---------- caméra : elle tourne doucement autour de l'objet en défilant ; l'objet reste du côté opposé au texte
const cote = document.body.dataset.cote === "gauche" ? -1 : 1;     // objet à droite par défaut
const etat = {p: 0, mx: 0, my: 0, tx: 0, ty: 0};
addEventListener("pointermove", e => { etat.tx = e.clientX / innerWidth - .5; etat.ty = e.clientY / innerHeight - .5; }, {passive: true});
const horloge = new THREE.Clock(); let temps = 0;
const attenue = [...document.querySelectorAll(".trio, .tableau, .bloc")]; let voile = 1;   // l'objet s'efface derrière les blocs de texte
if (calme) document.documentElement.classList.add("calme3d");
function image() {
  if (document.hidden) { requestAnimationFrame(image); return; }
  const dt = Math.min(.05, horloge.getDelta()); temps += calme ? 0 : dt;
  const L = Math.max(1, document.documentElement.scrollHeight - innerHeight), vise = scrollY / L;
  etat.p += (vise - etat.p) * (1 - Math.exp(-dt * 3)); const k = 1 - Math.exp(-dt * 2); etat.mx += (etat.tx - etat.mx) * k; etat.my += (etat.ty - etat.my) * k;
  const a = -.5 + etat.p * 1.4, d = 9.5 - etat.p * 2;
  camera.position.set(Math.sin(a) * d + etat.mx * .8, .6 - etat.p * 1.2 - etat.my * .5, Math.cos(a) * d);
  camera.lookAt(-cote * 3.2 * (petit ? 0 : 1), 0, 0);
  lumiere.position.copy(camera.position).add(new THREE.Vector3(0, 1.5, -2));
  univers.rotation.y = temps * .01;
  const dedans = attenue.some(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight * .8 && r.bottom > innerHeight * .2; });
  voile += ((dedans ? .16 : 1) - voile) * .06; objet.scale.setScalar(voile);
  bloom.strength = .2 + .3 * voile; scene.fog.density = .05 + (1 - voile) * .06;
  anim.forEach(f => f(temps));
  composer.render();
  requestAnimationFrame(image);
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });
requestAnimationFrame(image);
