// Las rutas del JSON ("img/cartas/") son relativas a la raíz del sitio;
// esta página vive en /tarot/, así que hay que subir un nivel.
const RAIZ = '../';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D = ms => (reduceMotion ? 0 : ms);
const esperar = ms => new Promise(r => setTimeout(r, ms));

// Tiempos (ms) que puedes ajustar a tu gusto
const TIEMPOS = {
  hechizo1: 1350,      // "Canalizando energía arcana"
  hechizo2: 650,       // "Las cartas responden"
  antesDeVoltear: 400, // pausa entre el reparto y el primer volteo
  entreVolteos: 550    // espera entre el volteo de una carta y la siguiente
};

let mazo = [];
let config = {};
let token = 0;
const cacheImg = new Map();

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function inicializarJuego() {
  try {
    try {
      const [resMazo, resConfig] = await Promise.all([
        fetch(RAIZ + 'data/mazo.json'),
        fetch(RAIZ + 'data/cartas-config.json')
      ]);
      if (!resMazo.ok || !resConfig.ok) throw new Error('JSON no disponible');
      mazo = await resMazo.json();
      config = await resConfig.json();
    } catch (e) {
      // Respaldo para file:// (doble clic): datos incluidos en js/datos.js
      if (!window.ARCANA_DATOS) throw e;
      mazo = window.ARCANA_DATOS.mazo;
      config = window.ARCANA_DATOS.config;
    }
    aplicarVariablesEstilo();
    // Enter en el campo de pregunta baraja y saca las cartas
    $('pregunta').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sacarCartas(); }
    });
  } catch (err) {
    console.error('Error al cargar datos del Tarot:', err);
    $('gameMessage').textContent =
      'No se pudieron cargar las cartas. Revisa que exista js/datos.js o la carpeta data/.';
    $('pregunta').disabled = true;
  }
}

function aplicarVariablesEstilo() {
  const r = document.documentElement.style;
  const g = config.estilos_generales || {};
  const rev = config.reverso || {};
  const set = (k, v) => { if (v) r.setProperty(k, v); };
  set('--cw', g.ancho_carta);
  set('--ch', g.alto_carta);
  set('--card-border-radius', g.borde_radio);
  set('--card-border-width', g.grosor_borde);
  set('--card-border-color', g.color_borde);
  set('--card-shadow', g.sombra);
  set('--card-a', g.color_fondo_a);
  set('--card-b', g.color_fondo_b);
  set('--card-text', g.color_texto);
  set('--card-glow', g.efecto_brillo);
  set('--reverso-base', rev.color_base);
  set('--reverso-grad', rev.color_gradiente);
  set('--reverso-simbolo', rev.color_simbolo);
}

// ---------- imágenes opcionales: solo se usan si el archivo existe ----------
function existeImagen(url) {
  if (!url) return Promise.resolve(false);
  if (!cacheImg.has(url)) {
    cacheImg.set(url, new Promise(res => {
      const i = new Image();
      i.onload = () => res(true);
      i.onerror = () => res(false);
      i.src = url;
    }));
  }
  return cacheImg.get(url);
}

function rutaCarta(c) {
  const r = config.rutas_imagenes;
  if (!r || !r.usar_carpeta_imagenes) return null;
  return `${RAIZ}${r.ruta_base}${c.id}${r.extension}`;
}

function rutaReverso() {
  const img = config.reverso && config.reverso.imagen_reverso;
  return img ? RAIZ + img : null;
}

function reversoHTML(conImagen) {
  const simbolo = esc((config.reverso && config.reverso.simbolo_central) || '✦');
  const estilo = conImagen ? ` style="background-image:url('${rutaReverso()}')"` : '';
  return `<div class="tarot-card back${conImagen ? ' has-art' : ''}"${estilo} aria-label="Carta boca abajo">
    <div class="card-symbol">${simbolo}</div><div class="card-name">ASTRALIA</div></div>`;
}

function cartaHTML(c, conImagen) {
  const estilo = conImagen
    ? ` style="background-image:linear-gradient(0deg,rgba(16,11,32,0.95),transparent 55%),url('${rutaCarta(c)}')"`
    : '';
  return `<div class="tarot-card${conImagen ? ' has-art' : ''}"${estilo}>
    <div class="card-number">${String(c.id).padStart(2, '0')}</div>
    <div class="card-symbol">${esc(c.simbolo || '✦')}</div>
    <div class="card-name">${esc(c.nombre)}</div>
    <div class="card-keyword">${esc(c.palabra_clave || '')}</div></div>`;
}

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- efecto arcano (pantalla completa) ----------
function chispas(stage) {
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i');
    p.className = 'arcane-particle';
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * Math.min(innerWidth, innerHeight) * 0.42;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    p.style.animationDelay = `${Math.random() * 0.28}s`;
    stage.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}

