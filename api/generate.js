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

  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  if (!CLAUDE_KEY) return res.status(500).json({ error: "Sin API key de Claude" });

  const { nombre, fecha, hora, ciudad } = body;

  let claudeRes, claudeData;
  try {
    claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: `Eres el motor de VER·A, plataforma de educación emocional personalizada en español.
Generas perfiles profundos y motivadores basados en fecha, hora y lugar de nacimiento.
NUNCA uses términos técnicos: astrología, planetas, signos, casas, Kabbalah, chakras.
USA SIEMPRE: código de origen, fuerzas, áreas de vida, equilibrio energético, herida original, frecuencia de origen.
Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "quienEres": "4-5 oraciones sobre identidad profunda",
  "tuEnergia": {
    "descripcion": "2-3 oraciones sobre cómo procesa la realidad",
    "distribucion": {"accion": número, "pensamiento": número, "emocion": número, "intuicion": número}
  },
  "tuProposito": "4-5 oraciones sobre pasión talento misión y camino",
  "tuFrecuenciaDeOrigen": "3-4 oraciones sobre su vibración única",
  "tuEquilibrioEnergetico": {
    "diagnostico": "2-3 oraciones sobre el desequilibrio y su impacto",
    "elementoDebil": "Fuego o Tierra o Aire o Agua",
    "practicas": ["práctica PNL 1", "práctica PNL 2", "práctica PNL 3"],
    "frecuencia": {"hz": "número hz", "nombre": "nombre de la frecuencia"}
  },
  "tuHerida": "4-5 oraciones sobre la herida profunda y cómo convertirla en poder",
  "tuMomentoActual": "3-4 oraciones sobre el ciclo actual y su oportunidad",
  "tuPracticaDiaria": {
    "gratitud": "frase de gratitud personalizada",
    "conexion": "oración de conexión con algo más grande sin religión",
    "pregunta": "pregunta de inteligencia emocional para este momento"
  },
  "mensajeFinal": "3-4 oraciones motivadoras de cierre"
}`,
        messages: [{
          role: "user",
          content: `Genera el perfil VER·A completo para:
Nombre: ${nombre}
Fecha de nacimiento: ${fecha}
Hora de nacimiento: ${hora}
Ciudad de nacimiento: ${ciudad}

Personaliza cada sección profundamente para esta persona específica.
Los 4 valores de distribucion deben sumar exactamente 100.`
        }]
      })
    });
    claudeData = await claudeRes.json();
  } catch(err) {
    return res.status(500).json({ error: "Claude fetch error: " + err.message });
  }

  if (claudeRes.status !== 200) {
    return res.status(500).json({ 
      error: "Claude API error", 
      status: claudeRes.status,
      detalle: claudeData 
    });
  }

  const texto = (claudeData.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  
  let perfil;
  try {
    perfil = JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch(err) {
    return res.status(500).json({ error: "JSON parse error", texto_recibido: texto.slice(0, 300) });
  }

  return res.status(200).json({ success: true, nombre, perfil });
};
