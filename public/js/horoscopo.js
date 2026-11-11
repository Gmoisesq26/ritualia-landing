// Ritualia · lógica del horóscopo: semana, números de la suerte, rueda, selección y ventana de lectura.
// Depende de horoscopo-data.js (S, TR, T, TRAIT, CIERRE, cols, C).
function trace(n){const t=TR[n];return t.p.map((d,i)=>`<path class="fg" pathLength="100" d="${d}" style="transition-delay:${(i%14)*.1}s"/>`).join("")+t.d.map(([x,y,e],i)=>`<circle class="st" cx="${x}" cy="${y}" r="${e?.85:.6}" style="animation-delay:${(i%10)*.3}s"/>`).join("")}
const HALO=`<circle class="aura" cx="50" cy="50" r="46"/><circle class="orb" cx="50" cy="50" r="49"/>`+Array.from({length:12},(_,k)=>{const a=k*Math.PI/6,c=Math.cos(a),s=Math.sin(a);return `<line class="ray" x1="${(50+54*c).toFixed(1)}" y1="${(50+54*s).toFixed(1)}" x2="${(50+64*c).toFixed(1)}" y2="${(50+64*s).toFixed(1)}"/>`}).join("");
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return[t.getUTCFullYear(),Math.ceil(((t-y)/864e5+1)/7)]}
function rnd(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
const now=new Date(),[Y,W]=isoWeek(now);
const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
const sun=new Date(mon);sun.setDate(mon.getDate()+6);
const f=d=>d.toLocaleDateString("es-MX",{day:"numeric",month:"long"});
document.getElementById("week").textContent="Semana del "+f(mon)+" al "+f(sun);
const pick=(a,r)=>a[Math.floor(r()*a.length)];
const GL=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"],CX=320,RD=Math.PI/180,KS=1.7,NUMS="I II III IV V VI VII VIII IX X XI XII".split(" ");
const WH=document.getElementById("wheel"),CAP=document.getElementById("cap"),RV=document.getElementById("rv");
let sel=-1,lastFocus=null,closeTimer=0;
const MES=now.toLocaleDateString("es-MX",{month:"long"});

// Números de la suerte: cada serie lleva un número de dígitos repetidos (11, 22... 99)
// colocado al azar a la izquierda, al centro o a la derecha. Fijos durante todo el mes.
const LUCK=(()=>{
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

// Horóscopo de cada signo desde el servidor (/api/horoscopo).
// Si el servidor no responde en 8 segundos, se usan las plantillas de horoscopo-data.js.
let HORO=null;
(function(){
  let signal;
  if(typeof AbortSignal!=="undefined"&&AbortSignal.timeout){signal=AbortSignal.timeout(8000)}
  else{const ac=new AbortController();setTimeout(()=>ac.abort(),8000);signal=ac.signal}
  fetch("/api/horoscopo",{signal})
    .then(r=>r.ok?r.json():null)
    .then(d=>{HORO=d})
    .catch(()=>{});
})();
const clave=n=>n.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const parrafos=t=>String(t).split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>`<p class="rtx">${esc(s)}</p>`).join("");

function reading(i){
  const r=rnd(Y*100+W*13+i*7919),n=S[i][0],a=pick(T.amor,r),t=pick(T.trabajo,r),e=pick(T.energia,r),c=pick(cols,r),z=pick(CIERRE,r);
  const ia=HORO&&HORO.signos&&HORO.signos[clave(n)];
  const cuerpo=(typeof ia==="string"&&ia.trim())
    ? parrafos(ia)
    : `<p class="rtx">${TRAIT[n]}</p><h3>Amor</h3><p>${a}</p><h3>Trabajo</h3><p>${t}</p><h3>Energía</h3><p>${e}</p><p class="rtx">${z}</p>`;
  return cuerpo+`<h3>Números de la suerte de ${MES}</h3><div>${LUCK[i].map(v=>`<span class="nm">${v}</span>`).join("")}</div><h3>${C[1]}</h3><p>${c}</p>`;
}

const POSS=[]; // posición de cada estrella suelta, para que viajen desde donde están
(function(){
let h=[108,150].map(r=>`<circle class="wr" cx="${CX}" cy="${CX}" r="${r}"/>`).join("");
for(let k=0;k<12;k++){const a=(-90+k*30+15)*RD;h+=`<line class="wr" x1="${CX+108*Math.cos(a)}" y1="${CX+108*Math.sin(a)}" x2="${CX+150*Math.cos(a)}" y2="${CX+150*Math.sin(a)}"/>`}
for(let k=0;k<12;k++){const a=(-90+k*30)*RD,x=CX+129*Math.cos(a),y=CX+129*Math.sin(a);h+=`<g class="wgs" data-i="${k}" tabindex="0" role="button" aria-label="${S[k][0]}"><circle class="wgb" cx="${x}" cy="${y}" r="19"/><text class="wg" x="${x}" y="${y}">${GL[k]}\uFE0E</text></g>`}
let ss=7;const rs=()=>(ss=(ss*16807)%2147483647)/2147483647;let st="";
for(let k=0;k<34;k++){const a=rs()*6.283,d=10+Math.sqrt(rs())*80,x=CX+d*Math.cos(a),y=CX+d*Math.sin(a),r=(.8+rs()*1.1).toFixed(2),dl=(rs()*3).toFixed(1);if(Math.abs(y-CX)<16&&Math.abs(x-CX)<62)continue;st+=`<circle class="st" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" style="animation-delay:${dl}s"/>`}
h+=`<g id="ctr"><g transform="translate(${CX-50*KS} ${CX-50*KS}) scale(${KS})"><g class="halo">${HALO}</g></g>${st}<text class="wh" x="${CX}" y="${CX}" dominant-baseline="central">Elige tu signo</text></g><g id="cg" role="button" tabindex="-1"></g>`;
S.forEach(([n],k)=>{const a=(-90+k*30)*RD,cx=CX+235*Math.cos(a),cy=CX+235*Math.sin(a),s=.9,t=TR[n];let z=k*977+13;const q=()=>(z=(z*16807)%2147483647)/2147483647;
const pts=t.d.map(([x,y])=>({x:+(cx+(x-50+(q()-.5)*10)*s).toFixed(1),y:+(cy+(y-50+(q()-.5)*10)*s).toFixed(1),r:+(.8+q()*.9).toFixed(2),tw:q()<.35,dl:+(q()*3).toFixed(1)}));
POSS[k]=pts;
h+=`<g class="we" data-i="${k}" tabindex="0" role="button" aria-label="${n}"><circle cx="${cx}" cy="${cy+4}" r="46" fill="transparent"/>${pts.map(p=>`<circle class="${p.tw?"st":"wd"}" cx="${p.x}" cy="${p.y}" r="${p.r}" style="animation-delay:${p.dl}s"/>`).join("")}<text class="wn" x="${cx}" y="${cy+52}">${n}</text></g>`});
WH.innerHTML=`<svg viewBox="40 40 560 590" role="group" aria-label="Rueda del zodiaco">${h}<g id="fly" pointer-events="none"></g></svg>`;
CAP.innerHTML="<span>Toca un signo de la rueda para empezar</span>";
})();
let tok=0;const RM=matchMedia("(prefers-reduced-motion:reduce)");
function pickSign(i){
sel=i;const n=S[i][0],k=KS,o=CX-50*k,my=++tok;
WH.querySelectorAll(".we,.wgs").forEach(g=>g.classList.toggle("sel",+g.dataset.i===i));
document.getElementById("ctr").classList.add("off");
const cg=document.getElementById("cg"),fly=document.getElementById("fly");
cg.setAttribute("tabindex","0");cg.setAttribute("aria-label","Leer la lectura de "+n);
const hit=`<circle cx="${CX}" cy="${CX}" r="108" fill="transparent"/>`;
cg.innerHTML=hit;fly.innerHTML="";
const form=()=>{if(my!==tok)return;fly.innerHTML="";cg.innerHTML=hit+`<g class="cg" transform="translate(${o} ${o}) scale(${k})"><g class="halo">${HALO}</g><g class="emb"><path d="${TR[n].f}"/></g>${trace(n)}</g>`;const g=cg.querySelector(".cg");requestAnimationFrame(()=>requestAnimationFrame(()=>g.classList.add("on")))};
CAP.innerHTML=`<b>${n}</b><i>${S[i][1]}</i><span>Toca tu constelación para leer tu semana</span>`;
if(RM.matches||!fly.animate){form();return}
const d=TR[n].d,P=POSS[i];
fly.innerHTML=P.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${(p.r+.4).toFixed(2)}"/>`).join("");
[...fly.children].forEach((c,j)=>{const[x,y]=d[j],dx=o+x*k-P[j].x,dy=o+y*k-P[j].y;c.animate([{transform:"translate(0px,0px)"},{transform:`translate(${dx}px,${dy}px)`}],{duration:1300,delay:Math.random()*600,easing:"cubic-bezier(.4,0,.2,1)",fill:"both"})});
setTimeout(form,2000);
}
function openR(i){
clearTimeout(closeTimer);
const[n,d]=S[i];lastFocus=document.activeElement;
document.getElementById("rvk").textContent="Casa "+NUMS[i];
document.getElementById("rvt").textContent=n;
document.getElementById("rvd").textContent=d;
document.getElementById("rvb").innerHTML=reading(i);
document.getElementById("rvs").innerHTML=`<g class="cg"><g class="emb"><path d="${TR[n].f}"/></g>${trace(n)}</g>`;
RV.hidden=false;
requestAnimationFrame(()=>{RV.classList.add("show");RV.querySelector(".cg").classList.add("on");RV.querySelector(".rvx").focus()});
}
function closeR(){RV.classList.remove("show");clearTimeout(closeTimer);closeTimer=setTimeout(()=>{RV.hidden=true},300);if(lastFocus&&lastFocus.focus)lastFocus.focus()}
WH.addEventListener("click",e=>{const g=e.target.closest(".we,.wgs");if(g){pickSign(+g.dataset.i);return}if(sel>=0&&e.target.closest("#cg"))openR(sel)});
WH.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const g=e.target.closest(".we,.wgs");if(g){e.preventDefault();pickSign(+g.dataset.i)}else if(sel>=0&&e.target.id==="cg"){e.preventDefault();openR(sel)}});
RV.addEventListener("click",e=>{if(e.target===RV||e.target.closest(".rvx"))closeR()});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!RV.hidden)closeR()});