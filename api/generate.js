// ============================================================
// VER·A — generate.js (motor del Perfil VER·A, 8 módulos)
// Versión 2.0 — 23 julio 2026
//
// CAMBIOS PRINCIPALES vs v1:
// 1. Se pide a la API el set completo de puntos (active_points) incluyendo
//    Nodo Sur, Lilith y planetas exteriores. Antes se recibía el set por defecto.
// 2. Se captura el SIGNO de cada punto (antes solo se usaba el elemento).
// 3. Se procesan los ASPECTOS con orbe cerrado (<3°) = la tensión real.
// 4. El modelo recibe el dato CRUDO y traduce al escribir (antes el código
//    traducía primero y le entregaba frases ya vacías).
// 5. Tabla SIGNIFICADOS reescrita con mecanismos de evasión, no cualidades.
// 6. Cada módulo tiene su ZONA propia (anti-repetición estructural).
// 7. Módulo nuevo: "Tu Dirección" (8 llamadas paralelas).
// ============================================================

// ════════════════════════════════════════════════════════════
// BLOQUE B — Numerología "Tu Esencia" (cero API, en código)
// ════════════════════════════════════════════════════════════
const TABLA_LETRAS = {
A:1,J:1,S:1, B:2,K:2,T:2, C:3,L:3,U:3, D:4,M:4,V:4,
E:5,N:5,W:5, F:6,O:6,X:6, G:7,P:7,Y:7, H:8,Q:8,Z:8, I:9,R:9
};
const VOCALES = new Set(["A","E","I","O","U"]);

function normalizarNombre(t) {
  return (t || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/\u00d1/g, "N").replace(/[^A-Z]/g, "");
}
function reducir(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, d) => a + Number(d), 0);
  }
  return n;
}
function calcularCamino(dia, mes, anio) {
  return reducir(reducir(dia) + reducir(mes) + reducir(anio));
}
function calcularDestino(nc) {
  const l = normalizarNombre(nc);
  return reducir(l.split("").reduce((a, x) => a + (TABLA_LETRAS[x] || 0), 0));
}
function calcularAlma(nc) {
  const l = normalizarNombre(nc);
  return reducir(l.split("").filter(x => VOCALES.has(x))
    .reduce((a, x) => a + (TABLA_LETRAS[x] || 0), 0));
}
function calcularPersonalidad(nc) {
  const l = normalizarNombre(nc);
  return reducir(l.split("").filter(x => !VOCALES.has(x))
    .reduce((a, x) => a + (TABLA_LETRAS[x] || 0), 0));
}

// TABLA REESCRITA: mecanismos de evasión, no cualidades.
// Esto es lo que produce espejo en vez de halago.
const SIGNIFICADOS = {
1:"Necesita ir por delante. Le cuesta pedir ayuda porque depender se siente como perder. Termina cargando solo lo que podría repartir.",
2:"Lee el ánimo de todos y se acomoda. Evita el conflicto tanto que a veces ya no sabe qué quiere. Cede primero y lo llama paz.",
3:"Sabe caer bien y usa eso como escudo. Cuando algo pesa, hace un chiste. Empieza mucho, termina poco.",
4:"Necesita control para sentirse seguro. Llama realismo a la rigidez. Le cuesta soltar aunque el plan ya no sirva.",
5:"Se va antes de que la cosa se ponga difícil. Confunde libertad con no comprometerse. Deja proyectos y vínculos a medias.",
6:"Se hace cargo de todos y espera que alguien note cuánto da. Ayuda para no ser dejado. Por eso le cuesta pedir.",
7:"Se retira a pensar cuando debería actuar. Analiza para no exponerse. Le llama descansar a esconderse.",
8:"Mide su valor por lo que logra. Descansar le da culpa. Confunde ser respetado con ser querido.",
9:"Carga lo de todos y no suelta lo que ya terminó. Se pierde en las causas para no mirar lo suyo.",
11:"Percibe más de lo que sabe explicar y eso lo tensa. Duda de su criterio justo cuando acierta. Espera estar listo y nunca lo está.",
22:"Ve algo grande y le pesa antes de empezar. Se exige a escala que nadie le pidió. Posterga por miedo a hacerlo mal.",
33:"Se entrega hasta desaparecer. Su valor lo pone en cuánto sostiene a otros. Cuando nadie lo necesita, no sabe quién es."
};

