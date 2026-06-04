// ============================================================
// VER·A — generate.js (motor del Perfil VER·A, 7 módulos)
// Reescritura completa. Backend llama al API real + numerología.
// Modelo de redacción: claude-sonnet-4-6 · 1 llamada por módulo.
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
function calcularCamino(dia, mes, anio) { // Forma B
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
const SIGNIFICADOS = {
 
1:"Líder. Independencia, iniciativa, voluntad. Reto: el ego, la soledad, la impaciencia.",
2:"Acompañante. Sensibilidad, cooperación, paz, intuición. Reto: dependencia, miedo al conflicto.",
3:"Creativo y comunicador. Expresión, alegría, carisma, palabra. Reto: dispersión, superficialidad.",
4:"Constructor. Orden, disciplina, base, lealtad. Reto: rigidez, exceso de control.",
5:"Libertad. Cambio, aventura, versatilidad, movimiento. Reto: inconstancia, no terminar lo que empieza.",
6:"Cuidador y sanador. Amor, responsabilidad, hogar, servicio. Reto: sacrificio excesivo, control por amor.",
7:"Buscador. Profundidad, análisis, sabiduría, mundo interior. Reto: aislamiento, desconfianza.",
8:"Poder y logro. Abundancia, autoridad, ambición, huella material. Reto: obsesión por el control o el dinero.",
9:"Humanitario. Compasión, entrega, visión amplia, cierre de ciclos. Reto: cargar todo, no soltar.",
11:"Inspirador e iluminador. Intuición elevada, sensibilidad casi visionaria, capacidad de inspirar a otros. Reto: tensión nerviosa, no confiar en su propio don.",
22:"Constructor maestro. Capacidad de volver realidad grandes visiones, de construir algo duradero a gran escala. Reto: la presión enorme, el miedo a su propia magnitud.",
33:"Maestro del amor y el servicio. Entrega y enseñanza a gran escala, capacidad de elevar a muchos. Reto: olvidarse de sí mismo por los demás."
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
return json.data || json; // birth-angels/tikkun anidan en .data; la carta no
 
}
function armarSubject(nombre, anio, mes, dia, horaH, horaM, ciudad, paisCodigo) {
return { subject: { name: nombre, birth_data: {
year: anio, month: mes, day: dia, hour: horaH, minute: horaM, second: 0,
city: ciudad, country_code: paisCodigo.toUpperCase()
}}};
}
// ════════════════════════════════════════════════════════════
// BLOQUE C1b — Guardar registro en Google Sheets (no crítico)
// ════════════════════════════════════════════════════════════
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzLTbID_o5XiQLOrdm8d2D5wodxoXJh03EuJHZICqf1qmNOPhyPXlBcWEcCoFHX8OZQaw/exec";
async function guardarEnHoja(datos) {
try {
await fetch(SHEETS_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(datos)
});
} catch (e) {
// Si falla el guardado, NO rompe la generación del perfil.
console.error("No se pudo guardar en la hoja:", e.message);
}
}
// ════════════════════════════════════════════════════════════
// BLOQUE C2 — Procesar la carta natal
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
sun:"tu fuerza central de identidad", moon:"tu fuerza emocional",
mercury:"tu mente y tu palabra", venus:"tu forma de amar y de valorar",
mars:"tu fuerza de acción y empuje", jupiter:"tu capacidad de expandirte y dar sentido",
saturn:"tu estructura y tu disciplina", uranus:"tu necesidad de cambio y libertad",
neptune:"tu imaginación y sensibilidad", pluto:"tu poder de transformación"
};
const PUNTOS_ELEMENTOS = ["sun","moon","mercury","venus","mars","jupiter",
"saturn","uranus","neptune","pluto","ascendant","medium_coeli"];
function procesarCartaNatal(carta) {
const sd = carta.subject_data;
if (!sd) throw new Error("Carta natal sin subject_data");
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
const listaFuerzas = [];
for (const [k, etiqueta] of Object.entries(FUERZAS)) {
const p = sd[k]; if (!p) continue;
listaFuerzas.push({
etiqueta, element: p.element,
grado: Math.round(p.position * 10) / 10,
area: AREAS_VIDA[p.house] || "",
reflexivo: p.retrograde === true
});
}
const ascendente = {
element: sd.ascendant ? sd.ascendant.element : null,
grado: sd.ascendant ? Math.round(sd.ascendant.position * 10) / 10 : null
};
const medioCielo = {
element: sd.medium_coeli ? sd.medium_coeli.element : null,
grado: sd.medium_coeli ? Math.round(sd.medium_coeli.position * 10) / 10 : null,
area: sd.medium_coeli ? (AREAS_VIDA[sd.medium_coeli.house] || "") : ""
};
const herida = {
element: sd.chiron ? sd.chiron.element : null,
grado: sd.chiron ? Math.round(sd.chiron.position * 10) / 10 : null,
area: sd.chiron ? (AREAS_VIDA[sd.chiron.house] || "") : ""
};
const mision = {
element: sd.true_node ? sd.true_node.element : null,
grado: sd.true_node ? Math.round(sd.true_node.position * 10) / 10 : null,
area: sd.true_node ? (AREAS_VIDA[sd.true_node.house] || "") : ""
};
return { conteo, debil, fuerte, listaFuerzas, ascendente, medioCielo, herida, mision };
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
const z = t.zodiac || {}; // método correcto = zodiac
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
if (edad <= 20) return { fase:"estás en una etapa de formación: probándote, explorando quién eres y de qué estás hecho",
matiz:"es el tiempo de experimentar sin miedo a equivocarte; cada prueba te muestra de qué material estás hecho" };
if (edad <= 29) return { fase:"estás fundando las primeras bases de tu vida adulta, construyendo el terreno sobre el que vas a edificar",
matiz:"lo que siembres ahora marca la estructura de las próximas décadas" };
if (edad <= 43) return { fase:"estás consolidando tu vida adulta y asumiendo una responsabilidad real sobre tu camino",
matiz:"es la etapa de hacerte cargo de verdad, de sostener lo que construiste y darle forma firme" };
if (edad <= 51) return { fase:"estás en el punto medio: la etapa de construir tu legado, la obra de madurez. Ya fundaste, ya replanteaste, y ahora es tiempo de edificar lo que va a quedar",
matiz:"lo que construyas en estos años es lo que va a perdurar; es tu obra de madurez, no un ensayo" };
if (edad <= 58) return { fase:"estás afinando y cosechando lo sembrado, y empezando a preparar lo que vas a transmitir",
matiz:"es el momento de pulir tu obra y pensar en qué dejas y a quién se lo dejas" };
return { fase:"estás en una nueva vuelta: la etapa de la sabiduría y la reinvención madura",
matiz:"tienes la libertad de reinventarte desde todo lo que ya aprendiste, sin nada que demostrar" };
}
// ════════════════════════════════════════════════════════════
// BLOQUE D — Traducir a lenguaje VER·A + cruce psicológico
// ════════════════════════════════════════════════════════════
const ELEMENTOS_PROSA = {
Fire: { fuerte:"el impulso y la chispa: esa fuerza para arrancar, el empuje y la presencia que encienden lo que tocas",
debil:"el impulso y las ganas de arrancar: esa chispa que enciende la acción y te saca de la inercia" },
Earth: { fuerte:"la base y la raíz: la constancia, el aterrizaje, la capacidad de sostener en lo concreto lo que empiezas",
debil:"la base y la raíz: ese aterrizaje que baja las ideas al cuerpo y a lo concreto, y sostiene con constancia lo que empiezas" },
Air: { fuerte:"la mente y la palabra: la claridad para pensar, la facilidad con las ideas y con la gente",
debil:"la claridad mental y la palabra: esa capacidad de ordenar las ideas y comunicarlas con soltura" },
Water: { fuerte:"la hondura y la sensibilidad: la profundidad emocional, la intuición, la conexión con tu mundo interno",
debil:"la hondura y la conexión emocional: esa capacidad de sentir profundo y escuchar tu mundo interno" }
};
 
