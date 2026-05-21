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

      const {
        nombre, fecha, hora, ciudad, ciudadActual,
        dolor, emocion, relacion, dinero,
        signoSolar, elementoDominante, elementoDebil,
        codigo72Numero, codigo72Nombre, quiron
      } = body;

      if (!nombre || !fecha || !ciudad) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Faltan campos: nombre, fecha, ciudad" }));
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
            model: "claude-sonnet-4-5",
            max_tokens: 8000,
            system: `Eres el motor de VER·A, plataforma de educación emocional personalizada en español.

REGLA ABSOLUTA: NUNCA uses estos términos: astrología, carta natal, planetas, signos zodiacales, casas astrológicas, Kabbalah, chakras, ángeles, tránsitos, Quirón, ascendente, nodo norte, retrogrado.

USA SIEMPRE el lenguaje VER·A:
- "tu código de origen" (no carta natal)
- "tus fuerzas" (no planetas)
- "tu equilibrio energético" (no elementos)
- "tu herida original y tu don" (no Quirón)
- "tu frecuencia de origen" (no Kabbalah)
- "ciclos activos" (no tránsitos)

TONO: Directo, cálido, profundo. Como un amigo que te conoce de verdad y te dice la verdad con amor.
OBJETIVO: Dejar a la persona MOTIVADA — con ganas de levantarse y hacer algo diferente HOY.

Responde SOLO con JSON válido. Sin markdown. Sin texto antes ni después. Sin backticks.`,

            messages: [{
              role: "user",
              content: `Genera el perfil VER·A completo para esta persona. USA TODOS los datos específicos que te doy — este perfil debe ser ÚNICO para esta persona, no genérico.

═══ DATOS PERSONALES ═══
Nombre: ${nombre}
Fecha de nacimiento: ${fecha}
Edad actual: ${new Date().getFullYear() - new Date(fecha).getFullYear()} años (año actual: ${new Date().getFullYear()})
Hora de nacimiento: ${hora || "no disponible"}
Ciudad natal: ${ciudad}
Ciudad actual: ${ciudadActual || ciudad}

═══ CÓDIGO DE ORIGEN CALCULADO ═══
Patrón solar: ${signoSolar || "no calculado"}
Energía dominante: ${elementoDominante || "no calculado"}
Energía débil (área de crecimiento): ${elementoDebil || "no calculado"}
Frecuencia de origen #${codigo72Numero || "?"}: ${codigo72Nombre || "no calculado"}
Herida original: ${quiron || "no calculada"}

═══ RESPUESTAS EMOCIONALES ═══
Cuando algo duele: ${dolor || "no respondido"}
Emoción que más cuesta sentir: ${emocion || "no respondida"}
Patrón que se repite en relaciones: ${relacion || "no respondido"}
Relación con el dinero: ${dinero || "no respondido"}

═══ INSTRUCCIONES ESPECÍFICAS ═══
1. El perfil de energía (pensamiento/emocion/accion/intuicion) debe reflejar directamente el patrón solar ${signoSolar} y la energía dominante ${elementoDominante}
2. La herida original debe conectar DIRECTAMENTE con "${quiron}" y con la respuesta emocional "${dolor}"
3. El equilibrio energético debe hablar específicamente de la energía débil "${elementoDebil}" — qué impacto tiene en la vida diaria de ${nombre} y 3 prácticas PNL concretas para fortalecerla
4. La frecuencia de origen #${codigo72Numero} "${codigo72Nombre}" debe tener una descripción profunda y específica
5. Las ciudades deben ser elegidas específicamente para alguien con energía ${elementoDominante} y patrón solar ${signoSolar}
6. Todo debe construir hacia UN mensaje final que deje a ${nombre} con ganas de actuar HOY

Responde con este JSON exacto (sin texto extra, sin backticks):
{
  "opening": "frase de apertura de 2-3 líneas que golpee al corazón de ${nombre} específicamente",
  "quien_eres": "párrafo de 3-4 líneas sobre la identidad de ${nombre} basado en sus datos específicos",
  "tres_fuerzas": ["fuerza 1 específica", "fuerza 2 específica", "fuerza 3 específica"],
  "energia": {
    "pensamiento": número entre 20-50,
    "emocion": número entre 15-40,
    "accion": número entre 10-35,
    "intuicion": número entre 5-25,
    "descripcion": "cómo ${nombre} específicamente procesa la realidad — los 4 valores deben sumar 100"
  },
  "proposito": {
    "pasion": "qué mueve a ${nombre} específicamente",
    "talento": "qué hace ${nombre} mejor que otros",
    "mision": "para qué está ${nombre} en el mundo",
    "camino": "cómo lo materializa",
    "frase": "cita que resuene con ${nombre}"
  },
  "codigo_72": {
    "numero": ${codigo72Numero || 1},
    "nombre": "${codigo72Nombre || "El Transformador"}",
    "descripcion": "párrafo profundo sobre lo que significa este código para ${nombre}",
    "bloqueo": "cuándo y cómo se bloquea esta frecuencia en ${nombre}",
    "afirmacion": "afirmación de activación específica para ${nombre}"
  },
  "equilibrio": {
    "elemento_debil": "${elementoDebil}",
    "descripcion": "qué significa tener ${elementoDebil} débil en la vida diaria de ${nombre} — impacto real y concreto",
    "practicas": [
      "práctica PNL específica para fortalecer ${elementoDebil} en ${nombre} — con base científica",
      "práctica 2 concreta y diferente",
      "práctica 3 concreta y diferente"
    ],
    "frecuencia": "Hz específico para ${elementoDebil} y su nombre en lenguaje VER·A"
  },
  "herida_don": {
   "herida": "descripción específica conectando ${quiron} con la respuesta emocional ${dolor} de ${nombre}",
"don": "cómo exactamente esa herida se convierte en el mayor poder de ${nombre}",
"sombra_reprimida": "qué parte de ${nombre} fue suprimida o castigada — lo que aprendió a esconder para ser aceptado",
"poder_recuperado": "cómo integrar esa sombra se convierte en la fuente más auténtica de poder de ${nombre} — no eliminarla sino reclamarla",
"practica_pnl": "técnica PNL específica para ${nombre} esta semana",
"frase": "cita transformadora específica para esta herida"
  },
  "vinculos": {
    "patron": "el patrón específico de ${nombre} en relaciones basado en su respuesta: ${relacion}",
    "señal": "la señal de alerta específica para ${nombre}",
    "frase": "cita sobre vínculos"
  },
  "dinero": {
    "patron": "el patrón específico de ${nombre} con el dinero basado en: ${dinero}",
    "transformacion": "cómo ${nombre} específicamente transforma ese patrón",
    "practica": "práctica concreta para esta semana"
  },
"momento_actual": {
  "ciclo_de_vida": "en qué gran ciclo vital está ${nombre} ahora (Formación/Construcción/Consolidación) basado en su edad de ${new Date().getFullYear() - new Date(fecha).getFullYear()} años",
  "fase_del_ciclo": "en qué fase específica está dentro de su ciclo actual (expansión/consolidación/cosecha)",
  "ventana": "si este es momento de sembrar, construir o recoger — concreto para ${nombre}",
  "tension_activa": "qué tensión específica está activa en ${nombre} ahora que no puede ignorar",
  "accion_semana": "UNA acción concreta para ${nombre} esta semana alineada con su ciclo",
  "frase": "frase que ubica a ${nombre} donde está y hacia dónde va"
},
  "ciudades": [
    {"emoji": "📍", "ciudad": "${ciudadActual || ciudad} — Donde estás", "descripcion": "por qué esta ciudad es la base de lanzamiento de ${nombre}"},
    {"emoji": "🥇", "ciudad": "nombre ciudad", "descripcion": "por qué esta ciudad específicamente para alguien con la energía de ${nombre}"},
    {"emoji": "🥈", "ciudad": "nombre ciudad", "descripcion": "por qué esta ciudad para ${nombre}"},
    {"emoji": "🥉", "ciudad": "nombre ciudad — Ciudad sorpresa", "descripcion": "por qué sorprende para ${nombre}"}
  ],
  "frecuencias": [
    {"cuando": "situación específica para ${nombre}", "hz": "frecuencia específica"},
    {"cuando": "situación 2", "hz": "frecuencia"},
    {"cuando": "situación 3", "hz": "frecuencia"},
    {"cuando": "situación 4", "hz": "frecuencia"},
    {"cuando": "situación 5", "hz": "frecuencia"}
  ],
  "practica_diaria": {
    "gratitud": "pregunta de gratitud específica para ${nombre} y su momento de vida",
    "conexion": "afirmación de conexión específica para ${nombre} sin religiosidad",
    "emocion_hoy": "pregunta de inteligencia emocional específica para ${nombre}"
  },
  "frase_final": "frase poderosa y personal que resuma TODO el perfil de ${nombre}",
  "pregunta_transformadora": "una pregunta que cambie algo concreto en la vida de ${nombre} hoy"
}`
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
console.log("CLAUDE RESPONSE:", texto.slice(0, 1000));
        let perfil;
        try {
         const textoLimpio = texto.replace(/```json|```|json/gi, "").trim();
perfil = JSON.parse(textoLimpio);
        } catch(e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Parse error", texto: texto.slice(0, 500) }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(perfil));

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
// Keep-alive: evita que Render se duerma
setInterval(() => {
fetch(`http://localhost:${PORT}/`).catch(() => {});
}, 600000);
