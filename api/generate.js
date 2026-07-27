// ============================================================
// VER·A — generate.js (motor del Perfil VER·A)
// VERSIÓN 3.0 — 24 julio 2026  ← ESTA ES LA BUENA
//
// ARQUITECTURA DE DOS PASOS:
//   PASO 1: un astrólogo/numerólogo experto interpreta la carta SIN
//           filtros y produce un informe interno profundo (6000 tokens).
//           Identifica los 3-4 EJES que definen a la persona, cruza
//           posiciones y aspectos, usa de verdad el nombre, los ángeles
//           y los nodos. No llena casillas: va a la profundidad.
//   PASO 2: 9 módulos reciben ese informe y lo traducen a lenguaje VER·A.
//
// CAMBIOS CLAVE vs versiones previas:
// - Análisis experto que piensa por ejes, no por casillas.
// - Módulo nuevo "Tu Misión y tu Camino" (vocación, entornos, activo sin usar).
// - Ajuste por EDAD (menores de 20 sin ejemplos de pareja/socios/hipotecas).
// - Módulos generados en TANDAS de 3 con reintento (arregla módulos vacíos).
// - BUG CORREGIDO: limpiarTexto ya no colapsa los saltos de línea
//   (era lo que pegaba los títulos ## al texto).
// - Equilibrio obligatorio: cada módulo nombra capacidades reales, no solo fallas.
// ============================================================

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
  quien_eres:      "Quién Eres",
  herida:          "Tu Herida y Cómo Sanarla",
  equilibrio:      "De Qué Careces y Cómo Trabajarlo",
  camino:          "Tu Camino",
  practica_diaria: "Tu Práctica Diaria"
};
const ORDEN_MODULOS = ["quien_eres","herida","equilibrio","camino","practica_diaria"];

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
      tipoTecnico: a.aspect_type,
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
/tik[uú]n/gi, /tr[aá]nsito/gi, /retr[oó]grado/gi,
/g[eé]minis/gi, /escorpio/gi, /sagitario/gi,
/capricornio/gi, /acuario/gi, /piscis/gi, /[aá]ngel/gi, /reiyel/gi, /sealiah/gi,
/hebreo/gi, /\bsalmo\b/gi, /\btarot\b/gi, /numerolog/gi, /chakra/gi,
// nombres de planetas/puntos que se filtraron
/\bmedio cielo\b/gi, /\bmedium coeli\b/gi, /\bmercurio\b/gi, /\bvenus\b/gi,
/\bmarte\b/gi, /\bj[uú]piter\b/gi, /\bsaturno\b/gi, /\burano\b/gi, /\bneptuno\b/gi,
/\bplut[oó]n\b/gi, /\blilith\b/gi
];

// Términos que, si aparecen SOLOS (sin contexto astrológico obvio), se reemplazan
// por una palabra neutra en vez de eliminar la frase, para no perder contenido bueno.
const REEMPLAZOS = [
  [/\btu MC\b/gi, "tu imagen pública"], [/\bel MC\b/gi, "la imagen pública"],
  [/\bMC\b/g, "imagen pública"],
  [/\btu Luna\b/gi, "tu mundo emocional"], [/\buna Luna\b/gi, "un mundo emocional"],
  [/\bla Luna\b/gi, "el mundo emocional"], [/\bel Sol\b/gi, "tu identidad"],
  [/\btu Sol\b/gi, "tu identidad"]
];

