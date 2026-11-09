// Horóscopo diario vía API de Sigastra (https://sigastra.com/es/partners/api)
// Desde el navegador la API identifica tu sitio por la dirección de la página: no hace falta clave.
const signosZodiacales = [
  { nombre: "Aries",       icono: "♈" },
  { nombre: "Tauro",       icono: "♉" },
  { nombre: "Géminis",     icono: "♊" },
  { nombre: "Cáncer",      icono: "♋" },
  { nombre: "Leo",         icono: "♌" },
  { nombre: "Virgo",       icono: "♍" },
  { nombre: "Libra",       icono: "♎" },
  { nombre: "Escorpio",    icono: "♏" },
  { nombre: "Sagitario",   icono: "♐" },
  { nombre: "Capricornio", icono: "♑" },
  { nombre: "Acuario",     icono: "♒" },
  { nombre: "Piscis",      icono: "♓" }
];

const contenedorSignos = document.getElementById("signs");
const titulo = document.getElementById("signTitle");
const texto = document.getElementById("horoscope");
const fecha = document.getElementById("fecha-actual");

let signoActual = null;

// "Géminis" -> "geminis" (coincide con las claves del JSON)
const slugSigno = nombre =>
  nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function claveDia() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
let diaMostrado = claveDia();

function pintarFecha() {
  if (!fecha) return;
  fecha.textContent = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function mostrar(mensaje, clase = "") {
  texto.className = clase;
  texto.textContent = mensaje;
}

async function consultarHoroscopo(nombreSigno) {
  mostrar("Consultando los astros…", "estado");
  try {
    const res = await fetch("/api/horoscopo", { cache: "no-cache" });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const datos = await res.json();
    const resultado = datos.signos[slugSigno(nombreSigno)];
    mostrar(resultado || "No se encontró el horóscopo de hoy.");
  } catch (error) {
    console.error("Error al consultar el horóscopo:", error);
    mostrar("No pudimos consultar el horóscopo. Intenta de nuevo.", "estado error");
  }
}

// Crear los botones de los signos
signosZodiacales.forEach(signo => {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "sign";
  boton.setAttribute("aria-label", "Consultar horóscopo de " + signo.nombre);
  boton.setAttribute("aria-pressed", "false");
  boton.innerHTML = `
    <span class="glyph" aria-hidden="true">${signo.icono}</span>
    <span class="sign-name">${signo.nombre}</span>
  `;

  boton.addEventListener("click", () => {
    document.querySelectorAll(".sign").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    boton.classList.add("active");
    boton.setAttribute("aria-pressed", "true");

    signoActual = signo.nombre;
    titulo.textContent = signo.nombre.toUpperCase();
    consultarHoroscopo(signo.nombre);
  });

  contenedorSignos.appendChild(boton);
});

// Si cambia el día con la página abierta, refresca fecha y horóscopo
function revisarCambioDeDia() {
  const hoy = claveDia();
  if (hoy === diaMostrado) return;
  diaMostrado = hoy;
  pintarFecha();
  if (signoActual) consultarHoroscopo(signoActual);
}

setInterval(revisarCambioDeDia, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) revisarCambioDeDia();
});

pintarFecha();