function calcularEsencia(nc, dia, mes, anio) {
  const camino = calcularCamino(dia, mes, anio);
  const destino = calcularDestino(nc);
  const alma = calcularAlma(nc);
  const personalidad = calcularPersonalidad(nc);
  return {
    _numeros: { camino, destino, alma, personalidad },
    significado_camino: SIGNIFICADOS[camino] || "",
    significado_destino: SIGNIFICADOS[destino] || "",
    significado_alma: SIGNIFICADOS[alma] || "",
    significado_personalidad: SIGNIFICADOS[personalidad] || ""
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE C1 — Helper de llamada al API de astrología
// ════════════════════════════════════════════════════════════
const ASTRO_BASE = "https://api.astrology-api.io";

async function llamarAstrologyAPI(endpoint, payload, apiKey) {
  const res = await fetch(ASTRO_BASE + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify(payload)
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`API ${endpoint} ${res.status}: ${rawText.slice(0, 300)}`);
  let json;
  try { json = JSON.parse(rawText); }
  catch (e) { throw new Error(`No-JSON de ${endpoint}: ${rawText.slice(0, 300)}`); }
  return json.data || json;
}

// AHORA envía options.active_points con el set completo.
// Antes no se enviaba options y se recibía el set por defecto (incompleto).
function armarSubject(nombre, anio, mes, dia, horaH, horaM, ciudad, paisCodigo) {
  return {
    subject: { name: nombre, birth_data: {
      year: anio, month: mes, day: dia, hour: horaH, minute: horaM, second: 0,
      city: ciudad, country_code: paisCodigo.toUpperCase()
    }},
    options: {
      house_system: "P",
      zodiac_type: "Tropic",
      detail_level: "full",
      active_points: [
        "Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn",
        "Uranus","Neptune","Pluto","Chiron","True_Node","True_South_Node",
        "Mean_Lilith","Ascendant","Medium_Coeli"
      ],
      precision: 2
    }
  };
}

function armarKabbalah(anio, mes, dia, horaH, horaM, ciudad, paisCodigo) {
  return {
    birth_data: {
      year: anio, month: mes, day: dia, hour: horaH, minute: horaM, second: 0,
      city: ciudad, country_code: paisCodigo.toUpperCase()
    },
    include_secondary: true,
    include_tertiary: false,
    language: "en"
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE C1b — Guardar registro en Google Sheets (no crítico)
// ════════════════════════════════════════════════════════════
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzLTbID_o5XiQLOrdm8d2D5wodxoXJh03EuJHZICqf1qmNOPhyPXlBcWEcCoFHX8OZQaw/exec";

async function guardarEnHoja(datos) {
  try {
    const url = SHEETS_URL + "?payload=" + encodeURIComponent(JSON.stringify(datos));
    await fetch(url, { method: "GET" });
  } catch (e) {
    console.error("No se pudo guardar en la hoja:", e.message);
  }
}

// ════════════════════════════════════════════════════════════
// BLOQUE C1c — Envío del perfil por email vía Resend (no crítico)
// ════════════════════════════════════════════════════════════
const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_REMITENTE = "VER·A <ver.a@ver-a.life>";
const EMAIL_BCC = "mariodavilarealtor@gmail.com";

const REDES = [
  { nombre: "YouTube",   url: "https://www.youtube.com/@VER-A-q6z" },
  { nombre: "Instagram", url: "https://www.instagram.com/ver.a.life" },
  { nombre: "TikTok",    url: "https://www.tiktok.com/@ver.a.life" }
];

function escaparHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inlineMd(linea) {
  let h = escaparHtml(linea).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#b8860b;text-decoration:underline;">$1</a>');
  return h;
}
function markdownAHtml(texto) {
  const lineas = (texto || "").split("\n");
  let html = "", enLista = false;
  for (let cruda of lineas) {
    const linea = cruda.trim();
    if (!linea) { if (enLista) { html += "</ul>"; enLista = false; } continue; }
    if (/^---+$/.test(linea)) {
      if (enLista) { html += "</ul>"; enLista = false; }
      html += '<hr style="border:none;border-top:1px solid #e7ddc9;margin:22px 0;">';
      continue;
    }
    const t = linea.match(/^(#{1,3})\s+(.*)$/);
    if (t) {
      if (enLista) { html += "</ul>"; enLista = false; }
      const txt = inlineMd(t[2]);
      html += `<h3 style="font-family:Georgia,'Times New Roman',serif;color:#2b2b2b;font-size:19px;margin:24px 0 8px;">${txt}</h3>`;
      continue;
    }
    const li = linea.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!enLista) { html += '<ul style="margin:8px 0 8px 18px;padding:0;">'; enLista = true; }
      html += `<li style="margin:4px 0;line-height:1.6;">${inlineMd(li[1])}</li>`;
      continue;
    }
    const ol = linea.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      html += `<p style="margin:8px 0;line-height:1.7;"><strong>${inlineMd(ol[1])}</strong></p>`;
      continue;
    }
    if (enLista) { html += "</ul>"; enLista = false; }
    html += `<p style="margin:10px 0;line-height:1.7;color:#333;">${inlineMd(linea)}</p>`;
  }
  if (enLista) html += "</ul>";
  return html;
}

const TITULOS_MODULOS = {
  retrato:         "Tu Retrato",
  esencia:         "Tu Esencia",
  frecuencia:      "Tu Frecuencia de Origen",
  equilibrio:      "Tu Equilibrio Energético",
  herida:          "Tu Herida y tu Don",
  direccion:       "Tu Dirección",
  momento_actual:  "Tu Momento Actual",
  practica_diaria: "Tu Práctica Diaria"
};
const ORDEN_MODULOS = ["retrato","esencia","frecuencia","equilibrio","herida","direccion","momento_actual","practica_diaria"];

function construirHtmlPerfil(nombre, modulos) {
  let cuerpo = "";
  for (const clave of ORDEN_MODULOS) {
    const texto = modulos[clave];
    if (!texto) continue;
    cuerpo += `
      <div style="margin:0 0 18px;">
        <h2 style="font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;font-size:24px;margin:30px 0 6px;">${TITULOS_MODULOS[clave]}</h2>
        <div style="height:2px;width:60px;background:#b8860b;margin:0 0 14px;"></div>
        ${markdownAHtml(texto)}
      </div>`;
  }

  const redesHtml = REDES.map(r =>
    `<a href="${r.url}" style="color:#b8860b;text-decoration:none;font-weight:bold;margin:0 8px;">${r.nombre}</a>`
  ).join("·");

  return `
  <div style="background:#faf7f0;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <div style="background:#1a1a1a;padding:28px;text-align:center;">
        <div style="font-family:Georgia,serif;color:#ffffff;font-size:30px;letter-spacing:3px;">VER·A</div>
        <div style="color:#b8860b;font-size:12px;letter-spacing:2px;margin-top:4px;">CONÓCETE DE VERDAD</div>
      </div>
      <div style="padding:30px 28px;">
        <p style="font-size:17px;color:#222;margin:0 0 16px;">Hola ${escaparHtml(nombre)}, aquí está tu perfil VER·A.</p>
        <p style="font-size:15px;color:#555;margin:0 0 8px;line-height:1.6;">
          Esto no es un test genérico ni una respuesta automática: es un espejo hecho para ti. Léelo con calma, y quédate con lo que te mueva a actuar.
        </p>
        ${cuerpo}
        <hr style="border:none;border-top:1px solid #e7ddc9;margin:26px 0;">
        <div style="text-align:center;">
          <p style="font-size:15px;color:#333;margin:0 0 10px;">Si esto te sirvió, acompáñanos y compártelo con quien lo necesite.</p>
          <p style="font-size:15px;margin:0 0 14px;">${redesHtml}</p>
          <p style="font-size:12px;color:#999;margin:0;">VER·A · ver-a.life</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function enviarEmailPerfil(destinatario, nombre, modulos, resendKey) {
  try {
    if (!resendKey) { console.error("Falta RESEND_API_KEY: no se envía email."); return; }
    if (!destinatario) { console.error("Sin email del destinatario: no se envía."); return; }

    const html = construirHtmlPerfil(nombre, modulos);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + resendKey
      },
      body: JSON.stringify({
        from: EMAIL_REMITENTE,
        to: [destinatario],
        bcc: [EMAIL_BCC],
        subject: `${nombre}, tu perfil VER·A está listo`,
        html: html
      })
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Resend respondió error:", res.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("No se pudo enviar el email:", e.message);
  }
}

// ════════════════════════════════════════════════════════════
// BLOQUE C2 — Procesar la carta natal (AHORA con signo y aspectos)
// ════════════════════════════════════════════════════════════
const AREAS_VIDA = {
First_House:"tu identidad, cómo arrancas y te muestras al mundo",
Second_House:"tu valor propio y tu sustento: lo que vales y con qué te sostienes",
Third_House:"tu comunicación, tu forma de pensar y de decir",
Fourth_House:"tu raíz, tu hogar, de dónde vienes",
Fifth_House:"tu creatividad, lo que disfrutas y lo que creas",
Sixth_House:"tu trabajo, tu servicio y tu cuerpo",
Seventh_House:"tus vínculos cercanos: la pareja, los socios, el uno a uno",
Eighth_House:"lo que compartes con otros y lo que te transforma por dentro",
Ninth_House:"tu visión, tu sentido, lo que te expande",
Tenth_House:"tu carrera, tu lugar público, tu misión visible",
Eleventh_House:"el colectivo, tu futuro, aquello a lo que aportas",
Twelfth_House:"tu mundo interno, lo que se cuece por dentro"
};

const FUERZAS = {
sun:"su fuerza central de identidad", moon:"su mundo emocional y lo que necesita para sentirse seguro",
mercury:"su mente y su palabra", venus:"su forma de amar y de valorar",
mars:"su fuerza de acción y empuje", jupiter:"su forma de expandirse y buscar sentido",
saturn:"su estructura, su disciplina y su exigencia", uranus:"su necesidad de ruptura y libertad",
neptune:"su imaginación, su idealización y su punto de fuga", pluto:"su relación con el poder y la transformación"
};

const PUNTOS_ELEMENTOS = ["sun","moon","mercury","venus","mars","jupiter",
"saturn","uranus","neptune","pluto","ascendant","medium_coeli"];

// Traduce el código de 3 letras a nombre legible SOLO para uso interno del modelo.
// El modelo tiene prohibido escribirlo; lo usa para afinar la interpretación.
const SIGNOS_NOMBRE = {
  Ari:"Aries", Tau:"Tauro", Gem:"Géminis", Can:"Cáncer",
  Leo:"Leo", Vir:"Virgo", Lib:"Libra", Sco:"Escorpio",
  Sag:"Sagitario", Cap:"Capricornio", Aqu:"Acuario", Pis:"Piscis"
};
function nombreSigno(cod) {
  return SIGNOS_NOMBRE[cod] || cod || "";
}

// Nombres legibles de los aspectos, para el prompt.
const ASPECTOS_NOMBRE = {
  conjunction: "fusionado con",
  opposition:  "en tensión abierta con",
  square:      "en choque con",
  trine:       "en flujo fácil con",
  sextile:     "en apoyo con",
  quintile:    "en afinidad creativa con"
};

// Solo los aspectos que de verdad pesan: orbe cerrado.
const ASPECTOS_RELEVANTES = ["conjunction","opposition","square","trine","sextile"];
const ORBE_MAXIMO = 3.0;

function procesarAspectos(chartData) {
  if (!chartData || !Array.isArray(chartData.aspects)) return [];
  return chartData.aspects
    .filter(a => ASPECTOS_RELEVANTES.includes(a.aspect_type))
    .filter(a => typeof a.orb === "number" && a.orb <= ORBE_MAXIMO)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 8)
    .map(a => ({
      p1: a.point1,
      p2: a.point2,
      tipo: ASPECTOS_NOMBRE[a.aspect_type] || a.aspect_type,
      tenso: (a.aspect_type === "square" || a.aspect_type === "opposition"),
      orbe: Math.round(a.orb * 100) / 100
    }));
}

function procesarCartaNatal(cartaRaw) {
  const sd = cartaRaw.subject_data;
  if (!sd) throw new Error("Carta natal sin subject_data");

  // Conteo de elementos (para el módulo Equilibrio)
  const conteo = { Fire:0, Earth:0, Air:0, Water:0 };
  for (const p of PUNTOS_ELEMENTOS) {
    const el = sd[p] && sd[p].element;
    if (el && conteo.hasOwnProperty(el)) conteo[el]++;
  }
  let debil = "Fire", fuerte = "Fire";
  for (const el of ["Fire","Earth","Air","Water"]) {
    if (conteo[el] < conteo[debil]) debil = el;
    if (conteo[el] > conteo[fuerte]) fuerte = el;
  }

  // AHORA se captura el SIGNO, que antes se perdía.
  const listaFuerzas = [];
  for (const [k, etiqueta] of Object.entries(FUERZAS)) {
    const p = sd[k]; if (!p) continue;
    listaFuerzas.push({
      clave: k,
      etiqueta,
      signo: nombreSigno(p.sign),
      grado: Math.round((p.position || 0) * 10) / 10,
      area: AREAS_VIDA[p.house] || "",
      reflexivo: p.retrograde === true
    });
  }

  const punto = (k) => sd[k] ? {
    signo: nombreSigno(sd[k].sign),
    grado: Math.round((sd[k].position || 0) * 10) / 10,
    area: AREAS_VIDA[sd[k].house] || "",
    reflexivo: sd[k].retrograde === true
  } : { signo:"", grado:null, area:"", reflexivo:false };

  return {
    conteo, debil, fuerte, listaFuerzas,
    ascendente:  punto("ascendant"),
    medioCielo:  punto("medium_coeli"),
    herida:      punto("chiron"),
    nodoNorte:   punto("true_node"),
    nodoSur:     punto("true_south_node"),
    lilith:      punto("mean_lilith"),
    aspectos:    procesarAspectos(cartaRaw.chart_data)
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE C3 — Frecuencia (birth-angels) + Tikkun
// ════════════════════════════════════════════════════════════
function procesarFrecuencia(a) {
  const prim = a.primary_angel || {};
  const sec = a.secondary_angel || {};
  return {
    fortaleza_meaning: prim.meaning || "",
    fortaleza_qualities: prim.qualities || [],
    recurso_meaning: sec.meaning || "",
    recurso_qualities: sec.qualities || []
  };
}

function procesarTikkun(t) {
  const z = t.zodiac || {};
  return {
    tema: z.tikkun_name || "",
    antidoto: z.keyword || "",
    interpretacion: z.interpretation || ""
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE C4 — Fase de vida por edad
// ════════════════════════════════════════════════════════════
function calcularEdad(anio, mes, dia) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const m = hoy.getMonth() + 1, d = hoy.getDate();
  if (m < mes || (m === mes && d < dia)) edad--;
  return edad;
}

function calcularFaseVida(edad) {
  if (edad <= 20) return { fase:"formación: probándose, explorando quién es", matiz:"cada prueba le muestra de qué está hecho" };
  if (edad <= 29) return { fase:"fundación: construyendo las primeras bases de su vida adulta", matiz:"lo que siembre ahora marca la estructura de las próximas décadas" };
  if (edad <= 43) return { fase:"consolidación: asumiendo responsabilidad real sobre su camino", matiz:"toca sostener lo construido y darle forma firme" };
  if (edad <= 51) return { fase:"punto medio: construyendo la obra de madurez, lo que va a quedar", matiz:"lo que construya en estos años perdura; no es un ensayo" };
  if (edad <= 58) return { fase:"cosecha: afinando lo sembrado y preparando lo que va a transmitir", matiz:"toca pulir la obra y pensar qué deja y a quién" };
  return { fase:"nueva vuelta: sabiduría y reinvención madura", matiz:"puede reinventarse desde lo aprendido, sin nada que demostrar" };
}

// ════════════════════════════════════════════════════════════
// BLOQUE D — Traducción a lenguaje VER·A + cruce psicológico
// ════════════════════════════════════════════════════════════
const ELEMENTOS_PROSA = {
Fire: { fuerte:"el impulso y la chispa para arrancar", debil:"el impulso: esa chispa que enciende la acción y saca de la inercia" },
Earth: { fuerte:"la constancia y la capacidad de sostener en lo concreto", debil:"el aterrizaje: bajar las ideas a lo concreto y sostener una rutina" },
Air: { fuerte:"la claridad mental y la facilidad con las ideas y la gente", debil:"la claridad para ordenar las ideas y ponerlas en palabras" },
Water: { fuerte:"la hondura emocional y la intuición", debil:"la conexión emocional: sentir hondo y escuchar el mundo interno" }
};

const EFECTO_DEBIL = {
Fire:"posterga, espera a tener ganas en vez de generar el movimiento",
Earth:"se dispersa, deja cosas a medio terminar, le cuesta sostener una rutina",
Air:"le cuesta poner en palabras lo que siente, se enreda sin claridad",
Water:"se desconecta de lo que siente, racionaliza de más"
};

const QUALITIES_ES = {
liberation:"liberación", inspiration:"inspiración", speech:"la fuerza de la palabra",
motivation:"motor interno", will:"fuerza de voluntad", health:"sostener su salud con intención",
blessings:"gratitud y abundancia", agriculture:"cultivo paciente de lo que siembra", gratitude:"gratitud",
vivification:"capacidad de dar vida y energía", writing:"expresión a través de la escritura",
unity:"unión y cierre de divisiones", "breaking barriers":"romper barreras", science:"claridad y discernimiento",
rituals:"el valor de los hábitos", ceremonies:"sentido de lo significativo", treasures:"valorar lo que tiene"
};

function traducirQualities(qualities) {
  if (!Array.isArray(qualities) || !qualities.length) return "";
  const t = qualities.map(q => QUALITIES_ES[q] || q);
  if (t.length === 1) return t[0];
  return t.slice(0, -1).join(", ") + " y " + t[t.length - 1];
}

// El filtro de salida se mantiene como RED DE SEGURIDAD, no como fuente.
// La instrucción fuerte va en el prompt; esto solo atrapa fugas.
const PALABRAS_PROHIBIDAS = [
/\bplaneta\b/gi, /\bsigno\b/gi, /casa astrol/gi, /carta natal/gi, /astrolog/gi, /horóscopo/gi,
/zodíac/gi, /zodiac/gi, /\bascendente\b/gi, /quir[oó]n/gi, /\bnodo\b/gi, /kabbalah/gi, /tikkun/gi,
/tik[uú]n/gi, /tr[aá]nsito/gi, /retr[oó]grado/gi, /\bleo\b/gi, /\btauro\b/gi, /\baries\b/gi,
/g[eé]minis/gi, /\bvirgo\b/gi, /\blibra\b/gi, /escorpio/gi, /sagitario/gi,
/capricornio/gi, /acuario/gi, /piscis/gi, /\bc[aá]ncer\b/gi, /[aá]ngel/gi, /reiyel/gi, /sealiah/gi,
/hebreo/gi, /\bsalmo\b/gi, /\btarot\b/gi, /numerolog/gi, /chakra/gi
];

function limpiarTexto(texto) {
  if (!texto) return "";
  let limpio = texto;
  for (const re of PALABRAS_PROHIBIDAS) limpio = limpio.replace(re, "");
  return limpio.replace(/\s{2,}/g, " ").trim();
}

function construirAutorreporte(p1, p2, p3, p4) {
  const notas = [];
  if (p1 === "tierra") notas.push("Se apoya en hechos concretos.");
  else if (p1 === "intuicion") notas.push("Se apoya en posibilidades más que en hechos: mira hacia lo que podría ser.");
  if (p2 === "corazon") notas.push("Decide desde lo que siente y valora.");
  else if (p2 === "razon") notas.push("Decide desde la lógica antes que desde la emoción.");
  if (p3 === "gente") notas.push("Recarga con gente.");
  else if (p3 === "espacio") notas.push("Recarga en soledad.");
  if (p4 === "reacciono") notas.push("Bajo presión responde rápido, antes de procesar.");
  else if (p4 === "guardo") notas.push("Bajo presión se lo guarda: por fuera sigue bien, por dentro se acumula.");
  else if (p4 === "suelto") notas.push("Bajo presión respira y suelta.");
  return notas.join(" ");
}

function traducirAVerA(carta, frecuencia, tikkun, fase, esencia, autorreporte) {
  return {
    fortaleza_descrita: ELEMENTOS_PROSA[carta.fuerte].fuerte,
    debilidad_descrita: ELEMENTOS_PROSA[carta.debil].debil,
    efecto_practico_debilidad: EFECTO_DEBIL[carta.debil],
    fortaleza_frecuencia: limpiarTexto(traducirQualities(frecuencia.fortaleza_qualities)),
    recurso_frecuencia: limpiarTexto(traducirQualities(frecuencia.recurso_qualities)),
    leccion_a_corregir: limpiarTexto(tikkun.interpretacion),
    fase_vida: fase.fase,
    matiz_personal: fase.matiz,
    esencia: esencia,
    autorreporte: autorreporte
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE E2 — Construir los 8 prompts
// ════════════════════════════════════════════════════════════

const SYSTEM_BASE = `Eres la voz de VER·A, educación emocional personalizada en español.

QUÉ HACES
Recibes datos calculados sobre una persona. Los traduces a lenguaje humano y le muestras algo que ella no se había dicho. No describes: confrontas con precisión y cariño.

LAS 5 REGLAS

1. NOMBRA LA EVASIÓN, NO LA CUALIDAD.
Mal: "eres generosa"
Bien: "das para que no te dejen, por eso nunca pides"

2. MOMENTOS, NO ADJETIVOS.
Mal: "te cuesta la iniciativa"
Bien: "hay algo que llevas semanas sin enviar. Sabes cuál"

3. PRECISIÓN SIN JUICIO.
Sí: "te escondes en tu cabeza y le llamas descansar"
No: "eres cobarde"

4. ABRE CON LO MÁS INCÓMODO Y CIERTO. Sin preámbulo, sin saludo, sin "hay algo en ti".

5. CIERRA CON EL RIESGO: "Puede parecer [lo que ven], pero es [lo que evitas]".

PROHIBIDO ABSOLUTO
- Nunca escribas: planeta, signo, casa, carta natal, astrología, horóscopo, zodíaco, ascendente, nodo, kabbalah, tikún, tránsito, retrógrado, grado, ningún nombre de signo (Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis), ángel, salmo, tarot, número, numerología, chakra.
- Nunca uses Fuego/Tierra/Aire/Agua como categorías. Prohibido "tu energía dominante es X".
- Nunca escribas cifras de cálculo ni la palabra "grado". Los datos que recibes son para afinar tu lectura INTERNAMENTE. La persona jamás debe intuir que hay un cálculo detrás.
- Nunca uses vocabulario místico: energía, alma, vibrar, destino, abundancia, alinear, misión, "viniste a", "estás llamado a", "tu propósito es".
- Nunca adules: "capacidad que excede lo ordinario", "algo poco común en ti", "a escala grande".
- Nunca persuadas al lector de que crea ("si no te resuena, está bien", "no tienes nada que perder").
- Nunca cierres con lista de actividades.

FORMATO
Máximo 180 palabras por módulo. Frases cortas. Si una frase no revela algo, bórrala.

ESPAÑOL NEUTRO: usa "tú" (tú eres, tú tienes). Prohibido vos/tenés/sos/querés/podés. Sin regionalismos.

GÉNERO NEUTRO: no conoces el género. Nunca uses adjetivos ni participios marcados (articulado/a, seguro/a), ni "tú mismo/misma". Reformula: "tú lo reconoces", "lo sostienes tú", "tu claridad".

TEXTO LIMPIO: nunca muestres correcciones, titubeos ni "es decir". Entrega solo la versión final.`;

function bloqueDatos(carta) {
  const fuerzas = carta.listaFuerzas.map(f => {
    const r = f.reflexivo ? " [mira hacia adentro]" : "";
    return `- ${f.etiqueta}: ${f.signo}, en ${f.area}${r}`;
  }).join("\n");

  const tensiones = carta.aspectos.length
    ? carta.aspectos.map(a => `- ${a.p1} ${a.tipo} ${a.p2}${a.tenso ? " (TENSIÓN: aquí hay fricción real)" : ""}`).join("\n")
    : "- (sin tensiones marcadas)";

  return { fuerzas, tensiones };
}

function construirPrompts(nombre, carta, vera) {
  const { fuerzas, tensiones } = bloqueDatos(carta);
  const auto = vera.autorreporte ? `\nLO QUE DICE DE SÍ: ${vera.autorreporte}` : "";

  const FRECUENCIAS = {
    Earth: { hz:"7.83 Hz", para:"cuando pierde el centro y le falta aterrizaje", link:"https://youtu.be/SO3vBRaGcYw" },
    Fire:  { hz:"285 Hz",  para:"cuando le falta empuje y ganas de arrancar",     link:"https://youtu.be/mAUsMe7lauE" },
    Air:   { hz:"741 Hz",  para:"cuando no puede expresarse y le falta claridad", link:"https://youtu.be/8TioM0izmi0" },
    Water: { hz:"639 Hz",  para:"cuando un vínculo o una emoción necesitan sanar", link:"https://youtu.be/IqcT6PIIMro" }
  };
  const frec = FRECUENCIAS[carta.debil];

  const prompts = {};

  // ── 1. RETRATO — zona: qué muestra vs. qué esconde ──
  prompts.retrato = {
    system: SYSTEM_BASE,
    user: `Escribe "Tu Retrato" para ${nombre}.

TU ZONA EXCLUSIVA: la distancia entre lo que ${nombre} muestra al mundo y lo que guarda. Nada más. No hables de su debilidad práctica, ni de su herida, ni de su etapa de vida: eso tiene módulos propios.

DATOS (traduce, nunca los nombres):
Cómo se presenta: ${carta.ascendente.signo}, en ${carta.ascendente.area}
Su lugar público: ${carta.medioCielo.signo}, en ${carta.medioCielo.area}
Sus fuerzas internas:
${fuerzas}
Tensiones reales de su estructura:
${tensiones}${auto}

ESTRUCTURA (sin títulos internos, texto corrido, máx 180 palabras):
1. Abre nombrando lo que proyecta y lo que hay debajo. Directo, incómodo, cierto.
2. Un momento concreto donde se nota esa distancia.
3. Cierra con el riesgo: "Puede parecer X, pero es Y".`
  };

  // ── 2. ESENCIA — zona: qué da y qué no pide ──
  prompts.esencia = {
    system: SYSTEM_BASE,
    user: `Escribe "Tu Esencia" para ${nombre}.

TU ZONA EXCLUSIVA: qué da esta persona, por qué lo aprendió, y qué no se permite pedir a cambio. Nada más.

DATOS (mecanismos, no cualidades — úsalos como diagnóstico):
Su raíz: ${vera.esencia.significado_camino}
Su dirección: ${vera.esencia.significado_destino}
Su motor privado: ${vera.esencia.significado_alma}
Lo que proyecta: ${vera.esencia.significado_personalidad}

PROHIBIDO ADICIONAL EN ESTE MÓDULO: jamás menciones ni insinúes números, sumas, letras, nombres o fechas como origen. Nada de "tu nombre revela".

ESTRUCTURA (texto corrido, máx 180 palabras):
1. Abre con lo que da y el cansancio que eso le produce.
2. El mecanismo: por qué lo aprendió (causa concreta, no etiqueta).
3. Lo que esconde: su iniciativa, su ambición, lo que no se permite mostrar.
4. Cierra con el riesgo.`
  };

  // ── 3. FRECUENCIA — zona: su fuerza y qué evita usándola ──
  prompts.frecuencia = {
    system: SYSTEM_BASE,
    user: `Escribe "Tu Frecuencia de Origen" para ${nombre}.

TU ZONA EXCLUSIVA: su fuerza natural, y cómo esa misma fuerza le sirve para evitar otra cosa. No repitas su debilidad práctica (módulo Equilibrio) ni su herida (módulo Herida).

DATOS:
Su fuerza: ${vera.fortaleza_frecuencia}
Su recurso en lo difícil: ${vera.recurso_frecuencia}

ESTRUCTURA (texto corrido, máx 180 palabras):
1. Nombra su fuerza con precisión, sin elogiarla.
2. El giro: en qué momentos usa esa fuerza para no enfrentar algo.
3. Una práctica concreta para los días en que la fuerza no aparece. Debe ser DISTINTA de "respirar antes de reaccionar" y de "escribir lo que sientes" (esas pertenecen a otros módulos).
4. Una sola frase de cierre, repetible.`
  };

  // ── 4. EQUILIBRIO — zona: dónde su fuerza se vuelve excusa ──
  prompts.equilibrio = {
    system: SYSTEM_BASE + `\n\nESTE MÓDULO ES EL MÁS PRÁCTICO. Diagnóstico rápido y herramientas para hoy. Aquí puedes pasar de 180 palabras si las prácticas lo requieren, hasta 250.`,
    user: `Escribe "Tu Equilibrio Energético" para ${nombre}.

TU ZONA EXCLUSIVA: el desequilibrio concreto entre lo que le sobra y lo que le falta, y qué hacer HOY. Este es el único módulo que trata su debilidad práctica.

DATOS:
Lo que le falta: ${vera.debilidad_descrita}
Cómo se le nota: ${vera.efecto_practico_debilidad}
Lo que le sobra: ${vera.fortaleza_descrita}
Sonido de apoyo: ${frec.hz}, para ${frec.para} — ${frec.link}${auto}

ESTRUCTURA:
1. Su desequilibrio en dos líneas. Sin rodeos.
2. Lo que le está costando: 2-3 líneas concretas, cosas que ya vive.
3. Tres prácticas numeradas, accionables hoy. Verbos de acción. Nada abstracto.
4. Su sonido: preséntalo como herramienta, di cuándo usarlo, incluye el enlace.`
  };

  // ── 5. HERIDA — zona: qué hace hoy por ese dolor ──
  prompts.herida = {
    system: SYSTEM_BASE + `\n\nTONO: directo y honesto. Nombras la herida de frente. PROHIBIDO negociar con el lector o convencerlo de que crea. Si el texto es certero, no necesita defenderse.`,
    user: `Escribe "Tu Herida y tu Don" para ${nombre}.

TU ZONA EXCLUSIVA: dónde se siente insuficiente y qué hace HOY a causa de eso. No hables de su etapa de vida ni de dónde se refugia: eso tiene módulos propios.

DATOS:
Dónde duele: ${carta.herida.signo}, en ${carta.herida.area}
Lo que vino a corregir: ${vera.leccion_a_corregir}
Lo reprimido: ${carta.lilith.signo}, en ${carta.lilith.area}${auto}

ESTRUCTURA (texto corrido, máx 200 palabras):
1. Abre nombrando la herida en una frase corta y exacta.
2. Cómo se nota: 2-3 momentos concretos y reconocibles de su vida real.
3. El giro: cómo eso mismo, trabajado, se vuelve su fuerza. Afírmalo, no lo prometas.
4. Una sola práctica para esta semana. Pequeña, específica.`
  };

  // ── 6. DIRECCIÓN (NUEVO) — zona: dónde se refugia vs. hacia dónde crece ──
  prompts.direccion = {
    system: SYSTEM_BASE,
    user: `Escribe "Tu Dirección" para ${nombre}.

TU ZONA EXCLUSIVA: el lugar conocido al que vuelve cuando se siente inseguro, y el terreno incómodo donde está su crecimiento. Nada más.

DATOS:
Terreno conocido (su refugio): ${carta.nodoSur.signo}, en ${carta.nodoSur.area}
Terreno de crecimiento: ${carta.nodoNorte.signo}, en ${carta.nodoNorte.area}

ESTRUCTURA — EXACTAMENTE 3 BLOQUES, con los ejemplos INTEGRADOS dentro de las frases (nunca en lista aparte):

1. PATRÓN CONOCIDO: qué hace cuando se siente inseguro, con 2-3 ejemplos concretos metidos en la misma frase. Debe sonar a algo que hizo esta semana.
2. CRECIMIENTO REAL: hacia dónde le toca ir, con ejemplos concretos igualmente integrados. No lo plantees como consejo ni como "deberías": descríbelo como el terreno donde su seguridad se construye de verdad.
3. EL RIESGO: una o dos líneas. Formato "puede parecer [lo que otros ven], pero es [lo que evita]".

Máx 180 palabras. Sin títulos internos numerados: que fluya como texto.`
  };

  // ── 7. MOMENTO — zona: qué le toca atravesar y posterga ──
  prompts.momento_actual = {
    system: SYSTEM_BASE + `\n\nESTE MÓDULO ES CORTO y debe SORPRENDER. Realista sin endulzar, pero mostrando lo que esta etapa concreta permite hacer AHORA y no en otro momento.`,
    user: `Escribe "Tu Momento Actual" para ${nombre}. Máximo 130 palabras.

TU ZONA EXCLUSIVA: la etapa de vida que atraviesa y lo que está postergando de ella. No repitas su debilidad, su herida ni sus prácticas: todo eso vive en otros módulos.

DATOS:
Su etapa: ${vera.fase_vida}
Matiz: ${vera.matiz_personal}

ESTRUCTURA (texto corrido, sin títulos):
1. Nombra su etapa desde un ángulo que no espera. Honesto si es exigente.
2. Lo que esta etapa concreta le permite construir y ninguna otra le permitiría.
3. Cierra con la pregunta o afirmación que lo empuje a hoy.`
  };

  // ── 8. PRÁCTICA DIARIA — zona: qué hace mañana ──
  prompts.practica_diaria = {
    system: SYSTEM_BASE + `\n\nESTE MÓDULO CIERRA EL PERFIL. Tono cálido y sereno: aquí no confrontas, acompañas. La idea de fondo: una máquina puede conocerte, pero solo tú puedes sentir. Ahí está el poder de la persona. Dilo sin sonar a eslogan.`,
    user: `Escribe "Tu Práctica Diaria" para ${nombre}. Máximo 200 palabras.

TU ZONA EXCLUSIVA: la rutina concreta de mañana. No diagnostiques de nuevo: eso ya está hecho en los módulos anteriores.

DATOS:
Su fuerza: ${vera.fortaleza_descrita}
Su foco de crecimiento: ${vera.debilidad_descrita}${auto}

ESTRUCTURA:
Apertura de 2 líneas: aquí termina de leer y empieza a vivir.
1. Tu gratitud de hoy — una frase de gratitud hecha a su medida, ligada a su fuerza real. No genérica.
2. Lo que en ti es más grande que tu miedo — una fuerza propia a la que recurrir, sin marco religioso, y una forma concreta de conectarse con ella hoy.
3. Tu pregunta de hoy — una sola pregunta afinada a su foco de crecimiento, para observarse durante el día.
Cierre de una línea, cálido.`
  };

  return prompts;
}

// ════════════════════════════════════════════════════════════
// BLOQUE E1 — Llamar a Claude y orquestar (8 en paralelo)
// ════════════════════════════════════════════════════════════
const CLAUDE_MODEL = "claude-sonnet-4-6";

async function llamarClaude(systemPrompt, userPrompt, claudeKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  const rawText = await res.text();
  if (!res.ok) throw new Error(`Claude ${res.status}: ${rawText.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(rawText); }
  catch (e) { throw new Error(`Claude no-JSON: ${rawText.slice(0, 300)}`); }
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

async function generarModulos(prompts, claudeKey) {
  const claves = ["retrato","esencia","frecuencia","equilibrio","herida","direccion","momento_actual","practica_diaria"];
  const resultados = await Promise.allSettled(
    claves.map(k => llamarClaude(prompts[k].system, prompts[k].user, claudeKey))
  );
  const perfil = {};
  resultados.forEach((r, i) => {
    perfil[claves[i]] = (r.status === "fulfilled" && r.value) ? limpiarTexto(r.value) : null;
  });
  return perfil;
}

// ════════════════════════════════════════════════════════════
// BLOQUE A — Handler de Vercel
// ════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", chunk => { raw += chunk; });
      req.on("end", () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
      req.on("error", reject);
    });
  } catch (err) {
    return res.status(400).json({ error: "Body error: " + err.message });
  }

  const {
    nombre, nombreCompleto, email,
    fecha, ciudad, paisCodigo,
    hora, franja, horaConocida,
    p1, p2, p3, p4,
    consentimiento, pago
  } = body;

  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!CLAUDE_KEY) return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY." });
  if (!ASTRO_KEY) return res.status(500).json({ error: "Falta ASTROLOGY_API_KEY." });

  const faltan = [];
  if (!nombre) faltan.push("nombre");
  if (!nombreCompleto) faltan.push("nombreCompleto");
  if (!fecha) faltan.push("fecha");
  if (!ciudad) faltan.push("ciudad");
  if (!paisCodigo) faltan.push("paisCodigo");
  if (faltan.length) return res.status(400).json({ error: "Faltan datos obligatorios: " + faltan.join(", ") });

  const FRANJAS = { madrugada: "03:00", manana: "09:00", tarde: "15:00", noche: "21:00" };
  let horaCalculo, usoFranja = false;
  if (horaConocida && hora) { horaCalculo = hora; }
  else if (franja && FRANJAS[franja]) { horaCalculo = FRANJAS[franja]; usoFranja = true; }
  else { horaCalculo = "12:00"; usoFranja = true; }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horaH, horaM] = horaCalculo.split(":").map(Number);

  try {
    const esencia = calcularEsencia(nombreCompleto, dia, mes, anio);

    const subject = armarSubject(nombre, anio, mes, dia, horaH, horaM, ciudad, paisCodigo);
    const kabbalah = armarKabbalah(anio, mes, dia, horaH, horaM, ciudad, paisCodigo);

    const [cartaRaw, angelesRaw, tikkunRaw] = await Promise.all([
      llamarAstrologyAPI("/api/v3/charts/natal", subject, ASTRO_KEY),
      llamarAstrologyAPI("/api/v3/kabbalah/birth-angels", kabbalah, ASTRO_KEY),
      llamarAstrologyAPI("/api/v3/kabbalah/tikkun", kabbalah, ASTRO_KEY)
    ]);

    const carta = procesarCartaNatal(cartaRaw);
    const frecuencia = procesarFrecuencia(angelesRaw);
    const tikkun = procesarTikkun(tikkunRaw);
    const edad = calcularEdad(anio, mes, dia);
    const fase = calcularFaseVida(edad);

    const autorreporte = construirAutorreporte(p1, p2, p3, p4);
    const vera = traducirAVerA(carta, frecuencia, tikkun, fase, esencia, autorreporte);

    const prompts = construirPrompts(nombre, carta, vera);
    const modulos = await generarModulos(prompts, CLAUDE_KEY);

    await guardarEnHoja({
      nombre: nombreCompleto || nombre || "",
      nombreCompleto: nombreCompleto || "",
      email: email || "",
      fecha: fecha || "",
      ciudad: ciudad || "",
      pais: paisCodigo || "",
      hora: horaConocida && hora ? hora : (franja || ""),
      consentimiento: consentimiento || "",
      pago: pago || "No"
    });

    if (pago === "Si") {
      await enviarEmailPerfil(email, nombre, modulos, RESEND_KEY);
    }

    const avisoFranja = usoFranja
      ? "Este perfil se calculó con una franja horaria aproximada. Con tu hora exacta de nacimiento podemos afinarlo aún más."
      : null;

    return res.status(200).json({ nombre, modulos, avisoFranja });

  } catch (err) {
    return res.status(500).json({ error: "Error generando perfil: " + err.message });
  }
};