async function hechizo(mi) {
  const stage = $('arcaneStage');
  const label = $('arcaneLabel');
  if (!stage || reduceMotion) return;
  stage.classList.add('active');
  if (label) label.textContent = 'Canalizando energía arcana';
  chispas(stage);
  await esperar(TIEMPOS.hechizo1);
  if (mi !== token) return;
  if (label) label.textContent = 'Las cartas responden';
  chispas(stage);
  await esperar(TIEMPOS.hechizo2);
  stage.classList.remove('active');
}

// ---------- el vidente: lectura conjunta según la pregunta ----------
async function consultarVidente(pregunta, elegidas, mi) {
  const box = $('vidente');
  box.hidden = false;
  box.innerHTML = `<div class="burbuja usuario">${esc(pregunta)}</div>
    <div class="burbuja oraculo" id="respVidente">
      <span class="puntos">El vidente consulta las cartas<i>.</i><i>.</i><i>.</i></span></div>`;
  box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });

  const posiciones = ['origen', 'camino', 'consejo'];
  let texto;
  try {
    const r = await fetch('/api/lectura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000), // si el servidor no responde, no deja los puntos para siempre
      body: JSON.stringify({
        pregunta,
        // Nombre + posición, para que la lectura respete origen / camino / consejo
        cartas: elegidas.map((c, i) => `${c.nombre} (${posiciones[i]})`)
      })
    });
    const datos = await r.json().catch(() => ({}));
    console.log('Respuesta del vidente:', r.status, datos); // para depurar
    // Si el servidor manda un mensaje (esperar, mucha demanda...), se muestra tal cual
    texto = r.ok ? datos.texto : (datos.error || 'La niebla cubre las cartas por ahora. Inténtalo de nuevo en un momento.');
    if (!texto) throw new Error('Respuesta vacía');
  } catch (e) {
    console.error('Error al consultar al vidente:', e);
    texto = 'La niebla cubre las cartas por ahora. Inténtalo de nuevo en un momento.';
  }
  if (mi !== token) return;
  const resp = $('respVidente');
  resp.innerHTML = esc(texto).replace(/\n+/g, '<br><br>');
  if (!reduceMotion) resp.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
}

