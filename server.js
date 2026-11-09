import express from "express";
import fs from "node:fs/promises";

const app = express();
app.use(express.json({ limit: "10kb" }));

const ARCHIVO = "./horoscopos.json";
const MODELO = "gemini-3.8-flash";
const SIGNOS = ["aries","tauro","geminis","cancer","leo","virgo","libra",
  "escorpio","sagitario","capricornio","acuario","piscis"];

let generando = null;
let ultimoFallo = 0;

const hoyISO = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "America/Merida" });

/* ───────────── Llamada a Gemini (con reintentos) ───────────── */

async function llamarGemini(cuerpo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

  for (let intento = 1; intento <= 5; intento++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(cuerpo)
      });
    } catch (e) {
      console.log(`Sin respuesta de Gemini (${e.name}). Intento ${intento} de 5`);
      if (intento < 5) continue;
      throw e;
    }

    if (res.ok) return res.json();

    const temporal = [429, 500, 503].includes(res.status);
    if (temporal && intento < 5) {
      const espera = intento * 5000;
      console.log(`Gemini ocupado (${res.status}). Reintento ${intento} en ${espera / 1000}s…`);
      await new Promise(r => setTimeout(r, espera));
      continue;
    }
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
}

/* ───────────── Horóscopos diarios ───────────── */

async function generar() {
  const fecha = hoyISO();
  console.log("Generando horóscopos con Gemini para", fecha, "…");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY: revisa que .env esté en la raíz");
  }

  const prompt = `Eres un astrólogo con un tono cálido, místico y positivo. Escribe el horóscopo
del día ${fecha} en español de México para los 12 signos zodiacales.
Reglas:
- Entre 60 y 90 palabras por signo.
- Cubre amor, trabajo/estudios y un consejo breve.
- Que cada signo suene distinto; no repitas frases entre signos.
- No hagas predicciones médicas, legales ni financieras concretas.
- Responde SOLO con JSON válido, sin texto extra ni bloques de código, con esta forma exacta:
{"aries":"...","tauro":"...","geminis":"...","cancer":"...","leo":"...","virgo":"...","libra":"...","escorpio":"...","sagitario":"...","capricornio":"...","acuario":"...","piscis":"..."}`;

  const data = await llamarGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const bruto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!bruto) throw new Error("Respuesta vacía de Gemini");
  const texto = bruto.replace(/```json|```/g, "").trim();

  // Normaliza las claves: sin acentos ni mayúsculas
  const crudo = JSON.parse(texto);
  const signos = {};
  for (const [k, v] of Object.entries(crudo)) {
    const clave = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    signos[clave] = v;
  }

  const faltan = SIGNOS.filter(s => !signos[s]);
  if (faltan.length) throw new Error("Faltan signos en la respuesta: " + faltan.join(", "));

  const resultado = { fecha, signos };
  await fs.writeFile(ARCHIVO, JSON.stringify(resultado, null, 2));
  console.log("Horóscopos generados para", fecha);
  return resultado;
}

async function obtener() {
  let anterior = null;
  try {
    anterior = JSON.parse(await fs.readFile(ARCHIVO, "utf8"));
    if (anterior.fecha === hoyISO()) return anterior;
  } catch {}

  // Si falló hace menos de 10 minutos, no vuelvas a llamar a la IA
  if (Date.now() - ultimoFallo < 10 * 60 * 1000) {
    if (anterior) return anterior;
    throw new Error("Generación en pausa tras un fallo reciente");
  }

  if (!generando) generando = generar().finally(() => (generando = null));

  try {
    return await generando;
  } catch (e) {
    ultimoFallo = Date.now();
    console.error("Error al generar:", e.message);
    if (anterior) return anterior;
    throw e;
  }
}

app.get("/api/horoscopo", async (req, res) => {
  try {
    res.json(await obtener());
  } catch (e) {
    console.error("Error en /api/horoscopo:", e.message);
    res.status(500).json({ error: "No disponible" });
  }
});

/* ───────────── Lecturas de tarot ───────────── */

const ultimaPeticion = new Map(); // límite simple por IP
const ESPERA_LECTURA_MS = 10000;

// Limpia la tabla de IPs cada 10 minutos para que no crezca sin fin
setInterval(() => {
  const limite = Date.now() - ESPERA_LECTURA_MS;
  for (const [ip, t] of ultimaPeticion) if (t < limite) ultimaPeticion.delete(ip);
}, 10 * 60 * 1000);

app.post("/api/lectura", async (req, res) => {
  const ip = req.ip;
  if (Date.now() - (ultimaPeticion.get(ip) || 0) < ESPERA_LECTURA_MS) {
    return res.status(429).json({ error: "Espera unos segundos entre lecturas" });
  }
  ultimaPeticion.set(ip, Date.now());

  const { pregunta, cartas } = req.body || {};
  if (
    typeof pregunta !== "string" ||
    !Array.isArray(cartas) ||
    cartas.length < 1 ||
    cartas.length > 5
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const preguntaLimpia = pregunta.slice(0, 300);
  const cartasLimpias = cartas.slice(0, 5).map(c => String(c).slice(0, 40));

  const prompt = `Eres una tarotista cálida y misteriosa. Interpreta ÚNICAMENTE estas cartas, en este orden: ${cartasLimpias.join(", ")}.
Pregunta de la persona: "${preguntaLimpia}"
Reglas:
- Español de México, entre 120 y 180 palabras.
- Reflexiva, nunca afirmaciones absolutas sobre el futuro.
- No hagas predicciones médicas, legales ni financieras.
- Si la pregunta no tiene que ver con el tarot, redirige con amabilidad.
- Si la persona menciona una crisis emocional, responde con empatía y sugiere hablar con alguien de confianza o un profesional.`;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY");
    const data = await llamarGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 600 }
    });
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new Error("Respuesta vacía de Gemini");
    res.json({ texto });
  } catch (e) {
    console.error("Error en /api/lectura:", e.message);
    res.status(500).json({ error: "No se pudo generar la lectura" });
  }
});

/* ───────────── Archivos públicos ───────────── */

// Mueve tu HTML, CSS, JS e imágenes a la carpeta "public"
app.use(express.static("public"));

app.listen(3000, () => console.log("Servidor en http://localhost:3000"));

// Genera el del día al arrancar y revisa cada hora (así cambia solo al día siguiente)
obtener().catch(() => {});
setInterval(() => obtener().catch(() => {}), 60 * 60 * 1000);