// VER·A — api/generate.js — DIAGNÓSTICO FINAL
// Retorna el error exacto de cada API para identificar la causa raíz

module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Método no permitido” });

// BODY PARSING
let body;
try {
body = await new Promise((resolve, reject) => {
let raw = “”;
req.on(“data”, chunk => { raw += chunk; });
req.on(“end”, () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
req.on(“error”, reject);
});
} catch(err) {
return res.status(400).json({ paso: “BODY”, error: err.message });
}

const { nombre, fecha, hora, ciudad } = body;
if (!nombre || !fecha || !hora || !ciudad) {
return res.status(400).json({ paso: “VALIDACION”, error: “Faltan campos”, recibido: body });
}

const [year, month, day] = fecha.split(”-”).map(Number);
const [hour, minute] = hora.split(”:”).map(Number);
const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

// PRUEBA 1: Variables de entorno
if (!ASTRO_KEY || !CLAUDE_KEY) {
return res.status(500).json({
paso: “ENV_VARS”,
astro_key_existe: !!ASTRO_KEY,
claude_key_existe: !!CLAUDE_KEY
});
}

// PRUEBA 2: Claude directo — sin astrology-api
let claudeStatus, claudeRaw;
try {
const cr = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: CLAUDE_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 100,
messages: [{ role: “user”, content: `Responde solo: HOLA ${nombre}` }],
}),
});
claudeStatus = cr.status;
claudeRaw = await cr.json();
} catch(err) {
return res.status(500).json({ paso: “CLAUDE_FETCH”, error: err.message });
}

if (claudeStatus !== 200) {
return res.status(500).json({
paso: “CLAUDE_ERROR”,
status: claudeStatus,
respuesta_completa: claudeRaw
});
}

const claudeText = claudeRaw?.content?.[0]?.text || “”;

// PRUEBA 3: astrology-api.io
let astroStatus, astroRaw;
try {
const birthPayload = {
datetime: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`,
latitude: 10.18,
longitude: -67.99,
timezone: “America/Caracas”,
house_system: “placidus”,
};
const ar = await fetch(“https://api.astrology-api.io/api/v3/data/positions”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“Authorization”: `Bearer ${ASTRO_KEY}`,
},
body: JSON.stringify(birthPayload),
});
astroStatus = ar.status;
astroRaw = await ar.json();
} catch(err) {
return res.status(500).json({ paso: “ASTRO_FETCH”, error: err.message });
}

// RESULTADO COMPLETO
return res.status(200).json({
diagnostico: “COMPLETO”,
claude: {
status: claudeStatus,
respuesta: claudeText
},
astrology: {
status: astroStatus,
respuesta: JSON.stringify(astroRaw).slice(0, 500)
}
});
};
