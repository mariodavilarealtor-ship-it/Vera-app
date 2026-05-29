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
 
  const {
    nombre, fecha, hora, ciudad, ciudadActual,
    dolor, emocion, relacion, dinero,
    signoSolar, elementoDominante, elementoDebil,
    codigo72Numero, codigo72Nombre, quiron
  } = body;
 
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
 
  if (!CLAUDE_KEY) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel." });
  }
 
  const prompt = `Eres el motor de VER·A, una plataforma de educación emocional. Genera un perfil profundo y personalizado.
 
DATOS DE LA PERSONA:
- Nombre: ${nombre}
- Fecha de nacimiento: ${fecha}
- Hora: ${hora || 'no proporcionada'}
- Ciudad natal: ${ciudad}
- Ciudad actual: ${ciudadActual || ciudad}
 
RESPUESTAS EMOCIONALES (úsalas para personalizar todo el perfil):
- Cuando algo le duele: ${dolor}
- Emoción que más le cuesta sentir: ${emocion}
- Patrón en sus relaciones: ${relacion}
- Lo que siente ante el dinero: ${dinero}
 
DATOS INTERNOS DEL MOTOR (NUNCA los menciones literalmente al usuario, úsalos solo como base):
- elemento débil a fortalecer: ${elementoDebil}
- elemento dominante: ${elementoDominante}
- número de frecuencia de origen: ${codigo72Numero}
- nombre de frecuencia de origen: ${codigo72Nombre}
- herida base: ${quiron}
 
REGLAS DE LENGUAJE VER·A (CRÍTICAS):
- NUNCA uses las palabras: astrología, planetas, signos zodiacales, casas astrológicas, Kabbalah, horóscopo, ni términos esotéricos.
- Usa el lenguaje propio de VER·A: "tu código de origen", "tu equilibrio energético", "tu herida original", "tu frecuencia de origen", "tu mapa de lugares".
- Tono: cálido, profundo, directo. Cada sección debe dejar a la persona MOTIVADA A ACTUAR, no solo a reflexionar.
- Influencias: educación emocional, PNL, autodesarrollo. Habla de prácticas concretas.
 
Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto antes o después, sin bloques de código. El JSON debe tener EXACTAMENTE esta estructura con EXACTAMENTE estas claves:
 
{
  "opening": "string — bienvenida personalizada e impactante, 2-3 oraciones",
  "quien_eres": "string — descripción profunda de su esencia, 3-4 oraciones",
  "tres_fuerzas": ["fuerza 1 (frase corta)", "fuerza 2", "fuerza 3"],
  "energia": {
    "pensamiento": numero entre 0 y 100,
    "emocion": numero entre 0 y 100,
    "accion": numero entre 0 y 100,
    "intuicion": numero entre 0 y 100,
    "descripcion": "string — explica su energía dominante y qué debe equilibrar, 2-3 oraciones"
  },
  "proposito": {
    "pasion": "string corto",
    "talento": "string corto",
    "mision": "string corto",
    "camino": "string corto",
    "frase": "string — frase poderosa entre comillas"
  },
  "codigo_72": {
    "numero": ${codigo72Numero},
    "nombre": "${codigo72Nombre}",
    "descripcion": "string — qué significa este código de origen para esta persona, 2-3 oraciones",
    "bloqueo": "string — qué bloquea este código cuando opera desde el miedo, 1 oración",
    "afirmacion": "string — afirmación entre comillas"
  },
  "equilibrio": {
    "elemento_debil": "${elementoDebil}",
    "descripcion": "string — explica su área de mayor crecimiento SIN nombrar el elemento como astrología, 2-3 oraciones",
    "practicas": ["práctica concreta 1 de PNL o hábito", "práctica concreta 2", "práctica concreta 3"],
    "frecuencia": "string — ej '417 Hz — Rompe bloqueos y activa el movimiento'"
  },
  "herida_don": {
    "herida": "string — su herida original descrita con empatía, 2 oraciones",
    "don": "string — el don que esconde esa herida, 2 oraciones",
    "practica_pnl": "string — una práctica de reencuadre concreta para esta semana",
    "frase": "string — frase entre comillas"
  },
  "vinculos": {
    "patron": "string — su patrón relacional, 2 oraciones",
    "señal": "string — una señal de alerta concreta a observar",
    "frase": "string — frase entre comillas"
  },
  "dinero": {
    "patron": "string — su relación emocional con el dinero, 2 oraciones",
    "transformacion": "string — el reencuadre que necesita, 1-2 oraciones",
    "practica": "string — práctica concreta para esta semana"
  },
  "momento_actual": "ESTE CAMPO ES UN STRING DE TEXTO CORRIDO. NO es un objeto, NO tiene subcampos, NO uses llaves. Escribe 4-5 oraciones seguidas describiendo el momento vital actual de la persona y empujándola a actuar.",
  "ciudades": [
    {"emoji": "📍", "ciudad": "${ciudadActual || ciudad} — Donde estás", "descripcion": "string corto"},
    {"emoji": "🥇", "ciudad": "nombre de ciudad", "descripcion": "por qué resuena con esta persona"},
    {"emoji": "🥈", "ciudad": "nombre de ciudad", "descripcion": "por qué resuena"},
    {"emoji": "🥉", "ciudad": "nombre de ciudad", "descripcion": "por qué resuena"}
  ],
  "frecuencias": [
    {"cuando": "Cuando la mente no para", "hz": "7.83 Hz — La Tierra"},
    {"cuando": "Cuando no puedes expresarte", "hz": "741 Hz — Comunicación"},
    {"cuando": "Cuando algo te pesa", "hz": "396 Hz — Liberación"},
    {"cuando": "Cuando nada fluye", "hz": "417 Hz — Movimiento"},
    {"cuando": "Cuando necesitas reconectarte", "hz": "963 Hz — Origen"}
  ],
  "practica_diaria": {
    "gratitud": "string — una pregunta de gratitud personalizada",
    "conexion": "string — frase de conexión con algo más grande que el miedo, sin religión, entre comillas",
    "emocion_hoy": "string — una pregunta de inteligencia emocional para hoy"
  },
  "frase_final": "string — frase poderosa de cierre personalizada",
  "pregunta_transformadora": "string — pregunta profunda para reflexión"
}
 
REGLA ABSOLUTA: momento_actual debe ser texto corrido, nunca un objeto. Los campos numéricos de "energia" deben ser números, no strings. Respeta los valores ya dados de codigo_72.numero, codigo_72.nombre, equilibrio.elemento_debil y la primera ciudad.`;
 
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: "Eres el motor de VER·A. Respondes SOLO con JSON puro y válido, sin ningún texto adicional ni bloques markdown. Sigues exactamente la estructura de claves pedida. El campo momento_actual es siempre un string de texto corrido. Los campos de energia son números. Nunca usas la palabra astrología ni términos esotéricos.",
        messages: [{ role: "user", content: prompt }]
      })
    });
 
    const rawText = await claudeRes.text();
 
    if (!claudeRes.ok) {
      return res.status(502).json({
        error: "La API de Claude devolvió un error",
        status: claudeRes.status,
        detalle: rawText.slice(0, 1000)
      });
    }
 
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
 
    if (!texto.trim()) {
      return res.status(502).json({
        error: "Claude respondió sin contenido de texto",
        detalle: JSON.stringify(claudeData).slice(0, 1000)
      });
    }
 
    const limpio = texto.replace(/```json\n?|```/g, "").trim();
 
    let perfil;
    try {
      perfil = JSON.parse(limpio);
    } catch (e) {
      return res.status(502).json({
        error: "El perfil generado no es JSON válido",
        detalle: limpio.slice(0, 1000)
      });
    }
 
    // Red de seguridad: garantizar que ningun campo que el frontend lee venga undefined
    perfil.opening = perfil.opening || "";
    perfil.quien_eres = perfil.quien_eres || "";
    perfil.tres_fuerzas = Array.isArray(perfil.tres_fuerzas) ? perfil.tres_fuerzas : [];
 
    perfil.energia = perfil.energia || {};
    perfil.energia.pensamiento = perfil.energia.pensamiento ?? 25;
    perfil.energia.emocion = perfil.energia.emocion ?? 25;
    perfil.energia.accion = perfil.energia.accion ?? 25;
    perfil.energia.intuicion = perfil.energia.intuicion ?? 25;
    perfil.energia.descripcion = perfil.energia.descripcion || "";
 
    perfil.proposito = perfil.proposito || {};
    ["pasion","talento","mision","camino","frase"].forEach(k => { perfil.proposito[k] = perfil.proposito[k] || ""; });
 
    perfil.codigo_72 = perfil.codigo_72 || {};
    perfil.codigo_72.numero = perfil.codigo_72.numero ?? codigo72Numero ?? "";
    perfil.codigo_72.nombre = perfil.codigo_72.nombre || codigo72Nombre || "";
    perfil.codigo_72.descripcion = perfil.codigo_72.descripcion || "";
    perfil.codigo_72.bloqueo = perfil.codigo_72.bloqueo || "";
    perfil.codigo_72.afirmacion = perfil.codigo_72.afirmacion || "";
 
    perfil.equilibrio = perfil.equilibrio || {};
    perfil.equilibrio.elemento_debil = perfil.equilibrio.elemento_debil || elementoDebil || "";
    perfil.equilibrio.descripcion = perfil.equilibrio.descripcion || "";
    perfil.equilibrio.practicas = Array.isArray(perfil.equilibrio.practicas) ? perfil.equilibrio.practicas : [];
    perfil.equilibrio.frecuencia = perfil.equilibrio.frecuencia || "";
 
    perfil.herida_don = perfil.herida_don || {};
    ["herida","don","practica_pnl","frase"].forEach(k => { perfil.herida_don[k] = perfil.herida_don[k] || ""; });
 
    perfil.vinculos = perfil.vinculos || {};
    ["patron","señal","frase"].forEach(k => { perfil.vinculos[k] = perfil.vinculos[k] || ""; });
 
    perfil.dinero = perfil.dinero || {};
    ["patron","transformacion","practica"].forEach(k => { perfil.dinero[k] = perfil.dinero[k] || ""; });
 
    // momento_actual: logica original, por si viniera como objeto
    if (typeof perfil.momento_actual === 'object' && perfil.momento_actual !== null) {
      const m = perfil.momento_actual;
      perfil.momento_actual = [
        m.ciclo_de_vida, m.fase_del_ciclo, m.ventana,
        m.tension_activa, m.accion_semana, m.frase
      ].filter(Boolean).join(' ');
    }
    if (!perfil.momento_actual) {
      perfil.momento_actual = "Estás en un momento de transición significativa. Las decisiones que tomes ahora definirán el próximo ciclo de tu vida.";
    }
 
    perfil.ciudades = Array.isArray(perfil.ciudades) ? perfil.ciudades : [];
    perfil.frecuencias = Array.isArray(perfil.frecuencias) ? perfil.frecuencias : [];
 
    perfil.practica_diaria = perfil.practica_diaria || {};
    ["gratitud","conexion","emocion_hoy"].forEach(k => { perfil.practica_diaria[k] = perfil.practica_diaria[k] || ""; });
 
    perfil.frase_final = perfil.frase_final || "";
    perfil.pregunta_transformadora = perfil.pregunta_transformadora || "";
 
    return res.status(200).json(perfil);
 
  } catch(err) {
    return res.status(500).json({ error: "Error generando perfil: " + err.message });
  }
};
