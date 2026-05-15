const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
// CORS
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
res.writeHead(200);
res.end();
return;
}

// Health check
if (req.method === "GET" && req.url === "/") {
res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify({ status: "VER·A API funcionando" }));
return;
}

// Endpoint principal
if (req.method === "POST" && req.url === "/api/generate") {
let raw = "";
req.on("data", chunk => { raw += chunk; });
req.on("end", async () => {
let body;
try {
body = JSON.parse(raw);
} catch(e) {
res.writeHead(400, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "JSON inválido" }));
return;
}

const { nombre, fecha, hora, ciudad } = body;
if (!nombre || !fecha || !hora || !ciudad) {
res.writeHead(400, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "Faltan campos: nombre, fecha, hora, ciudad" }));
return;
}

const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
if (!CLAUDE_KEY) {
res.writeHead(500, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "API key no configurada" }));
return;
}

try {
const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: {
"Content-Type": "application/json",
"x-api-key": CLAUDE_KEY,
"anthropic-version": "2023-06-01",
},
body: JSON.stringify({
model: "claude-3-haiku-20240307",
max_tokens: 8000,
system: `Eres el motor de VER·A, plataforma de educación emocional personalizada en español.
Generas perfiles profundos y motivadores basados en fecha, hora y lugar de nacimiento.
NUNCA uses términos técnicos: astrología, planetas, signos, casas, Kabbalah, chakras, ángeles.
USA SIEMPRE: código de origen, fuerzas, áreas de vida, equilibrio energético, herida original, frecuencia de origen.
Responde SOLO con JSON válido, sin markdown, sin texto extra, sin backticks:
{
"quienEres": "4-5 oraciones sobre identidad profunda de esta persona específica",
"tuEnergia": {
"descripcion": "2-3 oraciones sobre cómo procesa la realidad",
"distribucion": {"accion": número, "pensamiento": número, "emocion": número, "intuicion": número}
},
"tuProposito": "4-5 oraciones sobre pasión talento misión y camino",
"tuFrecuenciaDeOrigen": "3-4 oraciones sobre su vibración única",
"tuEquilibrioEnergetico": {
"diagnostico": "2-3 oraciones sobre el desequilibrio y su impacto real en la vida",
"elementoDebil": "Fuego o Tierra o Aire o Agua",
"practicas": ["práctica PNL 1 completa y detallada", "práctica PNL 2 completa y detallada", "práctica PNL 3 completa y detallada"],
"frecuencia": {"hz": "número", "nombre": "nombre de la frecuencia"}
},
"tuHerida": "4-5 oraciones sobre la herida profunda y cómo convertirla en el mayor poder",
"tuMomentoActual": "3-4 oraciones sobre el ciclo actual y qué oportunidad trae",
"tuPracticaDiaria": {
"gratitud": "frase de gratitud personalizada y específica para esta persona",
"conexion": "oración que conecte con algo más grande que el miedo, sin religión",
"pregunta": "pregunta de inteligencia emocional específica para este momento de vida"
},
"mensajeFinal": "3-4 oraciones de cierre extremadamente motivadoras y personalizadas"
}`,
messages: [{
role: "user",
content: `Genera el perfil VER·A completo y profundamente personalizado para:
Nombre: ${nombre}
Fecha de nacimiento: ${fecha}
Hora de nacimiento: ${hora}
Ciudad de nacimiento: ${ciudad}

Cada sección debe sentirse como si alguien que conoce profundamente a esta persona la hubiera escrito.
Los 4 valores de distribucion deben sumar exactamente 100.
El perfil debe dejar a la persona MOTIVADA — con ganas de levantarse y hacer algo diferente.`
}]
})
});

const claudeData = await claudeRes.json();

if (claudeRes.status !== 200) {
res.writeHead(500, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "Claude error", detalle: claudeData }));
return;
}

const texto = (claudeData.content || [])
.filter(b => b.type === "text")
.map(b => b.text)
.join("");

let perfil;
try {
perfil = JSON.parse(texto.replace(/```json|```/g, "").trim());
} catch(e) {
res.writeHead(500, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "Parse error", texto: texto.slice(0, 300) }));
return;
}

res.writeHead(200, { "Content-Type": "application/json" });
res.end(JSON.stringify({ success: true, nombre, perfil }));

} catch(err) {
res.writeHead(500, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "Error interno: " + err.message }));
}
});
return;
}

res.writeHead(404, { "Content-Type": "application/json" });
res.end(JSON.stringify({ error: "Ruta no encontrada" }));
});

server.listen(PORT, () => {
console.log(`VER·A API corriendo en puerto ${PORT}`);
});
