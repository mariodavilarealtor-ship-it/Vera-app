// =============================================================
// VER·A — api/generate.js
// Backend principal: astrology-api.io → Claude → perfil VER·A
// Corregido para Vercel Node 24 (body parsing manual)
// =============================================================

module.exports = async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // ── BODY PARSING MANUAL (fix Vercel Node 24) ─────────────
  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", chunk => { raw += chunk; });
      req.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON inválido en el body")); }
      });
      req.on("error", reject);
    });
  } catch (err) {
    console.error("Error leyendo body:", err.message);
    return res.status(400).json({ error: "No se pudo leer el cuerpo de la solicitud." });
  }

  // ── DATOS DEL FORMULARIO ──────────────────────────────────
  const {
    nombre,
    fecha,      // formato: YYYY-MM-DD
    hora,       // formato: HH:MM
    ciudad,
    ciudadActual,
  } = body;

  if (!nombre || !fecha || !hora || !ciudad) {
    return res.status(400).json({ error: "Faltan datos obligatorios: nombre, fecha, hora, ciudad." });
  }

  // Parsear fecha y hora
  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  const ciudadFinal = ciudadActual || ciudad;

  const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  // =============================================================
  // PASO 1 — LLAMADAS A astrology-api.io
  // =============================================================
  let natalData = null;
  let kabbalaData = null;
  let astrocartoData = null;

  const astroBase = "https://json.astrologyapi.com/v1";
  const astroHeaders = {
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(ASTRO_KEY + ":").toString("base64"),
  };
  const birthPayload = { day, month, year, hour, min: minute, lat: 10.18, lon: -67.99, tzone: -4.5 };
  // lat/lon de Valencia Venezuela como fallback — idealmente hacer geocoding

  try {
    const [natalRes, kabbalaRes] = await Promise.all([
      fetch(`${astroBase}/planets`, { method: "POST", headers: astroHeaders, body: JSON.stringify(birthPayload) }),
      fetch(`${astroBase}/kabbala_num`, { method: "POST", headers: astroHeaders, body: JSON.stringify(birthPayload) }),
    ]);
    natalData = await natalRes.json();
    kabbalaData = await kabbalaRes.json();
    console.log("natalData:", JSON.stringify(natalData).slice(0, 300));
    console.log("kabbalaData:", JSON.stringify(kabbalaData).slice(0, 300));
  } catch (err) {
    console.error("Error llamando astrology-api.io:", err.message);
    return res.status(500).json({ error: "Error al consultar la API de datos. Intenta de nuevo." });
  }

  // ── Astrocartografía (no crítica, no bloquea) ──────────────
  try {
    const acRes = await fetch(`${astroBase}/astro_details`, {
      method: "POST",
      headers: astroHeaders,
      body: JSON.stringify(birthPayload),
    });
    astrocartoData = await acRes.json();
  } catch (err) {
    console.warn("Astrocartografía no disponible:", err.message);
  }

  // =============================================================
  // PASO 2 — PROCESAMIENTO DE DATOS
  // =============================================================

  // ── Balance de elementos ───────────────────────────────────
  function calculateEnergyDistribution(planets) {
    if (!planets || !Array.isArray(planets)) return { fuego: 25, tierra: 25, aire: 25, agua: 25 };
    const elementMap = {
      Aries: "fuego", Leo: "fuego", Sagitarius: "fuego",
      Taurus: "tierra", Virgo: "tierra", Capricorn: "tierra",
      Gemini: "aire", Libra: "aire", Aquarius: "aire",
      Cancer: "agua", Scorpio: "agua", Pisces: "agua",
    };
    const weights = { Sun: 4, Moon: 3, Ascendant: 3, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1 };
    const counts = { fuego: 0, tierra: 0, aire: 0, agua: 0 };
    let total = 0;
    planets.forEach(p => {
      const sign = p.sign || p.zodiac_sign;
      const el = elementMap[sign];
      const w = weights[p.name] || 1;
      if (el) { counts[el] += w; total += w; }
    });
    if (total === 0) return { fuego: 25, tierra: 25, aire: 25, agua: 25 };
    return {
      fuego: Math.round((counts.fuego / total) * 100),
      tierra: Math.round((counts.tierra / total) * 100),
      aire: Math.round((counts.aire / total) * 100),
      agua: Math.round((counts.agua / total) * 100),
    };
  }

  // ── Traducción de Quirón al lenguaje VER·A ─────────────────
  function translateChironToVERA(planets) {
    if (!planets || !Array.isArray(planets)) return "tu herida más profunda en el área de tu identidad";
    const chiron = planets.find(p => p.name === "Chiron" || p.name === "Quirón");
    if (!chiron) return "tu herida más profunda en el área de tu identidad";
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
      Aquarius: "la herida de pertenencia al grupo — sentir que eres demasiado diferente",
      Pisces: "la herida de límites — sentir que te disuelves en los demás",
    };
    const sign = chiron.sign || chiron.zodiac_sign || "";
    const houseMap = {
      1: "en tu forma de presentarte al mundo",
      2: "en tu relación con el dinero y el valor",
      3: "en tu comunicación y expresión",
      4: "en tu sentido de hogar y familia",
      5: "en tu creatividad y alegría",
      6: "en tu trabajo y rutina diaria",
      7: "en tus relaciones cercanas",
      8: "en tu capacidad de soltar y transformar",
      9: "en tus creencias y propósito",
      10: "en tu carrera y visibilidad pública",
      11: "en tus amistades y sueños",
      12: "en tu mundo interno y espiritualidad",
    };
    const house = chiron.house || chiron.house_number;
    const houseDesc = houseMap[house] || "";
    return `${signMap[sign] || "la herida de no sentirte suficiente"} — manifestándose ${houseDesc}`;
  }

  // ── Extracción del Nombre 72 ───────────────────────────────
  function extractNombre72(data) {
    if (!data) return null;
    const paths = [
      data?.kabbala_num,
      data?.primary_angel,
      data?.angel,
      data?.[0],
      data?.result,
      data?.data,
    ];
    for (const p of paths) {
      if (p && (p.name || p.angel_name || p.number)) return p;
    }
    console.log("Estructura kabbalaData completa:", JSON.stringify(data).slice(0, 500));
    return null;
  }

  const planets = natalData?.planets || natalData;
  const energy = calculateEnergyDistribution(planets);
  const chironDesc = translateChironToVERA(planets);
  const nombre72 = extractNombre72(kabbalaData);

  // Elemento débil y práctica PNL
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
      "Lista de lo real: cada noche escribe 3 cosas concretas que lograste ese día, por pequeñas que sean. La mente de Tierra se alimenta de evidencia.",
    ],
    aire: [
      "Mapa mental espontáneo: toma una hoja y escribe tu nombre en el centro. Conecta todo lo que se te ocurra sin juzgar. El Aire necesita fluir sin estructura.",
      "Conversación generativa: habla con alguien sobre una idea nueva esta semana. No para convencer — para explorar. El Aire se activa en el intercambio.",
      "Diario de preguntas: en vez de buscar respuestas, escribe 5 preguntas que te generen curiosidad. Las preguntas abren el canal de Aire.",
    ],
    agua: [
      "Escaneo emocional: tres veces al día, detente 30 segundos y pregúntate: ¿qué estoy sintiendo exactamente? Ponle nombre. No hay emoción correcta o incorrecta.",
      "Carta sin enviar: escribe una carta a alguien o algo que te haya causado dolor. No tienes que enviarla. Solo sentir.",
      "Baño o ducha consciente: mientras el agua cae, imagina que limpia lo que cargaste emocionalmente ese día. El agua física activa tu agua interna.",
    ],
  };

  const frecuenciaSolfeggio = {
    fuego: { hz: "417", nombre: "Movimiento y Desbloqueo" },
    tierra: { hz: "528", nombre: "Restauración y Amor" },
    aire: { hz: "852", nombre: "Intuición y Claridad" },
    agua: { hz: "396", nombre: "Liberación Emocional" },
  };

  // =============================================================
  // PASO 3 — PROMPT PARA CLAUDE
  // =============================================================
  const profileData = {
    nombre,
    fechaNacimiento: `${day}/${month}/${year}`,
    horaNacimiento: `${hour}:${minute < 10 ? "0" + minute : minute}`,
    ciudadNacimiento: ciudad,
    ciudadActual: ciudadFinal,
    elementoDebil,
    distribucionEnergia: energy,
    practicasPNL: practicasPNL[elementoDebil],
    frecuencia: frecuenciaSolfeggio[elementoDebil],
    chironDescripcion: chironDesc,
    nombre72: nombre72 ? JSON.stringify(nombre72) : "frecuencia única de conexión entre mundos",
    planetas: planets ? JSON.stringify(planets).slice(0, 800) : "datos no disponibles",
  };

  const systemPrompt = `Eres el motor de VER·A, una plataforma de educación emocional personalizada.
Tu misión: generar un perfil profundo que deje a la persona MOTIVADA — con ganas de levantarse y hacer algo diferente.

REGLAS ABSOLUTAS DE LENGUAJE (nunca violar):
- NUNCA uses: astrología, carta natal, planetas, signos zodiacales, casas, Kabbalah, chakras, ángeles, Quirón, tránsitos, aspectos, grados, Aries, Tauro, etc.
- USA SIEMPRE: código de origen, fuerzas, áreas de vida, patrones de energía, frecuencia de origen, herida original, ciclos activos, equilibrio energético.
- Habla como alguien que conoce a la persona profundamente — cálido, directo, sin tecnicismos.
- Cada módulo debe terminar dejando a la persona con ENERGÍA para actuar.

ESTRUCTURA DE RESPUESTA — responde SOLO con este JSON, sin texto adicional, sin markdown:
{
  "quienEres": "Párrafo de 4-5 oraciones sobre la identidad profunda de la persona. Quién es en su núcleo.",
  "tuEnergia": {
    "descripcion": "2-3 oraciones explicando cómo procesa la realidad esta persona.",
    "distribucion": {
      "accion": número_entero,
      "pensamiento": número_entero,
      "emocion": número_entero,
      "intuicion": número_entero
    }
  },
  "tuProposito": "4-5 oraciones sobre su pasión, talento, misión y camino de vida.",
  "tuFrecuenciaDeOrigen": "3-4 oraciones sobre su vibración única y cómo usarla. Sin mencionar números, ángeles ni Kabbalah.",
  "tuEquilibrioEnergetico": {
    "diagnostico": "2-3 oraciones sobre el desequilibrio detectado y su impacto en la vida.",
    "elementoDebil": "nombre del elemento en español (Fuego/Tierra/Aire/Agua)",
    "practicas": ["práctica 1 completa", "práctica 2 completa", "práctica 3 completa"],
    "frecuencia": { "hz": "número", "nombre": "nombre" }
  },
  "tuHerida": "4-5 oraciones sobre la herida y cómo convertirla en el mayor poder. Cálido y transformador.",
  "tuMomentoActual": "3-4 oraciones sobre el ciclo que está viviendo ahora y qué oportunidad trae.",
  "tuPracticaDiaria": {
    "gratitud": "Frase de gratitud personalizada para esta persona específica (3-4 palabras únicas de su perfil).",
    "conexion": "Una oración que conecte a la persona con algo más grande que su miedo actual. Sin religión.",
    "pregunta": "Una pregunta de inteligencia emocional específica para su momento actual."
  },
  "mensajeFinal": "Párrafo de cierre de 3-4 oraciones. Debe ser lo más motivador del perfil completo."
}`;

  const userPrompt = `Genera el perfil VER·A completo para:
Nombre: ${profileData.nombre}
Fecha de nacimiento: ${profileData.fechaNacimiento}
Hora de nacimiento: ${profileData.horaNacimiento}
Ciudad de nacimiento: ${profileData.ciudadNacimiento}
Ciudad actual: ${profileData.ciudadActual}

Distribución de energía calculada:
- Acción (Fuego): ${energy.fuego}%
- Intuición (Agua): ${energy.agua}%
- Pensamiento (Aire): ${energy.aire}%
- Emoción (Tierra): ${energy.tierra}%
Elemento débil detectado: ${elementoDebil}

Herida original detectada en lenguaje VER·A: ${chironDesc}

Frecuencia de origen (72 nombres): ${profileData.nombre72}

Usa TODOS estos datos para personalizar cada módulo. Los porcentajes de energía deben coincidir exactamente con los calculados.
Las prácticas PNL para el equilibrio energético son estas (úsalas tal como están):
1. ${practicasPNL[0]}
2. ${practicasPNL[1]}
3. ${practicasPNL[2]}`;

  // =============================================================
  // PASO 4 — LLAMADA A CLAUDE
  // =============================================================
  let perfilVERA;
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

    const rawText = claudeData.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("") || "";

    // Limpiar posibles backticks de markdown
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    perfilVERA = JSON.parse(cleaned);

  } catch (err) {
    console.error("Error en Claude o parseo JSON:", err.message);
    return res.status(500).json({ error: "Error generando tu perfil. Intenta de nuevo en un momento." });
  }

  // =============================================================
  // PASO 5 — RESPUESTA FINAL
  // =============================================================
  return res.status(200).json({
    success: true,
    nombre,
    perfil: perfilVERA,
  });
};
