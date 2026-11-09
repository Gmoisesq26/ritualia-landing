// Cambia la moneda si tus precios no son dólares (ej. 'MXN').
const MONEDA = 'USD';
const RAIZ = '../';

const formato = new Intl.NumberFormat('es-MX', { style: 'currency', currency: MONEDA });

function crear(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function tarjeta(p) {
  const art = crear('article', 'producto');

  const foto = crear('div', 'foto', '✦');
  if (p.imagen) {
    const img = new Image();
    img.alt = p.nombre;
    img.loading = 'lazy';
    img.onload = () => { foto.textContent = ''; foto.appendChild(img); };
    img.src = RAIZ + p.imagen; // si no existe, se queda el ✦
  }

  const info = crear('div', 'info');
  info.append(crear('h2', '', p.nombre), crear('p', '', p.descripcion || ''), crear('div', 'precio', formato.format(p.precio)));

  if (typeof p.enlace_pago === 'string' && p.enlace_pago.startsWith('https://')) {
    const a = crear('a', 'button primary', 'Comprar');
    a.href = p.enlace_pago;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.textAlign = 'center';
    info.appendChild(a);
  }
  art.append(foto, info);
  return art;
}

async function cargarProductos() {
  const cont = document.getElementById('productos');
  try {
    let lista;
    try {
      const res = await fetch(RAIZ + 'data/productos.json');
      if (!res.ok) throw new Error(res.status);
      lista = await res.json();
    } catch (e) {
      if (!window.ARCANA_DATOS) throw e;
      lista = window.ARCANA_DATOS.productos; // respaldo para file://
    }
    cont.replaceChildren(...lista.map(tarjeta));
  } catch (err) {
    console.error('Error al cargar productos:', err);
    cont.replaceChildren(crear('p', 'muted', 'No se pudo cargar la tienda por ahora.'));
  }
}
document.addEventListener('DOMContentLoaded', cargarProductos);