// Divide en oraciones; elimina las que contengan un término prohibido; deja el resto intacto.
function quitarFrasesTecnicas(texto) {
  const bloques = texto.split(/\n/);
  return bloques.map(linea => {
    // no tocar líneas de título ni enlaces
    if (/^#{1,3}\s/.test(linea.trim()) || /\]\(https?:/.test(linea)) return linea;
    const oraciones = linea.split(/(?<=[.!?])\s+/);
    const filtradas = oraciones.filter(o => !PALABRAS_PROHIBIDAS.some(re => { re.lastIndex = 0; return re.test(o); }));
    return filtradas.join(" ");
  }).join("\n");
}

function limpiarTexto(texto) {
  if (!texto) return "";
  let limpio = texto;
  // 1) Reemplazos suaves (no rompen la frase).
  for (const [re, rep] of REEMPLAZOS) limpio = limpio.replace(re, rep);
  // 2) Cualquier frase que AÚN contenga un término técnico se elimina completa.
  limpio = quitarFrasesTecnicas(limpio);
  // 3) Formato de títulos.
  limpio = limpio.replace(/([^\n])\s*(#{2,3}\s)/g, "$1\n\n$2");
  limpio = limpio.split("\n").map(l => l.replace(/[ \t]{2,}/g, " ").trimEnd()).join("\n");
  limpio = limpio.replace(/\n{3,}/g, "\n\n");
  return limpio.trim();
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
// PASO 1 — ANÁLISIS EXPERTO (interno, nunca lo ve el usuario)
// Aquí el modelo interpreta SIN restricciones de vocabulario.
// El filtro de lenguaje VER·A se aplica después, en la redacción.
// ════════════════════════════════════════════════════════════

const SYSTEM_ANALISIS = `Eres un astrólogo, numerólogo y analista de la tradición de los 72 nombres, con nivel de maestría. Produces un INFORME INTERNO que un redactor usará luego. El cliente NO lo lee, así que escribe con todo tu vocabulario técnico, sin filtros.

TU FORMA DE TRABAJAR (esto es lo que te distingue de un lector superficial):

NO llenas casillas. NO describes planeta por planeta en abstracto. Haces lo que hace un maestro cuando le ponen una carta delante:

1. PRIMERO IDENTIFICAS LOS EJES. Miras toda la carta y encuentras los 3 o 4 patrones que se REPITEN o que CHOCAN. Un solo planeta dice poco; tres factores apuntando a lo mismo definen a la persona. Un planeta en tensión con otro (cuadratura, oposición, orbe cerrado) es donde vive el conflicto real. Ahí está la persona, no en la lista.

2. CRUZAS SIEMPRE. Nunca "Sol en Leo = brillante". Siempre: "Sol en Leo PERO pegado a Saturno = quiere brillar y se autocensura antes de mostrarse". El significado está en la combinación, jamás en el dato suelto. Un aspecto de orbe menor a 1 grado es determinante: dale el peso que merece.

3. VAS A LA PROFUNDIDAD, NO A LA COBERTURA. Es mejor desarrollar 4 ejes a fondo, con su mecanismo psicológico y cómo se manifiesta en la vida real, que tocar 12 posiciones por encima. Si un planeta no aporta a un eje central, MENCIONALO BREVE O DEJALO. No rellenes.

4. CADA FUENTE APORTA ALGO DISTINTO. USALAS TODAS DE VERDAD:
   - CARTA (signos + casas + aspectos): el carácter, las tensiones, la estructura psiquica.
   - NUMEROLOGIA DEL NOMBRE Y LA FECHA: esto NO es decorativo. El Camino de vida es la leccion central de la existencia. El Alma es lo que la persona anhela en secreto. El Destino es hacia donde la empuja la vida. La Personalidad es la mascara. CRUZA la numerologia con la carta: el numero de Alma confirma lo que dice la Luna, o lo contradice? Esa coincidencia o choque es informacion valiosa. Dedicale analisis real, no una linea.
   - FRECUENCIA / ANGELES: la fortaleza innata (angel principal) y el recurso para la crisis (angel secundario). Traduce sus cualidades a capacidades humanas concretas y di COMO se activan.
   - NODOS: el Nodo Sur es la zona de confort, lo que la persona ya domina y usa como refugio para no crecer. El Nodo Norte es la direccion incomoda donde esta su evolucion. Este eje es de los mas reveladores: desarrollalo con cuidado, con ejemplos de comportamiento.
   - QUIRON: la herida central de valor. LILITH: lo que reprime, lo que no se permite, su fuerza en sombra.

5. TODO APUNTA A UN FIN: ayudar a la persona a ENTENDER Y TRABAJAR SUS EMOCIONES. No haces un retrato para que se admire. Haces un diagnostico para que se transforme. Por cada patron que nombres, piensa: de que le sirve esto para conocerse y crecer?

SI NO HAY HORA:
No tienes Ascendente ni casas fiables. Dilo. Pero el caracter se lee igual de bien con signos, aspectos, elementos, numerologia y angeles. Profundiza en eso.

ESTRUCTURA DEL INFORME (libre en la forma, pero cubre esto):

EJES CENTRALES: los 3-4 patrones que definen a esta persona, cada uno cruzando varios factores, cada uno con su mecanismo psicologico. Este es el corazon del informe. Extenso.

FORTALEZAS REALES: que tiene de verdad, anclado en la carta/numero/angel, y para que le sirve en la vida concreta.

DEBILIDADES Y COMO TRABAJARLAS: sus puntos debiles reales (del elemento ausente, de los aspectos tensos, del Nodo Sur), y para cada uno, COMO se corrige. Concreto, accionable.

LA HERIDA Y COMO TRABAJARLA: de donde viene (Quiron, Luna, numero), como se manifiesta hoy, y el camino concreto de sanacion.

EL NOMBRE Y EL ANHELO: que revela la numerologia del nombre y la fecha sobre su mision y su motor secreto. Cruzado con la carta.

LA FRECUENCIA DE ORIGEN: fortaleza innata y recurso de crisis, de los angeles, traducido a lo humano.

DIRECCION DE VIDA: el eje de los nodos, de que refugio sale, hacia donde va.

CAMINO / VOCACION: donde rinde, que entornos lo potencian y cuales lo agotan.

SINTESIS EMOCIONAL: la frase central, cual es el trabajo emocional de esta persona en esta vida. Que debe aprender a sentir, soltar o sostener.

Se denso, especifico y cruzado. Este informe es la materia prima de todo el perfil: si es profundo, el perfil sera profundo.`;

function construirPromptAnalisis(nombre, edad, carta, esencia, frecuencia, tikkun, hayHora) {
  const P = (p) => (p && p.signo)
    ? `${p.signo}${(hayHora && p.area) ? ` — ${p.area}` : ""}${p.reflexivo ? " [retrógrado]" : ""}`
    : "—";

  const planetas = carta.listaFuerzas.map(f =>
    `${f.clave}: ${f.signo}${hayHora && f.area ? ` — ${f.area}` : ""}${f.reflexivo ? " [retrógrado]" : ""}`
  ).join("\n");

  const aspectos = carta.aspectos.length
    ? carta.aspectos.map(a => `${a.p1} ${a.tipoTecnico} ${a.p2} (orbe ${a.orbe}°)`).join("\n")
    : "sin aspectos de orbe cerrado";

  const bloqueHora = hayHora
    ? `Ascendente: ${P(carta.ascendente)}\nMedio Cielo: ${P(carta.medioCielo)}\n(Casas fiables: hora confirmada.)`
    : `SIN HORA DE NACIMIENTO. No dispones de Ascendente ni casas fiables. NO las inventes ni las menciones. Compensa profundizando en signos, aspectos, elementos, numerología y frecuencia.`;

  return `Analiza técnicamente a esta persona. Informe interno, denso, sin suavizar.

DATOS
Nombre: ${nombre}
Edad: ${edad} años

${bloqueHora}

POSICIONES
${planetas}

Quirón: ${P(carta.herida)}
Lilith: ${P(carta.lilith)}
Nodo Norte: ${P(carta.nodoNorte)}
Nodo Sur: ${P(carta.nodoSur)}

BALANCE ELEMENTAL
Fuego ${carta.conteo.Fire} · Tierra ${carta.conteo.Earth} · Aire ${carta.conteo.Air} · Agua ${carta.conteo.Water}

ASPECTOS DE ORBE CERRADO
${aspectos}

NUMEROLOGÍA (pitagórica, forma B)
Camino de vida: ${esencia._numeros.camino}
Destino: ${esencia._numeros.destino}
Alma: ${esencia._numeros.alma}
Personalidad: ${esencia._numeros.personalidad}

FRECUENCIA DE ORIGEN
Fortaleza: ${frecuencia.fortaleza_meaning || "—"} (${(frecuencia.fortaleza_qualities || []).join(", ") || "—"})
Recurso en dificultad: ${frecuencia.recurso_meaning || "—"} (${(frecuencia.recurso_qualities || []).join(", ") || "—"})

TIKKUN
${tikkun.tema || "—"} — ${tikkun.interpretacion || "—"}

Produce el informe completo con la estructura indicada. Denso, específico, sin relleno.`;
}

// ════════════════════════════════════════════════════════════
// PASO 2 — REDACCIÓN VER·A (8 módulos, beben del informe)
// Aquí SÍ se aplica el filtro de lenguaje.
// ════════════════════════════════════════════════════════════

const SYSTEM_BASE = `Eres la voz de VER·A, educación emocional personalizada en español.

QUÉ RECIBES
Un informe técnico interno sobre una persona. Tu trabajo es traducirlo a lenguaje humano y entregarle algo que ella no se había dicho. El informe es tu fuente de verdad: no inventes nada que no esté ahí, y no te quedes corto usando solo una parte.

QUÉ HACES
No describes en abstracto: muestras. Cada afirmación debe poder reconocerse en un momento real de su vida.

LAS 5 REGLAS

1. NOMBRA LA EVASIÓN, NO SOLO LA CUALIDAD.
Flojo: "eres generosa"
Bien: "das para que no te dejen, por eso nunca pides"

2. MOMENTOS, NO ADJETIVOS.
Flojo: "te cuesta la iniciativa"
Bien: "hay algo que llevas semanas sin enviar. Sabes cuál"

3. PRECISIÓN SIN JUICIO.
Sí: "te escondes en tu cabeza y le llamas descansar"
No: "eres cobarde"

4. ABRE CON LO MÁS CIERTO E INCÓMODO. Sin preámbulo ni saludo.

5. CIERRA CON EL RIESGO: "Puede parecer [lo que ven], pero es [lo que evitas]".

EQUILIBRIO OBLIGATORIO
No todo es evasión. La persona también tiene capacidades reales: nómbralas con la misma precisión, diciendo para qué le sirven y dónde ya las usa. Un módulo que solo señala fallas es un juicio, no un espejo. Alterna: lo que hace bien, lo que evita, lo que puede hacer con eso.

PROHIBIDO ABSOLUTO
- Nunca escribas: planeta, signo, casa, carta natal, astrología, horóscopo, zodíaco, ascendente, nodo, kabbalah, tikún, tránsito, retrógrado, grado, ningún nombre de signo (Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis), ningún nombre de planeta o punto (Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno, Plutón, Quirón, Lilith), ángel, salmo, tarot, número, numerología, chakra, "Alma" seguido de cifra, "Camino" seguido de cifra.
- Nunca uses Fuego/Tierra/Aire/Agua como categorías ("tu energía dominante es X"). Puedes usar "chispa", "raíz", "claridad", "hondura" como metáforas sueltas.
- Nunca escribas cifras de cálculo ni la palabra "grado".
- Nunca uses vocabulario místico: energía, alma, vibrar, destino, abundancia, alinear, misión cósmica, "viniste a", "estás llamado a".
- Nunca adules: "capacidad que excede lo ordinario", "algo poco común en ti", "a escala grande".
- Nunca persuadas al lector de que crea ("si no te resuena, está bien", "no tienes nada que perder").
- Nunca nombres la máquina: algoritmo, sistema, inteligencia artificial, programa.

SIEMPRE SEGUNDA PERSONA (CRÍTICO): escribes DIRECTAMENTE a la persona, siempre "tú". PROHIBIDO hablar de ella en tercera persona con su nombre. Nunca "Camilo entiende", "lo que él necesita". Escribe "entiendes", "lo que necesitas". El nombre solo como vocativo directo, máximo una vez por módulo.

GÉNERO NEUTRO (CRÍTICO): no conoces el género. Prohibido todo adjetivo o participio marcado. Errores a evitar: "llegas preparado" → "llegas con todo listo"; "tú mismo" → "tú"; "te vuelves más frío" → "pones más distancia"; "estás cansado" → "cargas cansancio". Reformula con sustantivos ("tu claridad") o verbos ("hablas con claridad" en vez de "eres claro"). Revisa CADA frase.

TÍTULOS INTERNOS (CRÍTICO PARA EL FORMATO): cada título ## va SOLO en su línea, con una línea vacía ANTES y otra DESPUÉS. JAMÁS pegues un título al final de un párrafo.
INCORRECTO: "...y lo llamas descanso. ## Lo que te mueve Lo que te mueve..."
CORRECTO:
"...y lo llamas descanso.

## Lo que te mueve

Lo que te mueve..."
Antes de entregar, revisa que ningún ## quede en medio de una línea de texto.

ESPAÑOL NEUTRO: usa "tú". Prohibido vos/tenés/sos/querés/podés. Sin regionalismos.

TEXTO LIMPIO: nunca muestres correcciones ni titubeos. Solo la versión final.

TU MARCO (encárnalo, nunca lo nombres):
- Carl Jung: lo que no se hace consciente gobierna la vida y se vive como destino; la sombra integrada se vuelve fuerza. Nombra lo que la persona no ve de sí.
- Joe Dispenza: nadie está condenado a su pasado ni a su patrón; lo que se hace consciente se puede cambiar. Deja siempre una salida concreta, nunca una sentencia.
- Neville Goddard: lo que asumes por dentro moldea lo que vives por fuera. La imagen interna importa (dicho en lenguaje llano, sin misticismo).
- Conny Méndez: metafísica práctica y aterrizada, sin humo, con humor sereno.
- Mario Alonso Puig: autoridad serena, base en cómo funciona la mente y el cuerpo; esperanza con fundamento, no autoayuda vacía.
- PNL: el cambio es concreto. Da reencuadres, anclas, foco. Cada patrón nombrado viene con una palanca práctica para moverlo, no solo con el diagnóstico.
El fin de todo: que la persona termine ENTENDIENDO algo suyo y con una acción real para trabajarlo. Diagnóstico + salida, siempre.`;

function construirPrompts(nombre, edad, informe, vera, carta, hayHora) {
  const CTX = `INFORME INTERNO SOBRE ${nombre.toUpperCase()} (${edad} años):
${informe}

---
Traduce a lenguaje VER·A. Usa el informe como fuente de verdad. Nunca menciones su vocabulario técnico.`;

  const edadNota = edad < 20
    ? `\n\nIMPORTANTE — LA PERSONA TIENE ${edad} AÑOS. Ajusta los ejemplos a su vida real: estudios, amistades, familia, primeros trabajos, redes, decisiones sobre qué estudiar. PROHIBIDO hablar de pareja estable, socios, hipotecas, carreras consolidadas o "años de matrimonio". Habla de lo que ya vive, no de lo que vivirá.`
    : "";

  const FRECUENCIAS = {
    Earth: { hz:"7.83 Hz", para:"cuando pierdes el centro y te falta aterrizaje", link:"https://youtu.be/SO3vBRaGcYw" },
    Fire:  { hz:"285 Hz",  para:"cuando te falta empuje y ganas de arrancar",     link:"https://youtu.be/mAUsMe7lauE" },
    Air:   { hz:"741 Hz",  para:"cuando no puedes expresarte y te falta claridad", link:"https://youtu.be/8TioM0izmi0" },
    Water: { hz:"639 Hz",  para:"cuando un vínculo o una emoción necesitan sanar", link:"https://youtu.be/IqcT6PIIMro" }
  };
  const frec = FRECUENCIAS[carta.debil];

  const p = {};

  // ── 1. QUIÉN ERES (funde Retrato + Esencia + Frecuencia) ──
  p.quien_eres = {
    system: SYSTEM_BASE,
    user: `${CTX}${edadNota}

Escribe "Quién Eres". 500-600 palabras. Es el retrato central: quién es esta persona en su núcleo, su carácter, su motor y su fuerza natural, todo en UN solo hilo sin repetir.

Usa del informe: EJES CENTRALES, FORTALEZAS REALES, EL NOMBRE Y EL ANHELO, LA FRECUENCIA DE ORIGEN.

REGLA ANTIRREPETICIÓN CRÍTICA: elige los 3 ejes más fuertes del informe y desarróllalos UNA vez cada uno, a fondo. Si un rasgo ya lo dijiste, no vuelvas a él con otras palabras. Este es el ÚNICO módulo que describe su carácter general; los demás módulos NO lo repetirán, así que aquí va completo.

## Tu núcleo
Los 2-3 ejes que te definen, cruzados. La contradicción central entre lo que muestras y lo que necesitas. Concreto, con momentos reconocibles.

## Lo que te mueve por dentro
Tu motor privado, lo que anhelas sin decirlo. Y la distancia entre tu imagen externa y tu interior.

## Tu fuerza natural
Lo que haces bien sin esfuerzo, para qué te sirve, dónde ya lo usas. Con la misma precisión que lo demás, sin adular.

Cierra con el riesgo, sin título: "Puede parecer X, pero es Y".`
  };

  // ── 2. TU HERIDA Y CÓMO SANARLA (funde Herida + Dirección) ──
  p.herida = {
    system: SYSTEM_BASE + `\n\nTONO: directo y honesto, sin crueldad. Encarna a Jung (nombra lo que no ve) y Dispenza (deja siempre salida, nunca sentencia). No negocies con el lector.`,
    user: `${CTX}${edadNota}

Escribe "Tu Herida y Cómo Sanarla". 500-600 palabras. NO repitas el carácter general (eso ya está en el módulo anterior). Aquí solo: la herida, su origen, cómo se manifiesta hoy, el refugio donde se esconde, y el camino concreto de sanación.

Usa del informe: LA HERIDA Y CÓMO TRABAJARLA, DIRECCIÓN DE VIDA (nodos).

## Dónde dudas de merecer
La herida central, en una frase exacta. Después 2-3 momentos concretos y reconocibles donde aparece (según su edad).

## De dónde viene
Cómo aprendió esto antes de tener palabras. El mecanismo, no la culpa.

## Dónde te refugias
El patrón conocido al que corre cuando algo aprieta, con ejemplos concretos integrados en la frase. Y el terreno de crecimiento opuesto: hacia dónde le toca ir aunque incomode.

## Cómo se sana
El camino concreto. Reencuadre (PNL) + una práctica real. Dispenza: esto se transforma, no es condena. Cómo la herida trabajada se vuelve su fuerza y le sirve con otros.

Cierra con una práctica pequeña para esta semana, sin título.`
  };

  // ── 3. DE QUÉ CARECES Y CÓMO TRABAJARLO (Equilibrio) ──
  p.equilibrio = {
    system: SYSTEM_BASE + `\n\nEl más práctico. PNL pura: diagnóstico rápido y palancas concretas para hoy.`,
    user: `${CTX}${edadNota}

Escribe "De Qué Careces y Cómo Trabajarlo". 400-450 palabras. NO repitas la herida ni el carácter. Aquí solo: la carencia práctica concreta y cómo entrenarla.

Usa del informe: DEBILIDADES Y CÓMO TRABAJARLAS, BALANCE ELEMENTAL.

Párrafo de apertura sin título: tu desequilibrio en dos líneas. Qué te sobra y qué te falta.

## Lo que esto te está costando
2-3 líneas concretas de lo que ya vives por esa carencia.

## Tres cosas que puedes hacer hoy
Exactamente tres prácticas numeradas (1. 2. 3.), cada una en su línea, accionables hoy, con verbos de acción. Anclas y reencuadres de PNL.

## Tu sonido
Preséntalo como herramienta: ${frec.hz}, para ${frec.para}. Incluye el enlace [Escúchalo aquí](${frec.link}).

Cierra con el riesgo, sin título.`
  };

  // ── 4. TU CAMINO (funde Misión + Momento actual) ──
  p.camino = {
    system: SYSTEM_BASE,
    user: `${CTX}${edadNota}

Escribe "Tu Camino". 450-550 palabras. CONCRETO y ÚTIL: dónde encaja, dónde no, y qué momento vive. NO repitas la herida ni el carácter general.

Usa del informe: CAMINO / VOCACIÓN, MOMENTO ACTUAL, SÍNTESIS.

## Cómo trabajas
Tu forma real de rendir: cómo aprendes, cómo produces, en qué condiciones das lo mejor.

## Dónde encajas
4-6 campos o roles concretos, del informe, con el POR QUÉ ligado a cómo funcionas. ${edad < 20 ? "Incluye qué estudiar o explorar ahora." : ""}

## Dónde te desgastas
2-3 entornos que te agotan, y por qué.

## Tu momento ahora
Tu etapa de vida desde un ángulo que no esperas. Qué te permite construir esta etapa que ninguna otra te daría. Qué estás postergando.

Cierra con un primer paso concreto, sin título.`
  };

  // ── 5. TU PRÁCTICA DIARIA ──
  p.practica_diaria = {
    system: SYSTEM_BASE + `\n\nCIERRA EL PERFIL. Tono cálido y sereno: aquí acompañas, no confrontas. Conny Méndez y Mario Alonso Puig: esperanza aterrizada.`,
    user: `${CTX}${edadNota}

Escribe "Tu Práctica Diaria". 300-350 palabras. NO diagnostiques de nuevo: esto es la rutina de mañana.

Apertura de 2 líneas sin título: aquí termina de leer y empieza a vivir.

## Tu gratitud de hoy
Una frase de gratitud a su medida, ligada a su fuerza real del informe. No genérica.

## Lo que en ti es más grande que tu miedo
Una fuerza propia a la que recurrir, sin marco religioso, y cómo conectarse con ella hoy.

## Tu pregunta de hoy
Una sola pregunta afinada a su foco de crecimiento, para observarse durante el día.

Cierre cálido de una línea. PROHIBIDO mencionar algoritmos, sistemas o máquinas.`
  };

  return p;
}

// ════════════════════════════════════════════════════════════
// ORQUESTACIÓN — Claude en dos pasos
// ════════════════════════════════════════════════════════════
const CLAUDE_MODEL = "claude-sonnet-4-6";

async function llamarClaude(systemPrompt, userPrompt, claudeKey, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens || 2500,
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

const CLAVES_MODULOS = ["quien_eres","herida","equilibrio","camino","practica_diaria"];

async function generarModulos(prompts, claudeKey) {
  const perfil = {};

  // Un intento con un reintento automático si falla o vuelve vacío.
  async function generarUno(k) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const txt = await llamarClaude(prompts[k].system, prompts[k].user, claudeKey, 2500);
        if (txt && txt.trim()) return limpiarTexto(txt);
      } catch (e) {
        if (intento === 2) console.error(`Módulo ${k} falló:`, e.message);
      }
      // pausa breve antes del reintento
      await new Promise(r => setTimeout(r, 800));
    }
    return null;
  }

  // Tandas de 3 para no saturar el límite de tasa (antes eran 9 a la vez).
  const TAM_TANDA = 3;
  for (let i = 0; i < CLAVES_MODULOS.length; i += TAM_TANDA) {
    const tanda = CLAVES_MODULOS.slice(i, i + TAM_TANDA);
    const res = await Promise.all(tanda.map(k => generarUno(k)));
    tanda.forEach((k, j) => { perfil[k] = res[j]; });
  }
  return perfil;
}

// ════════════════════════════════════════════════════════════
// HANDLER DE VERCEL
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
  let horaCalculo, hayHora = true;
  if (horaConocida && hora) { horaCalculo = hora; }
  else if (franja && FRANJAS[franja]) { horaCalculo = FRANJAS[franja]; hayHora = false; }
  else { horaCalculo = "12:00"; hayHora = false; }

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

    // ── PASO 1: análisis experto (interno) ──
    const promptAnalisis = construirPromptAnalisis(nombre, edad, carta, esencia, frecuencia, tikkun, hayHora);
    const informe = await llamarClaude(SYSTEM_ANALISIS, promptAnalisis, CLAUDE_KEY, 6000);

    // ── PASO 2: redacción de los 9 módulos ──
    const prompts = construirPrompts(nombre, edad, informe, vera, carta, hayHora);
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

    const avisoFranja = !hayHora
      ? "Este perfil se generó sin tu hora exacta de nacimiento. Todo lo que describe tu carácter, tus patrones y tu camino es igual de válido. Lo que no podemos precisar sin la hora es en qué áreas concretas de tu vida se manifiesta cada cosa. Si consigues tu hora exacta, podemos afinarlo."
      : null;

    return res.status(200).json({ nombre, modulos, avisoFranja });

  } catch (err) {
    return res.status(500).json({ error: "Error generando perfil: " + err.message });
  }
};
