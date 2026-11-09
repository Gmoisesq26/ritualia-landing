const key = process.env.GEMINI_API_KEY;
console.log("Key cargada:", key ? "sí (" + key.slice(0, 4) + "...)" : "NO");

// Lista los modelos que tu key sí puede usar
const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "x-goog-api-key": key }
});
console.log("Status:", r.status);
const data = await r.json();
if (data.models) {
  console.log(data.models.map(m => m.name).join("\n"));
} else {
  console.log(data);
}