// VER·A — api/generate.js — VERSIÓN DIAGNÓSTICO
// Subir temporalmente para identificar dónde falla exactamente
// Una vez identificado el error, subir la versión final

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  // ── PASO 1: Leer body ──────────────────────────────────────
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
    console.log("✅ PASO 1 OK — body recibido:", JSON.stringify(body));
  } catch (err) {
    console.error("❌ PASO 1 FALLO — body:", err.message);
    return res.status(400).json({ error: "PASO1_FALLO: " + err.message });
  }

  const { nombre, fecha, hora, ciudad, ciudadActual } = body;
  if (!nombre || !fecha || !hora || !ciudad) {
    return res.status(400).json({ error: "PASO1_FALLO: Faltan campos obligatorios", recibido: body });
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);

  // ── PASO 2: Variables de entorno ───────────────────────────
  const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  console.log("✅ PASO 2 — ASTRO_KEY existe:", !!ASTRO_KEY, "| CLAUDE_KEY existe:", !!CLAUDE_KEY);

  if (!ASTRO_KEY || !CLAUDE_KEY) {
    return res.status(500).json({
      error: "PASO2_FALLO: Variables de entorno faltantes",
      astro: !!ASTRO_KEY,
      claude: !!CLAUDE_KEY
    });
  }

  // ── PASO 3: Llamada a astrology-api.io ─────────────────────
  let natalData, kabbalaData;
  const birthPayload = { day, month, year, hour, min: minute, lat: 10.18, lon: -67.99, tzone: -4.5 };
  const astroHeaders = {
    "Content-Type": "application/json",
    Authorization: "Basic " + Buffer.from(ASTRO_KEY + ":").toString("base64"),
  };

  try {
    console.log("🔄 PASO 3 — Llamando astrology-api.io con:", JSON.stringify(birthPayload));
    const natalRes = await fetch("https://json.astrologyapi.com/v1/planets", {
      method: "POST",
      headers: astroHeaders,
      body: JSON.stringify(birthPayload),
    });
    console.log("✅ PASO 3 — Status natal:", natalRes.status);
    natalData = await natalRes.json();
    console.log("✅ PASO 3 — natalData primeras 200 chars:", JSON.stringify(natalData).slice(0, 200));
  } catch (err) {
    console.error("❌ PASO 3 FALLO — astrology natal:", err.message);
    return res.status(500).json({ error: "PASO3_FALLO: " + err.message });
  }

  try {
    const kabbalaRes = await fetch("https://json.astrologyapi.com/v1/kabbala_num", {
      method: "POST",
      headers: astroHeaders,
      body: JSON.stringify(birthPayload),
    });
    console.log("✅ PASO 3b — Status kabbala:", kabbalaRes.status);
    kabbalaData = await kabbalaRes.json();
    console.log("✅ PASO 3b — kabbalaData:", JSON.stringify(kabbalaData).slice(0, 200));
  } catch (err) {
    console.error("❌ PASO 3b FALLO — kabbala:", err.message);
    kabbalaData = null; // No es crítico
  }

  // ── PASO 4: Llamada a Claude ───────────────────────────────
  let claudeData;
  try {
    console.log("🔄 PASO 4 — Llamando Claude...");
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Di solo: "PRUEBA OK para ${nombre}". Nada más.`
        }],
      }),
    });
    console.log("✅ PASO 4 — Claude status:", claudeRes.status);
    claudeData = await claudeRes.json();
    console.log("✅ PASO 4 — Claude respuesta:", JSON.stringify(claudeData).slice(0, 200));
  } catch (err) {
    console.error("❌ PASO 4 FALLO — Claude:", err.message);
    return res.status(500).json({ error: "PASO4_FALLO: " + err.message });
  }

  // ── RESPUESTA DE DIAGNÓSTICO ───────────────────────────────
  return res.status(200).json({
    diagnostico: "TODOS LOS PASOS OK",
    bodyRecibido: { nombre, fecha, hora, ciudad },
    natalDataMuestra: JSON.stringify(natalData).slice(0, 300),
    kabbalaDataMuestra: JSON.stringify(kabbalaData).slice(0, 300),
    claudeRespuesta: claudeData?.content?.[0]?.text || JSON.stringify(claudeData).slice(0, 200),
  });
};
