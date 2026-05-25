export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido" });

  const body = req.body;
  const { nombre, fecha, hora, ciudad } = body;

  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  if (!CLAUDE_KEY) return res.status(500).json({ error: "Sin API key" });

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
      system: `Eres el motor de VER·A. Responde SOLO con JSON válido sin markdown. El JSON debe tener exactamente estas claves: opening, quien_eres, tres_fuerzas, energia, proposito, momento_actual, practica_diaria, frase_final, pregunta_transformadora, vinculos, dinero, ciudades, frecuencias. El campo momento_actual es un string con 3-4 oraciones sobre el ciclo actual de la persona. NUNCA uses: astrología, planetas, signos, casas, Kabbalah.`,
      messages: [{
        role: "user",
        content: `Genera el perfil VER·A para:
Nombre: ${nombre}
Fecha: ${fecha}
Hora: ${hora}
Ciudad: ${ciudad}`
      }]
    })
  });

  const claudeData = await claudeRes.json();
  const texto = (claudeData.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const perfil = JSON.parse(texto.replace(/```json\n?|```/g, "").trim());

  return res.status(200).json(perfil);
}