async function sacarCartas() {
  const spread = $('spread');
  const msg = $('gameMessage');
  const campo = $('pregunta');
  const pregunta = campo.value.trim();

  if (campo.disabled) return; // ya hay una tirada en curso
  if (!pregunta) {
    msg.textContent = 'Escribe primero tu pregunta y pulsa Enter ✦';
    campo.focus();
    return;
  }
  if (mazo.length < 3) {
    msg.textContent = 'El mazo necesita al menos tres cartas.';
    return;
  }

  const mi = ++token;
  spread.innerHTML = '';
  $('vidente').hidden = true;
  $('vidente').innerHTML = '';
  campo.disabled = true;
  msg.textContent = 'Las cartas despiertan… ✦';

  const elegidas = barajar(mazo).slice(0, 3);
  const posiciones = ['I · Tu origen', 'II · El camino', 'III · Consejo de la aventura'];

  // El efecto arcano corre mientras se precargan las imágenes
  const [arte, conReverso] = await Promise.all([
    Promise.all(elegidas.map(c => existeImagen(rutaCarta(c)))),
    existeImagen(rutaReverso()),
    hechizo(mi)
  ]).then(([a, r]) => [a, r]);
  if (mi !== token) return;

  let reveladas = 0;
  const revelaciones = [];

  const items = elegidas.map((c, i) => {
    const item = document.createElement('div');
    item.className = 'drawn-card';
    item.style.visibility = 'hidden';
    item.innerHTML = `
      <div class="position">${posiciones[i]}</div>
      <div class="card-holder" aria-label="Carta ${i + 1}, boca abajo">
        <div class="card-flip">
          <div class="face face-back">${reversoHTML(conReverso)}</div>
          <div class="face face-front" aria-hidden="true">${cartaHTML(c, arte[i])}</div>
        </div>
      </div>
      <div class="reading"></div>`;

    const holder = item.querySelector('.card-holder');
    const flip = item.querySelector('.card-flip');
    const reading = item.querySelector('.reading');

    // Voltea la carta (se llama automáticamente, sin clic)
    revelaciones.push(() => {
      holder.dataset.revealed = 'yes';
      holder.setAttribute('aria-label', `Carta revelada: ${c.nombre}`);
      item.querySelector('.face-front').removeAttribute('aria-hidden');
      flip.style.transform = 'rotateY(180deg)';
      const giro = flip.animate([
        { transform: 'translateY(0) rotateY(0deg) scale(1)' },
        { transform: 'translateY(-26px) rotateY(90deg) scale(1.08)', offset: 0.5 },
        { transform: 'translateY(0) rotateY(180deg) scale(1)' }
      ], { duration: D(850), easing: 'cubic-bezier(.45,.05,.25,1)' });

      giro.finished.then(() => {
        if (!reduceMotion) {
          item.querySelector('.face-front .tarot-card').animate(
            [{ boxShadow: 'var(--card-shadow)' }, { boxShadow: '0 0 40px 8px var(--card-glow, rgba(244,207,131,.4))', offset: 0.4 }, { boxShadow: 'var(--card-shadow)' }],
            { duration: 1000, easing: 'ease-out' }
          );
        }
        reading.innerHTML = `<strong>${esc(c.nombre)} · ${esc(c.palabra_clave || '')}</strong><br>${esc(c.significado || 'Construye tu propia interpretación.')}`;
        reading.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D(400) });
      });

      reveladas++;
      msg.textContent = reveladas === 3
        ? 'Las tres cartas están reveladas. El vidente las está leyendo…'
        : `Revelando carta ${reveladas} de 3…`;
      return giro.finished;
    });
    return item;
  });
  spread.append(...items);
  const holders = items.map(i => i.querySelector('.card-holder'));
  const etiquetas = items.flatMap(i => [i.querySelector('.position'), i.querySelector('.reading')]);

  // 1) BARAJAR: un montón de reversos que se parte y se mezcla
  let pila = null;
  if (!reduceMotion) {
    msg.textContent = 'Barajando…';
    pila = document.createElement('div');
    pila.className = 'shuffle-stack';
    pila.style.top = holders[0].offsetTop + 'px';
    const N = 9, cartas = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div');
      el.className = 'shuffle-card';
      el.style.zIndex = i;
      el.innerHTML = reversoHTML(conReverso);
      pila.appendChild(el);
      cartas.push(el);
    }
    spread.appendChild(pila);
    const anims = cartas.map((el, i) => {
      const lado = i % 2 ? 1 : -1, y = -i * 1.6, yr = -(N - i) * 1.6;
      return el.animate([
        { transform: `translate(0,${y}px) rotate(0deg)` },
        { transform: `translate(${lado * 95}px,${y}px) rotate(${lado * 8}deg)`, offset: 0.22 },
        { transform: `translate(${lado * 12}px,${yr}px) rotate(${lado}deg)`, offset: 0.45 },
        { transform: `translate(${lado * 110}px,${yr - 12}px) rotate(${lado * 10}deg)`, offset: 0.68 },
        { transform: `translate(0,${y}px) rotate(0deg)` }
      ], { duration: 1600, delay: i * 30, easing: 'ease-in-out', fill: 'both' });
    });
    await Promise.all(anims.map(a => a.finished));
    if (mi !== token) return;
  }

  // 2) REPARTIR: cada carta sale del montón hacia su lugar
  items.forEach(it => { it.style.visibility = 'visible'; });
  etiquetas.forEach(el => { el.style.opacity = 0; });
  if (!reduceMotion) {
    msg.textContent = 'Repartiendo…';
    const r = spread.getBoundingClientRect();
    const sx = r.left + r.width / 2;
    const sy = r.top + holders[0].offsetTop + holders[0].offsetHeight / 2;
    const reparto = holders.map((h, i) => {
      const b = h.getBoundingClientRect();
      const dx = sx - (b.left + b.width / 2), dy = sy - (b.top + b.height / 2);
      return h.animate([
        { transform: `translate(${dx}px,${dy}px) rotate(${(Math.random() - 0.5) * 10}deg) scale(.96)` },
        { transform: 'translate(0,0) rotate(0deg) scale(1)' }
      ], { duration: 700, delay: i * 240, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'backwards' });
    });
    pila.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 420, fill: 'forwards' });
    await Promise.all(reparto.map(a => a.finished));
    if (mi !== token) return;
    pila.remove();
  }
  etiquetas.forEach(el => { el.style.opacity = 1; el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D(400) }); });

  // 3) VOLTEAR: las cartas se revelan solas, una tras otra
  await esperar(D(TIEMPOS.antesDeVoltear));
  let ultimo;
  for (let i = 0; i < revelaciones.length; i++) {
    if (mi !== token) return;
    ultimo = revelaciones[i]();
    if (i < revelaciones.length - 1) await esperar(D(TIEMPOS.entreVolteos));
  }
  await ultimo;
  if (mi !== token) return;

  // 4) EL VIDENTE: lectura conjunta según la pregunta
  await esperar(D(600));
  await consultarVidente(pregunta, elegidas, mi);
  if (mi !== token) return;

  msg.textContent = 'Puedes hacer otra pregunta cuando quieras.';
  campo.disabled = false;
}

document.addEventListener('DOMContentLoaded', inicializarJuego);