const EFECTO_DEBIL = {
Fire:"te cuesta arrancar, postergas, esperas a tener ganas en vez de generar el movimiento",
Earth:"te dispersas, dejas cosas a medio terminar, te cuesta bajar las ideas a la realidad y sostener una rutina",
Air:"te cuesta poner en palabras lo que sientes o piensas, y a veces te enredas sin claridad",
Water:"te desconectas de lo que sientes, racionalizas de más y te cuesta dar espacio a la emoción"
};
const QUALITIES_ES = {
liberation:"liberación", inspiration:"inspiración", speech:"la fuerza de la palabra y la elocuencia",
motivation:"motor interno y motivación", will:"fuerza de voluntad", health:"capacidad de sostener tu salud con intención",
blessings:"gratitud y abundancia", agriculture:"cultivo paciente de lo que siembras", gratitude:"gratitud",
vivification:"capacidad de dar vida y energía", writing:"expresión a través de la escritura",
unity:"unión y cierre de divisiones", "breaking barriers":"romper barreras", science:"claridad y discernimiento",
rituals:"el valor de los hábitos y lo sagrado cotidiano", ceremonies:"sentido de lo significativo", treasures:"valorar lo que tienes"
};
function traducirQualities(qualities) {
if (!Array.isArray(qualities) || !qualities.length) return "";
const t = qualities.map(q => QUALITIES_ES[q] || q);
if (t.length === 1) return t[0];
return t.slice(0, -1).join(", ") + " y " + t[t.length - 1];
}
const PALABRAS_PROHIBIDAS = [
/planeta/gi, /signo/gi, /casa astrol/gi, /carta natal/gi, /astrolog/gi, /horóscopo/gi,
/zodíac/gi, /zodiac/gi, /ascendente/gi, /quir[oó]n/gi, /\bnodo\b/gi, /kabbalah/gi, /tikkun/gi,
/tr[aá]nsito/gi, /retr[oó]grado/gi, /\bleo\b/gi, /\btauro\b/gi, /aries/gi,
/g[eé]minis/gi, /\bvirgo\b/gi, /\blibra\b/gi, /escorpio/gi, /sagitario/gi,
/capricornio/gi, /acuario/gi, /piscis/gi, /[aá]ngel/gi, /reiyel/gi, /sealiah/gi,
/hebreo/gi, /\bsalmo\b/gi, /\btarot\b/gi, /numerolog/gi, /chakra/gi
];
function limpiarTexto(texto) {
if (!texto) return "";
let limpio = texto;
for (const re of PALABRAS_PROHIBIDAS) limpio = limpio.replace(re, "");
return limpio.replace(/\s{2,}/g, " ").trim();
}
function construirAutorreporte(p1, p2, p3, p4, conteo) {
const notas = [];
if (p1 === "tierra") notas.push("Se reconoce con los pies en la tierra: práctico, atento a los hechos y a lo concreto.");
else if (p1 === "intuicion") notas.push("Se reconoce más en las ideas y las posibilidades que en los hechos concretos: mira hacia adelante, hacia lo que podría ser.");
if (p2 === "corazon") {
if (conteo.Air >= 4 && conteo.Water <= conteo.Air)
notas.push("IMPORTANTE: aunque por fuera opera mucho desde la mente y la palabra, él mismo reconoce que su verdadero motor son las emociones y los valores. Esto manda sobre lo demás: descríbelo como alguien que parece muy mental por fuera, pero que en el fondo decide y se mueve desde el corazón. Sociable y articulado de cara al mundo, pero con un mundo emocional profundo que no siempre muestra.");
else
notas.push("Decide desde el corazón: las emociones y los valores pesan más que la lógica fría a la hora de moverse.");
} else if (p2 === "razon") {
if (conteo.Water >= 3 && conteo.Water >= conteo.Air)
notas.push("IMPORTANTE: aunque tiene un mundo emocional profundo, él mismo dice que decide desde la razón. Esto manda: describe a alguien que siente hondo pero se apoya en la lógica para decidir, quizá conteniendo la emoción más de lo que necesita.");
 
else
notas.push("Decide desde la razón: se apoya en la lógica y el análisis antes que en la emoción.");
}
if (p3 === "gente") notas.push("Recarga con la gente: se nutre del contacto, del intercambio, de estar entre otros.");
else if (p3 === "espacio") notas.push("Recarga en su propio espacio: necesita soledad y silencio para volver a su centro.");
if (p4 === "reacciono") notas.push("Bajo presión reacciona al momento: responde rápido, a veces antes de pensar. Su trabajo es ganar el segundo de pausa entre el estímulo y la respuesta.");
else if (p4 === "guardo") notas.push("IMPORTANTE: bajo presión se lo guarda. Es sociable por fuera pero se cierra cuando algo duele. Eso puede volverse una olla a presión: lo que no se expresa, se acumula. Un punto delicado y revelador a trabajar con cariño.");
else if (p4 === "suelto") notas.push("Bajo presión respira y suelta: ya ha aprendido a no dejarse arrastrar por la reacción inmediata. Una fortaleza emocional real.");
return notas.join(" ");
}
function traducirAVerA(carta, frecuencia, tikkun, fase, esencia, autorreporte) {
return {
fortaleza_descrita: ELEMENTOS_PROSA[carta.fuerte].fuerte,
debilidad_descrita: ELEMENTOS_PROSA[carta.debil].debil,
efecto_practico_debilidad: EFECTO_DEBIL[carta.debil],
fortaleza_frecuencia: limpiarTexto(traducirQualities(frecuencia.fortaleza_qualities)),
recurso_frecuencia: limpiarTexto(traducirQualities(frecuencia.recurso_qualities)),
herida_traducida: limpiarTexto(`tu valor propio ligado a ${carta.herida.area}`),
mision_traducida: limpiarTexto(`construir algo sólido y duradero en ${carta.mision.area}`),
leccion_a_corregir: limpiarTexto(tikkun.interpretacion),
fase_vida: fase.fase,
matiz_personal: fase.matiz,
esencia: esencia,
autorreporte: autorreporte
};
}
// ════════════════════════════════════════════════════════════
// BLOQUE E2 — Construir los 7 prompts con los datos reales
// ════════════════════════════════════════════════════════════
const SYSTEM_BASE = `Eres la voz de VER·A, una plataforma de educación emocional personalizada en español. No eres astrología ni un test de personalidad: eres un espejo que ayuda a la persona a conocerse de verdad, a entender sus debilidades para transformarlas y a reconocer lo valioso que ya vive dentro de ella.
Tu propósito en cada palabra es que la persona termine de leer SINTIÉNDOSE vista, y sobre todo MOTIVADA A ACTUAR. No buscas que reflexione y nada más: buscas que se mueva.
La emoción que conoces de quien te lee: la frustración de saber que tiene más adentro de lo que está viviendo, y no poder sacarlo. Le hablas a eso.
Tu marco intelectual (nunca lo nombras, pero lo encarnas): Joe Dispenza (puede cambiar su estado y su futuro, no está condenada a su pasado), Carl Jung (lo que no se hace consciente gobierna la vida; la sombra integrada se vuelve poder), Neville Goddard (la imaginación y la dirección interna moldean la experiencia), Conny Méndez (metafísica práctica, aterrizada, sin humo), PNL (el cambio es concreto: reencuadres, anclas, foco; das herramientas, no solo ideas), Friedman (responsabilidad emocional; la persona es protagonista, no víctima).
REGLAS ABSOLUTAS DE LENGUAJE (jamás se rompen):
NUNCA uses, ni una sola vez, ninguna de estas palabras ni equivalentes: planeta, signo, casa, carta natal, astrología, horóscopo, zodíaco, ascendente, Quirón, nodo, Kabbalah, tránsito, retrógrado, grado, Tauro/Leo/etc., elemento astrológico, chakra, energía cósmica, ángel, nombre hebreo, salmo, tarot, número, numerología.
REGLA CRÍTICA SOBRE LAS CUATRO ENERGÍAS: jamás uses Fuego/Tierra/Aire/Agua como un sistema de categorías. Prohibido escribir "tu patrón de Fuego" o "tu energía dominante es Aire". Describe a la persona con palabras humanas y emocionales normales (impulso, chispa, base, raíz, mente, claridad, hondura, emoción, intuición). Puedes usar "fuego" o "raíz" sueltos como metáfora, pero nunca enumerarlos como clasificación. La persona NUNCA debe poder adivinar que detrás hay un cálculo. Debe sentir que alguien la conoce profundamente.
TONO: cercano, directo, cálido pero sin adular. Tuteas. Frases dichas por alguien que te mira a los ojos. Nada de palabrería de autoayuda vacía. Cada afirmación se sostiene en algo concreto y apunta a una acción o toma de conciencia. Prohibido el relleno y los lugares comunes.`;
 
