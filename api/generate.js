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
 
  // --- Verificación temprana de la key (falla con un mensaje claro, no genérico) ---
  if (!CLAUDE_KEY) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel." });
  }
 
  const prompt = `Genera el perfil VER·A para: Nombre: ${nombre}, Fecha de nacimiento: ${fecha}, Hora: ${hora}, Ciudad: ${ciudad}.
 
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto antes o después, sin bloques de código.
 
El JSON debe tener EXACTAMENTE estas claves con EXACTAMENTE estos nombres:
{
  "opening": "string - bienvenida personalizada 2-3 oraciones",
  "quien_eres": "string - descripción profunda de su esencia",
  "tres_fuerzas": ["fuerza1", "fuerza2", "fuerza3"],
  "energia": "string - descripción de su energía dominante",
  "proposito": "string - su propósito de vida",
  "momento_actual": "ESTE CAMPO ES UN STRING DE TEXTO CORRIDO. NO es un objeto. NO tiene subcampos. NO uses llaves. Escribe 4-5 oraciones seguidas describiendo el momento vital actual de la persona. Ejemplo del formato correcto: 'Estás en un ciclo de consolidación profunda. La vida te pide integrar todo lo aprendido en los últimos años. Tienes una ventana de 18 meses para tomar decisiones que definirán el próximo capítulo. La tensión que sientes no es una señal de crisis sino de crecimiento. Esta semana es momento de actuar.'",
  "practica_diaria": "string - práctica recomendada personalizada",
  "frase_final": "string - frase poderosa personalizada",
  "pregunta_transformadora": "string - pregunta profunda para reflexión",
  "vinculos": "string - descripción de sus patrones relacionales",
  "dinero": "string - descripción de su relación con la abundancia",
  "ciudades": [{"ciudad": "nombre", "razon": "por qué resuena con esta persona"}],
  "frecuencias": [{"hz": numero, "cuando": "cuándo usarla", "para": "para qué sirve"}]
}
 
REGLA ABSOLUTA: momento_actual debe ser texto corrido como el ejemplo. NUNCA un objeto con ciclo_de_vida, fase_del_ciclo, ventana, tension_activa, accion_semana o frase como subcampos.
NUNCA uses: astrología, planetas, signos zodiacales, casas astrológicas, Kabbalah, términos esotéricos.`;
 
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
        system: "Eres el motor de VER·A. Responde SOLO con JSON puro y válido. Ningún texto adicional. Ningún bloque markdown. Solo el objeto JSON. CRÍTICO: el campo momento_actual debe ser siempre un string de texto corrido, nunca un objeto JSON con subcampos.",
        messages: [{ role: "user", content: prompt }]
      })
    });
 
    // --- 1. Leer SIEMPRE el cuerpo como texto primero (nunca .json() a ciegas) ---
    const rawText = await claudeRes.text();
 
    // --- 2. Si la API devolvió un error HTTP, mostrarlo TAL CUAL (no enmascararlo) ---
    if (!claudeRes.ok) {
      return res.status(502).json({
        error: "La API de Claude devolvió un error",
        status: claudeRes.status,
        detalle: rawText.slice(0, 1000)
      });
    }
 
    // --- 3. Parsear la envoltura de la respuesta de Claude con red de seguridad ---
    let claudeData;
    try {
      claudeData = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({
        error: "Respuesta no-JSON de la API de Claude",
        detalle: rawText.slice(0, 1000)
      });
    }
 
    const texto = (claudeData.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
 
    // --- 4. Si el texto vino vacío, decirlo claramente (esto era lo que reventaba) ---
    if (!texto.trim()) {
      return res.status(502).json({
        error: "Claude respondió sin contenido de texto",
        detalle: JSON.stringify(claudeData).slice(0, 1000)
      });
    }
 
    const limpio = texto.replace(/```json\n?|```/g, "").trim();
 
    // --- 5. Parsear el perfil con mensaje útil si Claude no devolvió JSON limpio ---
    let perfil;
    try {
      perfil = JSON.parse(limpio);
    } catch (e) {
      return res.status(502).json({
        error: "El perfil generado no es JSON válido",
        detalle: limpio.slice(0, 1000)
      });
    }
 
    // --- Tu lógica original de momento_actual, intacta ---
    if (typeof perfil.momento_actual === 'object' && perfil.momento_actual !== null) {
      const m = perfil.momento_actual;
      perfil.momento_actual = [
        m.ciclo_de_vida,
        m.fase_del_ciclo,
        m.ventana,
        m.tension_activa,
        m.accion_semana,
        m.frase
      ].filter(Boolean).join(' ');
    }
 
    if (!perfil.momento_actual) {
      perfil.momento_actual = "Estás en un momento de transición significativa. Las decisiones que tomes ahora definirán el próximo ciclo de tu vida.";
    }
 
    return res.status(200).json(perfil);
 
  } catch(err) {
    return res.status(500).json({ error: "Error generando perfil: " + err.message });
  }
};
