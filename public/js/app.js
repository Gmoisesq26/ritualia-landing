// Uso (desde la raíz de ritualia-landing): node aplicar-cambios.mjs [ruta/al/archivo]
// Sin ruta, busca el archivo que contiene "const LUCK=(()=>{".
// Cambios que aplica:
//  1) Números de la suerte: un número de dígitos repetidos (11, 22...) en posición aleatoria
//  2) Lectura por signo desde /api/horoscopo (con respaldo a tus plantillas si el servidor falla)
// Guarda una copia de seguridad como <archivo>.backup

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const yo = path.resolve(fileURLToPath(import.meta.url));
const INICIO = "const LUCK=(()=>{";
const FIN = "(function(){";

const candidatos = [
  "./js/horoscopo.js",
  "./js/horoscopo-data.js",
  "./horoscopo/index.html",
  "./index.html",
  "./public/js/horoscopo.js",
  "./public/js/horoscopo-data.js",
  "./public/horoscopo/index.html",
  "./public/index.html"
];

const ruta = process.argv[2] ||
  candidatos.find(f =>
    fs.existsSync(f) &&
    path.resolve(f) !== yo &&
    fs.readFileSync(f, "utf8").includes(INICIO)
  );

if (!ruta) {
  console.error("No encontré ningún archivo con 'const LUCK='. Pásame la ruta: node aplicar-cambios.mjs ./ruta/archivo");
  process.exit(1);
}
if (path.resolve(ruta) === yo) {
  console.error("Ese es el propio script. Indica el archivo del horóscopo.");
  process.exit(1);
}

let html = fs.readFileSync(ruta, "utf8");

if (html.includes('fetch("/js/horoscopo"')) {
  console.log("Los cambios ya estaban aplicados en", ruta);
  process.exit(0);
}

const a = html.indexOf(INICIO);
if (a === -1) {
  console.error("No encontré 'const LUCK=' en el archivo. ¿Es otro archivo?");
  process.exit(1);
}
const b = html.indexOf(FIN, a);
if (b === -1) {
  console.error("No encontré el final del bloque a reemplazar.");
  process.exit(1);
}

const NUEVO = `const LUCK=(()=>{
  const r=rnd((now.getFullYear()*12+now.getMonth())*9973+17);
  const reps=[11,22,33,44,55,66,77,88,99];
  for(let i=reps.length-1;i>0;i--){
    const j=Math.floor(r()*(i+1));
    [reps[i],reps[j]]=[reps[j],reps[i]];
  }
  const usados=new Set(),out=[];
  const nuevo=()=>{
    let v,t=0;
    do{v=1+Math.floor(r()*99)}while((v%11===0||usados.has(v))&&++t<500);
    usados.add(v);
    return v;
  };
  for(let i=0;i<12;i++){
    const serie=[nuevo(),nuevo()];
    serie.splice(Math.floor(r()*3),0,reps[i%9]); // 0 = izquierda, 1 = centro, 2 = derecha
    out.push(serie);
  }
  return out;
})();
let HORO=null;
fetch("/api/horoscopo",{signal:AbortSignal.timeout(8000)})
  .then(r=>r.ok?r.json():null)
  .then(d=>{HORO=d})
  .catch(()=>{});
const clave=n=>n.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function reading(i){
  const r=rnd(Y*100+W*13+i*7919),n=S[i][0],a=pick(T.amor,r),t=pick(T.trabajo,r),e=pick(T.energia,r),c=pick(cols,r),z=pick(CIERRE,r);
  const ia=HORO&&HORO.signos&&HORO.signos[clave(n)];
  const cuerpo=ia
    ? \`<p class="rtx">\${esc(ia)}</p>\`
    : \`<p class="rtx">\${TRAIT[n]}</p><h3>Amor</h3><p>\${a}</p><h3>Trabajo</h3><p>\${t}</p><h3>Energía</h3><p>\${e}</p><p class="rtx">\${z}</p>\`;
  return cuerpo+\`<h3>Números de la suerte de \${MES}</h3><div>\${LUCK[i].map(v=>\`<span class="nm">\${v}</span>\`).join("")}</div><h3>\${C[1]}</h3><p>\${c}</p>\`;
}
`;

fs.writeFileSync(ruta + ".backup", html);
html = html.slice(0, a) + NUEVO + html.slice(b);
fs.writeFileSync(ruta, html);
console.log("Listo. Cambios aplicados en", ruta, "(copia en", ruta + ".backup)");