function bloqueAutorreporte(autorreporte) {
if (!autorreporte) return "";
return `\n\nLO QUE LA PERSONA REPORTA DE SÍ MISMA (esto tiene PRIORIDAD: si contradice cualquier otro dato, gana lo que la persona dice de sí misma): ${autorreporte}`;
}
function construirPrompts(nombre, carta, vera) {
const auto = bloqueAutorreporte(vera.autorreporte);
const listaFuerzas = carta.listaFuerzas.map(f => {
const modo = f.reflexivo ? ", en modo reflexivo (mira hacia adentro)" : "";
return `- ${f.etiqueta}: grado ${f.grado}, se activa en ${f.area}${modo}`;
}).join("\n");
// Tabla de frecuencias por elemento débil (la maneja el código).
// MARIO: pega aquí las URLs reales de tu canal cuando tengas los videos.
const FRECUENCIAS = {
Earth: { hz:"7.83 Hz", para_cuando:"cuando perdiste el centro y te falta raíz y aterrizaje", link:"https://youtu.be/SO3vBRaGcYw?si=4CK45ETDhYTI2H5R" },
Fire: { hz:"285 Hz", para_cuando:"cuando te falta vitalidad, empuje y ganas de arrancar", link:null },
Air: { hz:"741 Hz", para_cuando:"cuando no puedes expresarte y te falta claridad mental", link:"https://youtu.be/8TioM0izmi0?si=zCltlVjfN69Daqah" },
Water: { hz:"639 Hz", para_cuando:"cuando un vínculo o una emoción necesitan sanar", link:null }
};
const frec = FRECUENCIAS[carta.debil];
const linkTexto = frec.link ? `Puedes escucharla aquí: ${frec.link}` : `Estará muy pronto en el canal de VER·A.`;
const prompts = {};
prompts.retrato = {
system: SYSTEM_BASE,
user: `Genera el retrato VER·A de ${nombre} usando EXCLUSIVAMENTE los datos reales de abajo. No inventes posiciones ni rasgos: todo lo que afirmes debe poder rastrearse a un dato de esta lista. Usa los grados y las áreas exactas para afinar la lectura: una misma fuerza dice cosas distintas según el grado y el área donde cae. Esa precisión es lo que hace valioso a VER·A.
DATOS REALES DE ${nombre}:
Sus fuerzas internas (cada una con el grado exacto, el área de vida donde se activa, y si va en modo reflexivo):
${listaFuerzas}
Cómo se proyecta al mundo: grado ${carta.ascendente.grado}
Su lugar público / misión visible: grado ${carta.medioCielo.grado}, en ${carta.medioCielo.area}
Su balance interno (ya traducido a lenguaje humano; NO lo nombres como categorías):
Lo que más le sobra: ${vera.fortaleza_descrita}
Lo que le falta cultivar: ${vera.debilidad_descrita}
Su herida original y su don: ${vera.herida_traducida}
Aquello para lo que vino: ${vera.mision_traducida}${auto}
ESCRIBE EL RETRATO EN ESTAS SECCIONES, en este orden exacto, con estos títulos:
1. Quién eres de verdad — retrato de su identidad profunda desde su fuerza central de identidad (grado y área) y cómo se proyecta. Que se reconozca en las primeras líneas. Nómbrale algo cierto y específico que pocos le han dicho.
 
2. Lo valioso que ya vive en ti — sus virtudes reales, de sus fuerzas mejor ubicadas. No las elogies en abstracto: dile para qué le sirven, dónde ya las usa sin notarlo, cómo apoyarse más en ellas.
3. Lo que te está frenando — su debilidad real, anclada en lo que le falta cultivar. Con cariño pero sin rodeos. Y entrega de inmediato 2-3 prácticas CONCRETAS (acciones pequeñas, hábitos, reencuadres, anclas) para fortalecer justo eso. Dile cómo, paso a paso.
4. Tu herida y tu mayor poder — dónde le ha dolido históricamente y cómo esa misma herida, trabajada, se vuelve su don más fuerte. Cierra con una práctica concreta de transformación.
5. Para qué viniste a triunfar — su misión, visión y los caminos donde puede destacar (incluidos campos de trabajo o vocación), derivados de sus datos. Sé concreto. Que sienta que tiene un para qué.
6. Tu primer paso — UNA sola acción clara que pueda hacer hoy o esta semana. Corta, potente, imposible de ignorar.
Cada sección personal e irrepetible. Toda afirmación apoyada en un dato real. Ni una palabra de la lista prohibida. El texto debe dejar a la persona MOTIVADA A ACTUAR.`
};
prompts.esencia = {
system: SYSTEM_BASE + `
REGLA EXTRA DE ESTE MÓDULO — NO SE PUEDE NOTAR EL ORIGEN: este módulo se calcula por dentro con un sistema que la persona NUNCA debe percibir. PROHIBIDO mencionar o insinuar números, cifras, sumas, "tu nombre revela/dice/suma", "tu fecha indica", "las letras de tu nombre". Preséntalo como un retrato de su esencia más profunda, sin fuente visible. El título es "Tu Esencia", nunca "lo que tu nombre revela".`,
user: `Escribe el módulo PROFUNDO "Tu Esencia" para ${nombre}, a partir de estos cuatro rasgos de su patrón profundo (calculados por dentro; NO menciones de dónde salen ni uses números). Téjelos en un retrato con alma, no en una lista.
Su raíz / misión de vida: ${vera.esencia.significado_camino}
Hacia dónde lo empuja la vida (su dirección natural): ${vera.esencia.significado_destino}
Su motor secreto (lo que anhela por dentro): ${vera.esencia.significado_alma}
Cómo lo ve el mundo (su impresión externa): ${vera.esencia.significado_personalidad}${auto}
ESTRUCTURA (tejido, no lista):
Quién eres en tu raíz — abre con asombro suave; presenta su misión de vida como el corazón de su ser. Que sienta "esto me describe de raíz".
Hacia dónde te empuja la vida — su dirección natural, sus metas, cómo logra lo que quiere. Conéctalo con su raíz (¿se refuerzan? ¿se tensionan?).
Lo que de verdad anhelas (aunque no lo digas) — su motor íntimo, lo más privado, nombrado con delicadeza.
Cómo te ve el mundo — la impresión que da. Señala si coincide o contrasta con lo que es por dentro (ese contraste es oro).
Tu hilo de oro — une los cuatro rasgos en una frase reveladora sobre quién es y para qué está aquí, y dale UNA acción concreta para honrar ese patrón desde hoy.
PROFUNDO y personal, que valga oro. NUNCA un número, NUNCA "nombre/fecha", NUNCA términos astrológicos. Si un rasgo es poco común, puede resaltarse como "algo poco común en ti" sin explicar por qué. Cierre hacia la acción, nunca predicción.`
};
prompts.frecuencia = {
system: SYSTEM_BASE + `
REGLA EXTRA: la persona NUNCA debe ver las palabras ángel, nombre hebreo, salmo, tarot ni número. Todo se llama "tu frecuencia de origen": la nota única con la que vino. El propósito es ACORTAR su curva de aprendizaje (decirle de una vez su fuerza y su aprendizaje de vida) y darle una brújula honesta para los días buenos (exprimirlos, vivir presente) y los difíciles (qué hacer concretamente, sin "ya pasará"). Honestidad: la vida no es fácil, y eso se dice.`,
user: `Escribe el módulo "Tu Frecuencia de Origen" para ${nombre} usando EXCLUSIVAMENTE estos datos reales. No inventes nada fuera de esto.
Su fortaleza, razón y aprendizaje de vida (su frecuencia principal): ${vera.fortaleza_frecuencia}
Su recurso interno para los momentos difíciles (su frecuencia de apoyo): ${vera.recurso_frecuencia}${auto}
ESTRUCTURA, con estos títulos:
Tu nota única — abre nombrando con calidez y certeza la frecuencia con la que vino, su fortaleza y su razón. Conéctalo con para qué vino. Hazlo sentir como un atajo: "esto que a muchos les toma media vida entender, aquí lo tienes claro desde ya".
Cuando la vida fluye — cómo se ve en sus mejores momentos, y 1 práctica concreta para exprimir los días buenos y vivir presente.
Cuando la vida pesa — con honestidad: habrá días en que se sienta lejos de su fuerza. Nombra cómo se siente. Entrega 2 prácticas claras, apoyadas en su recurso interno, para atravesar esos momentos activamente (cuerpo, mente, foco). El fondo: no controlas que vengan los días malos, pero sí qué haces dentro de ellos.
Tu recordatorio — una sola frase potente, en segunda persona, que pueda repetirse cualquier día para volver a su frecuencia.
Ni una palabra prohibida. Todo apoyado en los datos reales. Cierre que dé una brújula, no una etiqueta.`
};
 
prompts.equilibrio = {
system: SYSTEM_BASE + `
ESTE ES EL MÓDULO MÁS PRÁCTICO de VER·A: "manos a la obra". Aquí no se filosofa largo: se diagnostica rápido y se entregan herramientas concretas que la persona puede hacer HOY. Frases cortas, directas, accionables. La persona termina sabiendo exactamente qué hacer, no solo qué le pasa.`,
user: `Escribe el módulo "Tu Equilibrio Energético" para ${nombre}. Directo y práctico.
La energía que más le falta cultivar: ${vera.debilidad_descrita}
Lo que eso le provoca en lo cotidiano: ${vera.efecto_practico_debilidad}
Lo que en cambio le sobra (su zona fuerte): ${vera.fortaleza_descrita}
Su sonido de apoyo: una frecuencia de ${frec.hz}, ideal para ${frec.para_cuando}
Dónde escucharlo: ${linkTexto}${auto}
ESTRUCTURA (corta y accionable):
Tu desequilibrio, en una frase — una o dos líneas, sin rodeos: qué le sobra y qué le falta, y por qué eso lo desbalancea en el día a día. Que se reconozca al instante.
Lo que esto te está costando — 2-3 líneas concretas sobre cómo se nota ese desequilibrio en su vida real. Sin dramatizar, solo nombrar lo que ya vive.
Tus 3 prácticas para equilibrarte — exactamente 3 prácticas concretas, numeradas, para fortalecer la energía que falta. Cada una: una acción clara que pueda empezar hoy (un hábito pequeño, un reencuadre o ancla, algo físico). Verbos de acción. Que sepa exactamente qué hacer.
Tu sonido — preséntale su frecuencia de apoyo (${frec.hz}) como una herramienta: para qué sirve y cuándo usarla. Invítale a escucharla. ${linkTexto}
Tono manos a la obra: breve, claro, accionable. Las 3 prácticas son el corazón: concretas y hacibles hoy. Ni una palabra prohibida. Cierre que invite a ACTUAR ya.`
};
prompts.herida = {
system: SYSTEM_BASE + `
ESTE MÓDULO TIENE UN TONO PROPIO: DIRECTO y PERSUASIVO. No suavizas la verdad. Habrá personas que NO se reconozcan o se resistan ("eso no soy yo"). A esa persona no la mueves con cariño tibio, la mueves con verdad que la hace pensar y persuasión honesta. El objetivo no es que se sienta acariciada: es que se quede analizando y termine decidiendo ACTUAR.
Técnica para el que se resiste (úsala): no pelees con su negación. Dale la salida digna: "quizás no te reconozcas del todo, y está bien. Pero hazte una pregunta honesta: ¿y si una parte sí es cierta? ¿Qué pierdes por probarlo? Si te ayuda, ganas; si no, no perdiste nada." Eso desarma la resistencia sin confrontar.
Encarnas (sin nombrar): Friedman (la persona deja de ser víctima de su herida; no eligió lo que pasó, pero sí qué hace ahora; la responsabilidad libera) y Dispenza (no estás condenado a tu pasado ni a tus patrones; lo que se hace consciente se transforma).`,
user: `Escribe el módulo "Tu Herida Original y tu Don" para ${nombre}. Directo, persuasivo, honesto. Sin rodeos pero sin crueldad: la verdad que ayuda, no la que hiere por herir.
Su herida: ${vera.herida_traducida}
La lección que vino a corregir: ${vera.leccion_a_corregir}
El don en que se transforma esa herida: ayudar a otros desde lo mismo que él tuvo que sanar${auto}
ESTRUCTURA:
La herida que casi nadie te ha nombrado — nómbrala de frente, con precisión. Que sienta "esto me describe". Con la certeza de quien conoce, no de quien adivina. Describe cómo se manifiesta en su vida real (decisiones, miedos, patrones).
Si ahora mismo estás pensando "esto no soy yo" — aquí va la persuasión para el escéptico. Reconoce su posible resistencia con respeto y gírala con la técnica del "no tienes nada que perder". Que la duda se vuelva curiosidad.
Lo que viniste a corregir — presenta la lección como el reto de vida que da sentido a la herida, no como un defecto que esconder. Encarna a Friedman: el día que dejas de cargarlo como condena y lo tomas como tarea, te liberas.
Tu herida es tu don (el giro) — cómo esa misma herida, trabajada, se convierte en su mayor fortaleza. Encarna a Dispenza: lo que haces consciente, lo transformas. La herida deja de mandar y empieza a servir.
Tu primera prueba — UNA práctica concreta de transformación para esta semana, pequeña pero que rompa el patrón viejo. Remata con la persuasión final: no tienes nada que perder. Si te ayuda, ganas. Hazlo.
DIRECTO, frases con peso. Persuasivo de verdad: el escéptico debe terminar con ganas de probar. La herida se nombra sin crueldad pero sin esquivar. Ni una palabra prohibida. Cierre que empuje a ACTUAR.`
};
prompts.momento_actual = {
 
system: SYSTEM_BASE + `
ESTE MÓDULO ES CORTO y debe SORPRENDER. Habla del momento de vida que atraviesa la persona con REALISMO + OPTIMISMO ACTIVO. Muchas personas viven momentos duros: no los endulces ni los niegues (sería falso y lo notaría). Pero muestra, sin excepción, que cada etapa —incluso la difícil— trae un aprendizaje concreto que se puede aprovechar AHORA. La sorpresa es clave: que vea su momento desde un ángulo que no esperaba. No "todo estará bien" (tibio), sino "esto que vives, por duro que sea, es exactamente la etapa donde puedes X". Encarna a Dispenza: cada momento, incluso el de crisis, es oportunidad de cambio.`,
user: `Escribe el módulo CORTO "Tu Momento Actual" para ${nombre}. Pocos párrafos. Que sorprenda.
La etapa de vida que atraviesa: ${vera.fase_vida}
Matiz personal de su etapa: ${vera.matiz_personal}${auto}
ESTRUCTURA (breve, sin títulos internos, que fluya como un mensaje):
1. Abre nombrando su etapa de vida de una forma que SORPRENDA, un ángulo que no esperaba. Realista: si es exigente, dilo con honestidad.
2. Gira hacia el aprendizaje/crecimiento que esta etapa específica le ofrece. Qué puede construir o aprovechar justo ahora que no podría en otro momento. El lado bueno real, no consuelo vacío.
3. Cierra con una idea potente: cómo aprovechar este momento a partir de hoy. Que vea su presente como oportunidad, no como espera.
CORTO, cada frase con peso. Realista + optimista a la vez. Que SORPRENDA. Ni una palabra prohibida. Cierre que empuje a aprovechar el ahora.`
};
prompts.practica_diaria = {
system: SYSTEM_BASE + `
ESTE MÓDULO ES EL CORAZÓN FILOSÓFICO de VER·A y su cierre. Aquí se dice la verdad más profunda, con claridad y sin arrogancia: una inteligencia artificial puede conocerte, calcularte y describirte mejor que casi nadie, pero NO puede sentir por ti. Las emociones son el único territorio enteramente tuyo, humano. Ahí está tu verdadero poder: no en saber más (la máquina sabe más), sino en SENTIR y aprender a manejar tus emociones. Las emociones se entrenan como un músculo; esta práctica diaria es ese entrenamiento. VER·A no te vuelve dependiente de la tecnología: te devuelve a tu propio poder humano.
Tono: cálido, sereno, cercano. Este módulo no persuade ni diagnostica: acompaña. Es el momento suave del perfil.`,
user: `Escribe el módulo de cierre "Tu Práctica Diaria" para ${nombre}, una rutina corta que pueda hacer cada mañana (o cuando lo necesite). Personalízala con quién es esta persona y con su foco de crecimiento.
Quién es, en breve: su fortaleza es ${vera.fortaleza_descrita}; trabaja en cultivar ${vera.debilidad_descrita}
Su foco de crecimiento: ${vera.debilidad_descrita}${auto}
ESTRUCTURA:
Por qué esto importa (apertura breve) — 2-3 líneas: una máquina puede conocerte, pero solo tú puedes sentirte; tu poder está en manejar tus emociones, y eso se entrena cada día. Cálido, no solemne. Que entienda que aquí termina de leer y empieza a vivir.
1. Tu gratitud de hoy — una práctica de gratitud PERSONALIZADA a quién es (ligada a su fortaleza o proceso). No "agradece tres cosas" genérico. Dale una frase concreta de gratitud hecha a su medida.
2. Lo que en ti es más grande que tu miedo — conexión con una fuerza interior propia (ligada a su fortaleza real), SIN marco religioso, a la que recurrir cuando aparezca el miedo. Dale una manera concreta de conectarse con eso en el día.
3. Tu pregunta de hoy — una sola pregunta de inteligencia emocional, afinada a su foco de crecimiento, para que se observe durante el día. Que mueva la conciencia, no un cliché.
Cierre — una frase final, corta y cálida: el conocerse ya está hecho, ahora toca sentir y vivir. Que cierre con calma y poder.
Las 3 partes repetibles cada día pero personalizadas a ella. Ni una palabra prohibida. Tono cálido y sereno. La idea "la IA conoce, solo tú sientes" clara pero sin sonar a eslogan. Cierre que devuelva a la persona a su poder humano.`
};
return prompts;
}
// ════════════════════════════════════════════════════════════
// BLOQUE E1 — Llamar a Claude (1 por módulo) y orquestar
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
max_tokens: 4000,
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
async function generarSieteModulos(prompts, claudeKey) {
const claves = ["retrato","esencia","frecuencia","equilibrio","herida","momento_actual","practica_diaria"];
const resultados = await Promise.allSettled(
claves.map(k => llamarClaude(prompts[k].system, prompts[k].user, claudeKey))
);
const perfil = {};
resultados.forEach((r, i) => {
perfil[claves[i]] = (r.status === "fulfilled" && r.value) ? r.value : null;
});
return perfil;
}
// ════════════════════════════════════════════════════════════
// BLOQUE A — Handler de Vercel: entrada, validación, orquestación
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
// B — numerología (cero API)
const esencia = calcularEsencia(nombreCompleto, dia, mes, anio);
// C1 — armar subject + 3 llamadas al API en paralelo
const subject = armarSubject(nombre, anio, mes, dia, horaH, horaM, ciudad, paisCodigo);
const [cartaRaw, angelesRaw, tikkunRaw] = await Promise.all([
llamarAstrologyAPI("/api/v3/charts/natal", subject, ASTRO_KEY),
llamarAstrologyAPI("/api/v3/kabbalah/birth-angels", subject, ASTRO_KEY),
llamarAstrologyAPI("/api/v3/kabbalah/tikkun", subject, ASTRO_KEY)
 
]);
// C2/C3/C4 — procesar
const carta = procesarCartaNatal(cartaRaw);
const frecuencia = procesarFrecuencia(angelesRaw);
const tikkun = procesarTikkun(tikkunRaw);
const edad = calcularEdad(anio, mes, dia);
const fase = calcularFaseVida(edad);
// D — cruce psicológico + traducción a lenguaje VER·A
const autorreporte = construirAutorreporte(p1, p2, p3, p4, carta.conteo);
const vera = traducirAVerA(carta, frecuencia, tikkun, fase, esencia, autorreporte);
// E2/E1 — armar los 7 prompts y generarlos en paralelo
const prompts = construirPrompts(nombre, carta, vera);
const modulos = await generarSieteModulos(prompts, CLAUDE_KEY);
// Guardar registro en la hoja (no bloquea ni rompe si falla)
guardarEnHoja({
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
const avisoFranja = usoFranja
? "Este perfil se calculó con una franja horaria aproximada. Con tu hora exacta de nacimiento podemos afinarlo aún más."
: null;
return res.status(200).json({ nombre, modulos, avisoFranja });
} catch (err) {
return res.status(500).json({ error: "Error generando perfil: " + err.message });
}
};
