// =============================================================
// VER·A — api/generate.js
// URLs corregidas: astrology-api.io v3 + Bearer auth
// =============================================================

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // ── BODY PARSING MANUAL (Vercel Node 24) ──────────────────
  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", chunk => { raw += chunk; });
      req.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON inválido")); }
      });
      req.on("error", reject);
    });
  } catch (err) {
    return res.status(400).json({ error: "Error leyendo datos: " + err.message });
  }

  const { nombre, fecha, hora, ciudad, ciudadActual } = body;
  if (!nombre || !fecha || !hora || !ciudad) {
    return res.status(400).json({ error: "Faltan campos: nombre, fecha, hora, ciudad." });
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  const ciudadFinal = ciudadActual || ciudad;

  const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ASTRO_KEY || !CLAUDE_KEY) {
    return res.status(500).json({ error: "Variables de entorno no configuradas." });
  }

  // =============================================================
  // PASO 1 — astrology-api.io v3
  // =============================================================
  const ASTRO_BASE = "https://api.astrology-api.io";
  const astroHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ASTRO_KEY}`,
  };

  const birthPayload = {
    datetime: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`,
    latitude: 10.18,
    longitude: -67.99,
    timezone: "America/Caracas",
    house_system: "placidus",
  };

  let positionsData = null;

  try {
    const posRes = await fetch(`${ASTRO_BASE}/api/v3/data/positions`, {
      method: "POST",
      headers: astroHeaders,
      body: JSON.stringify(birthPayload),
    });
    positionsData = await posRes.json();
    console.log("positions status:", posRes.status);
    console.log("positionsData:", JSON.stringify(positionsData).slice(0, 400));
  } catch (err) {
    console.error("Error astrology-api.io:", err.message);
    positionsData = null;
  }

  // =============================================================
  // PASO 2 — PROCESAMIENTO
  // =============================================================

  function getElementFromSign(sign) {
    const map = {
      Aries: "fuego", Leo: "fuego", Sagittarius: "fuego",
      Taurus: "tierra", Virgo: "tierra", Capricorn: "tierra",
      Gemini: "aire", Libra: "aire", Aquarius: "aire",
      Cancer: "agua", Scorpio: "agua", Pisces: "agua",
    };
    return map[sign] || null;
  }

  function calculateEnergy(data) {
    const weights = { Sun: 4, Moon: 3, Ascendant: 3, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1 };
    const counts = { fuego: 0, tierra: 0, aire: 0, agua: 0 };
    let total = 0;
    const arr = Array.isArray(data) ? data : (data?.planets || data?.positions || data?.bodies || []);
    arr.forEach(p => {
      const sign = p.sign || p.zodiac_sign || p.zodiacSign || p.sign_name || "";
      const name = p.name || p.planet || p.body || p.id || "";
      const el = getElementFromSign(sign);
      const w = weights[name] || 1;
      if (el) { counts[el] += w; total += w; }
    });
    if (total === 0) return { fuego: 40, tierra: 10, aire: 30, agua: 20 };
    return {
      fuego: Math.round((counts.fuego / total) * 100),
      tierra: Math.round((counts.tierra / total) * 100),
      aire: Math.round((counts.aire / total) * 100),
      agua: Math.round((counts.agua / total) * 100),
    };
  }

  function getChironDesc(data) {
    const arr = Array.isArray(data) ? data : (data?.planets || data?.positions || data?.bodies || []);
    const chiron = arr.find(p => (p.name || p.planet || p.body || p.id || "").toLowerCase().includes("chiron"));
    if (!chiron) return "la herida de no sentirte suficiente en tu área de mayor esfuerzo";
    const sign = chiron.sign || chiron.zodiac_sign || chiron.zodiacSign || "";
    const signMap = {
      Aries: "la herida de existir — sentir que no tienes derecho a ocupar espacio",
      Taurus: "la herida de valor propio — sentir que lo que eres no es suficiente",
      Gemini: "la herida de expresión — sentir que tu voz no vale la pena",
      Cancer: "la herida de pertenencia — sentir que no tienes un lugar seguro",
      Leo: "la herida de visibilidad — sentir miedo de brillar",
      Virgo: "la herida de perfección — sentir que nunca es suficiente lo que haces",
      Libra: "la herida de relación — sentir que no mereces amor equilibrado",
      Scorpio: "la herida de confianza — sentir que el mundo es peligroso",
      Sagittarius: "la herida de significado — sentir que no sabes para qué estás aquí",
      Capricorn: "la herida de autoridad — sentir que tienes que ganarte el derecho a todo",
      Aquarius: "la herida de diferencia — sentir que eres demasiado diferente",
      Pisces: "la herida de límites — sentir que te disuelves en los demás",
    };
    return signMap[sign] || "la herida de no sentirte suficiente";
  }

  const energy = calculateEnergy(positionsData);
  const chironDesc = getChironDesc(positionsData);
  const elementoDebil = Object.entries(energy).sort((a, b) => a[1] - b[1])[0][0];

  const practicasPNL = {
    fuego: [
      "Ancla de poder: recuerda 3 momentos en que actuaste con valentía. Cierra los ojos, revívelos en detalle, luego presiona tu pulgar e índice juntos. Repite durante 7 días para crear un ancla de acción.",
      "Reencuadre de acción: cuando notes que postergas, di en voz alta: 'Soy alguien que actúa antes de sentirse listo.' Escribe esto en un lugar visible.",
      "Visualización activa: cada mañana imagina durante 2 minutos que ya completaste la tarea más difícil del día. Siente el orgullo en el cuerpo antes de empezar.",
    ],
    tierra: [
      "Ancla de recursos: identifica un objeto físico que represente estabilidad para ti. Tócalo cuando necesites conectarte con lo concreto.",
      "Práctica de presencia: una vez al día, haz algo con tus manos durante 10 minutos sin pantallas — cocinar, ordenar, escribir a mano.",
      "Lista de lo real: cada noche escribe 3 cosas concretas que lograste ese día, por pequeñas que sean.",
    ],
    aire: [
      "Mapa mental espontáneo: toma una hoja y escribe tu nombre en el centro. Conecta todo lo que se te ocurra sin juzgar.",
      "Conversación generativa: habla con alguien sobre una idea nueva esta semana, no para convencer, sino para explorar.",
      "Diario de preguntas: en vez de buscar respuestas, escribe 5 preguntas que te generen curiosidad hoy.",
    ],
    agua: [
      "Escaneo emocional: tres veces al día detente 30 segundos y pregúntate qué estás sintiendo exactamente. Ponle nombre.",
      "Carta sin enviar: escribe una carta a alguien o algo que te haya causado dolor. No tienes que enviarla. Solo sentir.",
      "Ducha consciente: mientras el agua cae, imagina que limpia lo que cargaste emocionalmente ese día.",
    ],
  };

  const frecuencia = {
    fuego: { hz: "417", nombre: "Movimiento y Desbloqueo" },
    tierra: { hz: "528", nombre: "Restauración y Amor" },
    aire: { hz: "852", nombre: "Intuición y Claridad" },
    agua: { hz: "396", nombre: "Liberación Emocional" },
  };

  // =============================================================
  // PASO 3 — CLAUDE
  // =============================================================
  const systemPrompt = `Eres el motor de VER·A, plataforma de educación emocional personalizada.
Tu misión: generar un perfil que deje a la persona MOTIVADA — con ganas de levantarse y hacer algo diferente.

REGLAS ABSOLUTAS — NUNCA uses: astrología, carta natal, planetas, signos zodiacales, casas, Kabbalah, chakras, ángeles, Quirón, tránsitos, grados, nombres de signos (Aries, Tauro, Leo, etc.).
USA SIEMPRE: código de origen, fuerzas, áreas de vida, patrones de energía, frecuencia de origen, herida original, ciclos activos, equilibrio energético.

Responde SOLO con este JSON exacto, sin texto adicional, sin markdown, sin backticks:
{
  "quienEres": "4-5 oraciones sobre identidad profunda. Quién es en su núcleo.",
  "tuEnergia": {
    "descripcion": "2-3 oraciones sobre cómo procesa la realidad.",
    "distribucion": { "accion": número, "pensamiento": número, "emocion": número, "intuicion": número }
  },
  "tuProposito": "4-5 oraciones sobre pasión, talento, misión y camino de vida.",
  "tuFrecuenciaDeOrigen": "3-4 oraciones sobre su vibración única. Sin mencionar números ni sistemas externos.",
  "tuEquilibrioEnergetico": {
    "diagnostico": "2-3 oraciones sobre el desequilibrio y su impacto real en la vida.",
    "elementoDebil": "nombre en español (Fuego/Tierra/Aire/Agua)",
    "practicas": ["práctica 1 completa", "práctica 2 completa", "práctica 3 completa"],
    "frecuencia": { "hz": "número", "nombre": "nombre" }
  },
  "tuHerida": "4-5 oraciones sobre la herida y cómo convertirla en el mayor poder. Cálido y transformador.",
  "tuMomentoActual": "3-4 oraciones sobre el ciclo actual y qué oportunidad trae.",
  "tuPracticaDiaria": {
    "gratitud": "Frase de gratitud personalizada de 3-4 palabras específicas a este perfil.",
    "conexion": "Una oración que conecte con algo más grande que el miedo. Sin religión.",
    "pregunta": "Una pregunta de inteligencia emocional específica para este momento."
  },
  "mensajeFinal": "3-4 oraciones de cierre. Lo más motivador del perfil completo."
}`;

  const userPrompt = `Genera el perfil VER·A para:
Nombre: ${nombre}
Fecha de nacimiento: ${day}/${month}/${year}
Hora: ${hour}:${String(minute).padStart(2,"0")}
Ciudad de nacimiento: ${ciudad}
Ciudad actual: ${ciudadFinal}

Distribución energética real calculada desde sus datos:
- Acción (Fuego): ${energy.fuego}%
- Emoción (Tierra): ${energy.tierra}%
- Pensamiento (Aire): ${energy.aire}%
- Intuición (Agua): ${energy.agua}%
Elemento débil detectado: ${elementoDebil}

Herida original detectada: ${chironDesc}

Prácticas PNL para equilibrar el elemento débil (usa estas exactamente):
1. ${practicasPNL[elementoDebil][0]}
2. ${practicasPNL[elementoDebil][1]}
3. ${practicasPNL[elementoDebil][2]}

Frecuencia asignada: ${frecuencia[elementoDebil].hz} Hz — ${frecuencia[elementoDebil].nombre}

IMPORTANTE: Los valores en tuEnergia.distribucion deben sumar 100 y coincidir con los porcentajes dados arriba.`;

  let perfil;
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    console.log("Claude status:", claudeRes.status);
    if (claudeData.error) console.error("Claude error:", JSON.stringify(claudeData.error));

    const rawText = (claudeData.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    perfil = JSON.parse(cleaned);

  } catch (err) {
    console.error("Error Claude:", err.message);
    return res.status(500).json({ error: "Error generando tu perfil. Intenta de nuevo." });
  }

  return res.status(200).json({ success: true, nombre, perfil });
};
