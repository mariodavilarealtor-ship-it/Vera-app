module.exports = async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");
if (req.method === "OPTIONS") return res.status(200).end();
if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido" });

let body;
try {
body = await new Promise((resolve, reject) => {
let raw = "";
req.on("data", chunk => { raw += chunk; });
req.on("end", () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
req.on("error", reject);
});
} catch(err) {
return res.status(400).json({ error: "Body error: " + err.message });
}

const { nombre, fecha, hora, ciudad } = body;
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

try {
const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: {
"Content-Type": "application/json",
"x-api-key": CLAUDE_KEY,
"anthropic-version": "2023-06-01"
},
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 8000,
system: `Eres el motor de VER·A. Responde SOLO con JSON válido sin markdown ni texto extra. El JSON debe tener exactamente estas claves en snake_case: opening, quien_eres, tres_fuerzas, energia, proposito, momento_actual, practica_diaria, frase_final, pregunta_transformadora, vinculos, dinero, ciudades, frecuencias. El campo momento_actual DEBE ser un string simple (no objeto, no array) con 3-4 oraciones sobre el ciclo vital actual de la persona. NUNCA uses: astrología, planetas, signos, casas, Kabbalah.`,
messages: [{
role: "user",
content: `Genera el perfil VER·A para: Nombre: ${nombre}, Fecha: ${fecha}, Hora: ${hora}, Ciudad: ${ciudad}`
}]
})
});

const claudeData = await claudeRes.json();

// Log para diagnóstico
console.log("Claude raw:", JSON.stringify(claudeData).substring(0, 500));

const texto = (claudeData.content || [])
.filter(b => b.type === "text")
.map(b => b.text)
.join("");

const perfil = JSON.parse(texto.replace(/```json\n?|```/g, "").trim());

// Normalizar momento_actual si viene como objeto
if (typeof perfil.momento_actual === "object") {
perfil.momento_actual = Object.values(perfil.momento_actual).join(" ");
}
if (!perfil.momento_actual) {
perfil.momento_actual = "Tu momento actual está en proceso de cálculo. Vuelve a generar tu perfil.";
}

return res.status(200).json(perfil);

} catch(err) {
console.error("Error generando perfil:", err.message);
return res.status(500).json({ error: "Error generando perfil: " + err.message });
}
};

