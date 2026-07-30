// ============================================================
// VER·A — generate.js (motor del Perfil VER·A)
// VERSIÓN 4.0 — 30 julio 2026
//
// QUÉ CAMBIA vs 3.0:
// 1. RECOLECCIÓN COMPLETA: se captura TODO lo que la API entrega y
//    que la versión anterior botaba: modalidad (cardinal/fijo/mutable),
//    las 12 casas con su signo, la fase lunar, los aspectos jerarquizados
//    por orbe (los <1° marcados como DETERMINANTES), los aspectos de Quirón
//    y de los nodos separados, la interpretación completa de los ángeles,
//    y los 3 métodos del tikkun con detección de convergencia.
// 2. PROMPT DE MAESTRO: el análisis del Paso 1 ahora piensa como un
//    analista de élite (Jung, Séneca, Maquiavelo, Dispenza, Goddard,
//    Conny Méndez, Mario Alonso Puig) y cruza fuentes en vez de listar.
// 3. REDACCIÓN SIN "FRESITA": regla dura contra aperturas de coach.
//    La primera frase de cada módulo nombra el mecanismo, no una escena.
// 4. EMAIL PROFESIONAL: si un módulo no se genera, el correo NUNCA
//    muestra "no se pudo generar". Simplemente omite ese bloque y el
//    perfil sigue leyéndose completo y digno.
// 5. Arquitectura de 5 módulos (quien_eres, herida, equilibrio, camino,
//    practica_diaria), generados en tandas de 3 con reintento.
// ============================================================

// ════════════════════════════════════════════════════════════
// BLOQUE A — NUMEROLOGÍA (pitagórica, forma B)
// ════════════════════════════════════════════════════════════
const TABLA_LETRAS = {
  A:1,J:1,S:1, B:2,K:2,T:2, C:3,L:3,U:3, D:4,M:4,V:4,
  E:5,N:5,W:5, F:6,O:6,X:6, G:7,P:7,Y:7, H:8,Q:8,Z:8, I:9,R:9
};
const VOCALES = new Set(["A","E","I","O","U"]);

function normalizarNombre(t){
  return (t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toUpperCase().replace(/\u00d1/g,"N").replace(/[^A-Z]/g,"");
}
function reducir(n){
  while (n>9 && n!==11 && n!==22 && n!==33){
    n = String(n).split("").reduce((a,d)=>a+Number(d),0);
  }
  return n;
}
function calcularCamino(dia,mes,anio){ return reducir(reducir(dia)+reducir(mes)+reducir(anio)); }
function calcularDestino(nc){ const l=normalizarNombre(nc); return reducir(l.split("").reduce((a,x)=>a+(TABLA_LETRAS[x]||0),0)); }
function calcularAlma(nc){ const l=normalizarNombre(nc); return reducir(l.split("").filter(x=>VOCALES.has(x)).reduce((a,x)=>a+(TABLA_LETRAS[x]||0),0)); }
function calcularPersonalidad(nc){ const l=normalizarNombre(nc); return reducir(l.split("").filter(x=>!VOCALES.has(x)).reduce((a,x)=>a+(TABLA_LETRAS[x]||0),0)); }

// Significados como mecanismos de evasión (producen espejo, no halago).
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

function calcularEsencia(nc,dia,mes,anio){
  const camino=calcularCamino(dia,mes,anio), destino=calcularDestino(nc),
        alma=calcularAlma(nc), personalidad=calcularPersonalidad(nc);
  return {
    _numeros:{camino,destino,alma,personalidad},
    significado_camino:SIGNIFICADOS[camino]||"",
    significado_destino:SIGNIFICADOS[destino]||"",
    significado_alma:SIGNIFICADOS[alma]||"",
    significado_personalidad:SIGNIFICADOS[personalidad]||""
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE B — Helpers de API (astrología)
// ════════════════════════════════════════════════════════════
const ASTRO_BASE = "https://api.astrology-api.io";

async function llamarAstrologyAPI(endpoint, payload, apiKey){
  const res = await fetch(ASTRO_BASE + endpoint, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+apiKey },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`API ${endpoint} ${res.status}: ${raw.slice(0,300)}`);
  let json; try { json = JSON.parse(raw); } catch(e){ throw new Error(`No-JSON de ${endpoint}: ${raw.slice(0,300)}`); }
  return json.data || json;
}

function armarSubject(nombre,anio,mes,dia,horaH,horaM,ciudad,paisCodigo){
  return {
    subject:{ name:nombre, birth_data:{
      year:anio, month:mes, day:dia, hour:horaH, minute:horaM, second:0,
      city:ciudad, country_code:paisCodigo.toUpperCase()
    }},
    options:{
      house_system:"P", zodiac_type:"Tropic", detail_level:"full",
      active_points:[
        "Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn",
        "Uranus","Neptune","Pluto","Chiron","True_Node","True_South_Node",
        "Mean_Lilith","Ascendant","Medium_Coeli"
      ],
      precision:2
    }
  };
}
function armarKabbalah(anio,mes,dia,horaH,horaM,ciudad,paisCodigo){
  return {
    birth_data:{ year:anio, month:mes, day:dia, hour:horaH, minute:horaM, second:0,
      city:ciudad, country_code:paisCodigo.toUpperCase() },
    include_secondary:true, include_tertiary:false, language:"en"
  };
}

// ════════════════════════════════════════════════════════════
// BLOQUE C — RECOLECCIÓN COMPLETA (lo nuevo: exprime toda la API)
// ════════════════════════════════════════════════════════════
const SIGNOS_NOMBRE = {
  Ari:"Aries",Tau:"Tauro",Gem:"Géminis",Can:"Cáncer",Leo:"Leo",Vir:"Virgo",
  Lib:"Libra",Sco:"Escorpio",Sag:"Sagitario",Cap:"Capricornio",Aqu:"Acuario",Pis:"Piscis"
};
function nombreSigno(c){ return SIGNOS_NOMBRE[c]||c||""; }

const NOMBRE_PUNTO = {
  Sun:"Sol",Moon:"Luna",Mercury:"Mercurio",Venus:"Venus",Mars:"Marte",Jupiter:"Júpiter",
  Saturn:"Saturno",Uranus:"Urano",Neptune:"Neptuno",Pluto:"Plutón",Chiron:"Quirón",
  True_Node:"Nodo Norte",True_South_Node:"Nodo Sur",Mean_Lilith:"Lilith",
  Ascendant:"Ascendente",Medium_Coeli:"Medio Cielo"
};
function nombrePunto(k){ return NOMBRE_PUNTO[k]||k; }

const AREAS_VIDA = {
  First_House:"identidad, cómo arranca y se muestra",
  Second_House:"valor propio y sustento",
  Third_House:"comunicación y forma de pensar",
  Fourth_House:"raíz, hogar, origen emocional",
  Fifth_House:"creatividad, placer, lo que crea",
  Sixth_House:"trabajo, servicio, cuerpo, rutina",
  Seventh_House:"vínculos uno-a-uno: pareja, socios",
  Eighth_House:"lo compartido, la transformación profunda",
  Ninth_House:"visión, sentido, expansión",
  Tenth_House:"carrera, lugar público, misión visible",
  Eleventh_House:"colectivo, futuro, aquello a lo que aporta",
  Twelfth_House:"mundo interno, lo que se cuece por dentro"
};
const NUM_A_CASA = ["","First_House","Second_House","Third_House","Fourth_House","Fifth_House",
  "Sixth_House","Seventh_House","Eighth_House","Ninth_House","Tenth_House","Eleventh_House","Twelfth_House"];

const ASPECTOS_NOMBRE = {
  conjunction:"unido a (se potencian o se saturan)",
  opposition:"en tensión abierta con (tira y afloja)",
  square:"en choque con (fricción que exige trabajo)",
  trine:"en flujo natural con (talento que corre solo)",
  sextile:"en apoyo con (oportunidad si se activa)"
};

const CLAVE_SD = {
  Sun:"sun",Moon:"moon",Mercury:"mercury",Venus:"venus",Mars:"mars",Jupiter:"jupiter",
  Saturn:"saturn",Uranus:"uranus",Neptune:"neptune",Pluto:"pluto",Chiron:"chiron",
  True_Node:"true_node",True_South_Node:"true_south_node",Mean_Lilith:"mean_lilith",
  Ascendant:"ascendant",Medium_Coeli:"medium_coeli"
};
const PUNTOS_PRINCIPALES = Object.keys(CLAVE_SD);

function procesarCartaCompleta(cartaRaw, hayHora){
  const sd = cartaRaw.subject_data;
  const cd = cartaRaw.chart_data || {};
  if (!sd) throw new Error("Carta sin subject_data");

  const puntos = {};
  const conteoElem = { Fire:0, Earth:0, Air:0, Water:0 };
  const conteoModo = { Cardinal:0, Fixed:0, Mutable:0 };

  for (const k of PUNTOS_PRINCIPALES){
    const p = sd[CLAVE_SD[k]];
    if (!p) continue;
    puntos[k] = {
      nombre: nombrePunto(k),
      signo: nombreSigno(p.sign),
      grado: Math.round((p.position||0)*10)/10,
      casa: hayHora ? (AREAS_VIDA[p.house]||"") : "",
      modalidad: p.quality||"",
      elemento: p.element||"",
      retro: p.retrograde===true
    };
    if (["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Ascendant","Medium_Coeli"].includes(k)){
      if (conteoElem.hasOwnProperty(p.element)) conteoElem[p.element]++;
      if (conteoModo.hasOwnProperty(p.quality)) conteoModo[p.quality]++;
    }
  }

  const elemOrden = Object.entries(conteoElem).sort((a,b)=>b[1]-a[1]);
  const modoOrden = Object.entries(conteoModo).sort((a,b)=>b[1]-a[1]);
  const elemFuerte = elemOrden[0][0], elemDebil = elemOrden[elemOrden.length-1][0];
  const modoFuerte = modoOrden[0][0];

  const casas = Array.isArray(cd.house_cusps)
    ? cd.house_cusps.map(h=>({ casa:h.house, signo:nombreSigno(h.sign), area:AREAS_VIDA[NUM_A_CASA[h.house]]||"" }))
    : [];

  const ASPECTOS_OK = ["conjunction","opposition","square","trine","sextile"];
  const aspectos = Array.isArray(cd.aspects)
    ? cd.aspects.filter(a=>ASPECTOS_OK.includes(a.aspect_type)).map(a=>({
        p1:nombrePunto(a.point1), p2:nombrePunto(a.point2),
        tipo:ASPECTOS_NOMBRE[a.aspect_type]||a.aspect_type, tipoRaw:a.aspect_type,
        orbe:Math.round((a.orb||0)*100)/100,
        determinante:(a.orb||99)<1.0,
        tenso:(a.aspect_type==="square"||a.aspect_type==="opposition"),
        tocaHerida:(a.point1==="Chiron"||a.point2==="Chiron"),
        tocaNodo:/Node/.test(a.point1)||/Node/.test(a.point2)
      })).sort((x,y)=>x.orbe-y.orbe)
    : [];

  const lp = sd.lunar_phase || {};

  return {
    puntos, conteoElem, conteoModo, elemFuerte, elemDebil, modoFuerte, casas,
    aspectos,
    aspectosDeterminantes: aspectos.filter(a=>a.determinante),
    aspectosHerida: aspectos.filter(a=>a.tocaHerida),
    aspectosNodo: aspectos.filter(a=>a.tocaNodo),
    faseLunar: lp.moon_phase_name||"",
    herida: puntos.Chiron||null,
    nodoNorte: puntos.True_Node||null,
    nodoSur: puntos.True_South_Node||null,
    lilith: puntos.Mean_Lilith||null,
    ascendente: puntos.Ascendant||null,
    medioCielo: puntos.Medium_Coeli||null,
    debil: elemDebil, fuerte: elemFuerte  // compat con módulo de frecuencia
  };
}

function procesarAngelesCompleto(a){
  const P=a.primary_angel||{}, S=a.secondary_angel||{};
  return {
    fuerza:{ significado:P.meaning||"", dominio:P.domain||"", cualidades:P.qualities||[], interpretacion:P.interpretation||"" },
    recurso:{ significado:S.meaning||"", dominio:S.domain||"", cualidades:S.qualities||[], interpretacion:S.interpretation||"" },
    sintesis:a.synthesis||""
  };
}

function procesarTikkunCompleto(t){
  const z=t.zodiac||{}, n=t.lunar_node||{}, b=t.berg||{};
  const zodiac={ tema:z.tikkun_name||"", antidoto:z.keyword||"", interpretacion:z.interpretation||"" };
  const nodo={ tema:n.tikkun_name||"", antidoto:n.keyword||"", interpretacion:n.interpretation||"" };
  const convergen = !!(zodiac.antidoto && nodo.antidoto &&
    (zodiac.antidoto===nodo.antidoto ||
     /servicio|humild|acept|discern/i.test(zodiac.interpretacion+" "+nodo.interpretacion)));
  return { zodiac, nodo, bergNumero:b.tikkun_number||null, recomendado:t.primary_recommendation||"zodiac", convergen, sintesis:t.synthesis||"" };
}

// ════════════════════════════════════════════════════════════
// BLOQUE D — Fase de vida por edad
// ════════════════════════════════════════════════════════════
function calcularEdad(anio,mes,dia){
  const hoy=new Date(); let e=hoy.getFullYear()-anio;
  const m=hoy.getMonth()+1, d=hoy.getDate();
  if (m<mes||(m===mes&&d<dia)) e--; return e;
}
function calcularFaseVida(edad){
  if (edad<=20) return {fase:"formación: probándose, explorando quién es", matiz:"cada prueba le muestra de qué está hecho"};
  if (edad<=29) return {fase:"fundación: construyendo las primeras bases de su vida adulta", matiz:"lo que siembre ahora marca la estructura de las próximas décadas"};
  if (edad<=43) return {fase:"consolidación: asumiendo responsabilidad real sobre su camino", matiz:"toca sostener lo construido y darle forma firme"};
  if (edad<=51) return {fase:"punto medio: construyendo la obra de madurez, lo que va a quedar", matiz:"lo que construya en estos años perdura; no es un ensayo"};
  if (edad<=58) return {fase:"cosecha: afinando lo sembrado y preparando lo que va a transmitir", matiz:"toca pulir la obra y pensar qué deja y a quién"};
  return {fase:"nueva vuelta: sabiduría y reinvención madura", matiz:"puede reinventarse desde lo aprendido, sin nada que demostrar"};
}

// ════════════════════════════════════════════════════════════
// BLOQUE E — FILTRO DE SALIDA (red de seguridad)
// El prompt hace el trabajo principal; esto atrapa fugas.
// ════════════════════════════════════════════════════════════
const PALABRAS_PROHIBIDAS = [
  /\bplaneta\b/gi,/\bsigno\b/gi,/casa astrol/gi,/carta natal/gi,/astrolog/gi,/hor[oó]scopo/gi,
  /zod[ií]ac/gi,/\bascendente\b/gi,/quir[oó]n/gi,/\bnodo\b/gi,/kabbalah/gi,/tikkun/gi,/tik[uú]n/gi,
  /\btr[aá]nsito\b/gi,/retr[oó]grado/gi,
  // nombres de signos (todos, incluidos los que son palabras normales — el prompt los evita, esto es respaldo)
  /\baries\b/gi,/\btauro\b/gi,/\bg[eé]minis\b/gi,/\bc[aá]ncer\b/gi,/\bleo\b/gi,/\bvirgo\b/gi,
  /\blibra\b/gi,/\bescorpio\b/gi,/\bsagitario\b/gi,/\bcapricornio\b/gi,/\bacuario\b/gi,/\bpiscis\b/gi,
  /[aá]ngel/gi,/reiyel/gi,/sealiah/gi,/hebreo/gi,/\bsalmo\b/gi,/\btarot\b/gi,/numerolog/gi,/chakra/gi,
  /\bmedio cielo\b/gi,/\bmedium coeli\b/gi,/\bmercurio\b/gi,/\bvenus\b/gi,/\bmarte\b/gi,
  /\bj[uú]piter\b/gi,/\bsaturno\b/gi,/\burano\b/gi,/\bneptuno\b/gi,/\bplut[oó]n\b/gi,/\blilith\b/gi
];
const REEMPLAZOS = [
  [/\btu MC\b/gi,"tu imagen pública"],[/\bel MC\b/gi,"la imagen pública"],[/\bMC\b/g,"imagen pública"],
  [/\btu Luna\b/gi,"tu mundo emocional"],[/\buna Luna\b/gi,"un mundo emocional"],
  [/\bla Luna\b/gi,"el mundo emocional"],[/\bel Sol\b/gi,"tu identidad"],[/\btu Sol\b/gi,"tu identidad"]
];

function quitarFrasesTecnicas(texto){
  return texto.split(/\n/).map(linea=>{
    if (/^#{1,3}\s/.test(linea.trim()) || /\]\(https?:/.test(linea)) return linea;
    const oraciones = linea.split(/(?<=[.!?])\s+/);
    const filtradas = oraciones.filter(o=>!PALABRAS_PROHIBIDAS.some(re=>{ re.lastIndex=0; return re.test(o); }));
    return filtradas.join(" ");
  }).join("\n");
}
function limpiarTexto(texto){
  if (!texto) return "";
  let t = texto;
  for (const [re,rep] of REEMPLAZOS) t = t.replace(re,rep);
  t = quitarFrasesTecnicas(t);
  t = t.replace(/([^\n])\s*(#{2,3}\s)/g,"$1\n\n$2");
  t = t.split("\n").map(l=>l.replace(/[ \t]{2,}/g," ").trimEnd()).join("\n");
  t = t.replace(/\n{3,}/g,"\n\n");
  return t.trim();
}

function construirAutorreporte(p1,p2,p3,p4){
  const n=[];
  if (p1==="tierra") n.push("Se apoya en hechos concretos.");
  else if (p1==="intuicion") n.push("Se apoya en posibilidades más que en hechos.");
  if (p2==="corazon") n.push("Decide desde lo que siente y valora.");
  else if (p2==="razon") n.push("Decide desde la lógica antes que la emoción.");
  if (p3==="gente") n.push("Recarga con gente.");
  else if (p3==="espacio") n.push("Recarga en soledad.");
  if (p4==="reacciono") n.push("Bajo presión responde rápido, antes de procesar.");
  else if (p4==="guardo") n.push("Bajo presión se lo guarda: por fuera bien, por dentro se acumula.");
  else if (p4==="suelto") n.push("Bajo presión respira y suelta.");
  return n.join(" ");
}

// ════════════════════════════════════════════════════════════
// BLOQUE F — PASO 1: ANÁLISIS EXPERTO (interno, nunca lo ve el cliente)
// Aquí el modelo interpreta SIN filtro de vocabulario y piensa como maestro.
// ════════════════════════════════════════════════════════════
const SYSTEM_ANALISIS = `Eres un analista de élite del carácter humano: dominas la lectura de la carta natal, la numerología, la tradición de los 72 nombres y la corrección del alma. Pero por encima de todo, eres un lector agudo de personas, con la profundidad de un buen psicoanalista y la honestidad de un filósofo. Produces un INFORME INTERNO que un redactor usará después. El cliente NO lo lee: escribe con todo tu vocabulario técnico, sin filtros.

CÓMO PIENSAS (esto te separa de un lector de manual):

1. PRIMERO LOS EJES, NO LAS CASILLAS. Miras toda la carta y encuentras los 3 o 4 patrones que se REPITEN o que CHOCAN. Un punto aislado dice poco; tres factores apuntando a lo mismo definen a la persona. Los aspectos marcados como DETERMINANTES (orbe menor a 1°) son los rasgos más fuertes de toda la carta: dales el peso central. La convergencia entre fuentes (la carta dice X, la numerología dice X, el tikkun dice X) es la señal más confiable que existe: subráyala.

2. CRUZAS SIEMPRE, NUNCA LEES SUELTO. Jamás "Sol en Leo = brillante". Siempre: "Sol en Leo pegado a Saturno = quiere brillar y se autocensura antes de mostrarse". El significado vive en la combinación. Cruza también entre fuentes: ¿el número del Alma confirma lo que dice la Luna, o lo contradice? ¿El ántídoto del tikkun coincide con la dirección del Nodo Norte? Esos cruces son el corazón del informe.

3. PROFUNDIDAD, NO COBERTURA. Mejor 4 ejes a fondo, con su mecanismo psicológico y cómo se manifiesta en la vida real, que 12 posiciones por encima. Si un dato no aporta a un eje, déjalo fuera. No rellenes.

4. CADA FUENTE APORTA ALGO DISTINTO. ÚSALAS TODAS:
- CARTA (signos, casas, modalidad, aspectos, fase lunar): el carácter, las tensiones, la estructura psíquica. La modalidad dominante dice si la persona INICIA (cardinal), SOSTIENE (fijo) o ADAPTA (mutable). El elemento ausente es lo que le falta cultivar. La fase lunar matiza la relación entre su identidad (Sol) y su mundo emocional (Luna).
- NUMEROLOGÍA DEL NOMBRE Y LA FECHA: no es decorativa. El Camino es la lección central de la vida. El Alma es lo que anhela en secreto. El Destino es hacia dónde la empuja la vida. La Personalidad es la máscara. Dedícale análisis real y crúzala con la carta.
- ÁNGELES (frecuencia): la fortaleza innata (ángel primario, con su dominio e interpretación) y el recurso para la crisis (ángel secundario). Traduce sus cualidades a capacidades humanas concretas y di CÓMO se activan.
- NODOS: el Nodo Sur es la zona de confort, lo que ya domina y usa como refugio para no crecer. El Nodo Norte es la dirección incómoda donde está su evolución. Este eje es de los más reveladores: desarróllalo con ejemplos de comportamiento. Si algún planeta aspecta al Nodo Norte (sobre todo Júpiter), la vida le da viento a favor cuando se mueve en esa dirección: dilo.
- QUIRÓN: la herida central de valor, y el don que nace de ella. Mira SUS ASPECTOS: con quién choca Quirón revela cómo se activa la herida. La herida trabajada se vuelve la forma más honesta en que la persona ayuda a otros.
- TIKKUN: la corrección del alma. Si los dos métodos (signo y nodo) convergen, ese es el eje más confiable de todo el informe.
- LILITH: lo que reprime, su fuerza en sombra, lo que no se permite.

5. LEES CON ESTAS LENTES (encárnalas, son tu forma de pensar):
- JUNG: lo que no se hace consciente gobierna como destino; la sombra integrada se vuelve fuerza. Nombra lo que la persona no ve de sí. "Lo que resistes, persiste."
- SÉNECA: examen honesto. Ante cada "fortaleza", pregunta: ¿es virtud real o miedo disfrazado? (el perfeccionismo no es rigor, es miedo con método). El sabio no teme porque ama lo que hace más de lo que teme perder.
- MAQUIAVELO: lectura del poder sin ingenuidad. ¿Cómo maneja esta persona la influencia, la ambición, el conflicto? ¿Evita el poder o lo busca? Sin romantizar y sin condenar: describir cómo opera de verdad.
- MARIO ALONSO PUIG: el miedo no mide la capacidad; saca a la persona del presente, y sin presencia la capacidad no se despliega. La clave no es eliminar el miedo sino dónde pone la atención.
- DISPENZA: nadie está condenado a su patrón; lo consciente se puede cambiar. Cada diagnóstico deja una salida concreta, nunca una sentencia.
- NEVILLE GODDARD: lo que la persona asume por dentro sobre sí misma es lo que termina viviendo por fuera. Nombra la hipótesis interna que se confirma sola.
- CONNY MÉNDEZ: práctica aterrizada, sin humo. Cada patrón viene con su palanca concreta.

6. TODO APUNTA A UN FIN: que la persona ENTIENDA Y TRABAJE SUS EMOCIONES, y despierte a su potencial. No haces un retrato para que se admire: haces un diagnóstico para que se transforme. Por cada patrón, piensa: ¿de qué le sirve esto para conocerse, crecer y actuar?

SI NO HAY HORA: no tienes Ascendente, casas ni Medio Cielo fiables. Dilo. Pero el carácter se lee igual de bien con signos, modalidad, aspectos, elementos, numerología, ángeles y tikkun. Profundiza en eso.

ESTRUCTURA DEL INFORME (libre en forma, pero cubre todo):
EJES CENTRALES — los 3-4 patrones que definen a esta persona, cada uno cruzando varios factores, cada uno con su mecanismo. Extenso. Es el corazón.
FORTALEZAS REALES — lo que tiene de verdad, anclado, y para qué le sirve en concreto. Nombra virtudes específicas, no genéricas.
DEBILIDADES Y CÓMO TRABAJARLAS — del elemento ausente, de los aspectos tensos, del Nodo Sur; para cada una, CÓMO se corrige.
LA HERIDA Y CÓMO TRABAJARLA — de dónde viene (Quirón y sus aspectos, Luna, número), cómo se manifiesta hoy, el camino de sanación, y el don que nace de ella.
EL NOMBRE Y EL ANHELO — qué revela la numerología sobre su misión y su motor secreto, cruzado con la carta.
LA FRECUENCIA DE ORIGEN — fortaleza innata y recurso de crisis (ángeles), traducidos a lo humano.
DIRECCIÓN DE VIDA — el eje de los nodos: de qué refugio sale, hacia dónde va, con qué apoyo cuenta.
CAMINO / VOCACIÓN — dónde rinde, qué entornos lo potencian y cuáles lo agotan.
SÍNTESIS EMOCIONAL — la frase central: cuál es el trabajo emocional de esta persona en esta vida. Qué debe aprender a sentir, soltar o sostener, y qué potencial despierta cuando lo hace.

Sé denso, específico y cruzado. Si este informe es profundo, el perfil será profundo.`;

function bloquePuntos(carta, hayHora){
  return PUNTOS_PRINCIPALES.map(k=>{
    const p = carta.puntos[k]; if (!p) return null;
    const casa = (hayHora && p.casa) ? ` — ${p.casa}` : "";
    const mod = p.modalidad ? `, ${p.modalidad}` : "";
    const el = p.elemento ? `/${p.elemento}` : "";
    const r = p.retro ? " [retrógrado]" : "";
    return `${p.nombre}: ${p.signo} ${p.grado}°${casa} (${p.modalidad}${el ? " "+p.elemento : ""})${r}`;
  }).filter(Boolean).join("\n");
}

function bloqueAspectos(lista){
  if (!lista.length) return "  (ninguno relevante)";
  return lista.map(a=>{
    const det = a.determinante ? " ★DETERMINANTE" : "";
    return `  ${a.p1} ${a.tipoRaw} ${a.p2} (orbe ${a.orbe}°)${det}`;
  }).join("\n");
}

function construirPromptAnalisis(nombre, edad, carta, esencia, angeles, tikkun, hayHora){
  const bloqueHora = hayHora
    ? `Ascendente y casas: FIABLES (hora confirmada).`
    : `SIN HORA DE NACIMIENTO: no hay Ascendente ni casas fiables. NO las inventes ni las menciones. Compensa con signos, modalidad, aspectos, elementos, numerología, ángeles y tikkun.`;

  const casasTxt = (hayHora && carta.casas.length)
    ? carta.casas.map(c=>`  Casa ${c.casa} en ${c.signo} — ${c.area}`).join("\n")
    : "  (sin hora: casas no fiables)";

  const conv = tikkun.convergen
    ? "\n► CONVERGENCIA DETECTADA: los dos métodos del tikkun apuntan a lo mismo. Este es el eje más confiable del informe: subráyalo."
    : "";

  return `Analiza a fondo a esta persona. Informe interno, denso, sin suavizar.

DATOS
Nombre completo (para numerología): ${nombre}
Edad: ${edad} años
${bloqueHora}
Fase lunar de nacimiento: ${carta.faseLunar || "—"}

BALANCE
Elementos: Fuego ${carta.conteoElem.Fire} · Tierra ${carta.conteoElem.Earth} · Aire ${carta.conteoElem.Air} · Agua ${carta.conteoElem.Water} → dominante ${carta.elemFuerte}, ausente ${carta.elemDebil}
Modalidad: Cardinal ${carta.conteoModo.Cardinal} · Fijo ${carta.conteoModo.Fixed} · Mutable ${carta.conteoModo.Mutable} → dominante ${carta.modoFuerte} (${carta.modoFuerte==="Cardinal"?"inicia":carta.modoFuerte==="Fixed"?"sostiene":"adapta"})

POSICIONES
${bloquePuntos(carta, hayHora)}

LAS 12 CASAS (cómo enfrenta cada área de vida)
${casasTxt}

ASPECTOS (ordenados por cercanía; ★ = determinante, orbe <1°)
${bloqueAspectos(carta.aspectos)}

ASPECTOS DE LA HERIDA (Quirón) — cómo se activa
${bloqueAspectos(carta.aspectosHerida)}

ASPECTOS DE LOS NODOS — apoyos o tensiones en la dirección de vida
${bloqueAspectos(carta.aspectosNodo)}

NUMEROLOGÍA (pitagórica)
Camino de vida ${esencia._numeros.camino} · Destino ${esencia._numeros.destino} · Alma ${esencia._numeros.alma} · Personalidad ${esencia._numeros.personalidad}

FRECUENCIA / ÁNGELES
Fortaleza innata (${angeles.fuerza.dominio}): ${angeles.fuerza.significado} — cualidades: ${(angeles.fuerza.cualidades||[]).join(", ")}. ${angeles.fuerza.interpretacion}
Recurso en crisis (${angeles.recurso.dominio}): ${angeles.recurso.significado} — cualidades: ${(angeles.recurso.cualidades||[]).join(", ")}. ${angeles.recurso.interpretacion}

TIKKUN (corrección del alma)
Por signo: "${tikkun.zodiac.tema}" → antídoto "${tikkun.zodiac.antidoto}". ${tikkun.zodiac.interpretacion}
Por nodo: "${tikkun.nodo.tema}" → antídoto "${tikkun.nodo.antidoto}". ${tikkun.nodo.interpretacion}${conv}

Produce el informe completo con la estructura indicada. Denso, específico, cruzado, sin relleno.`;
}

// ════════════════════════════════════════════════════════════
// BLOQUE G — PASO 2: REDACCIÓN VER·A (5 módulos)
// Aquí SÍ se aplica el filtro de lenguaje.
// ════════════════════════════════════════════════════════════
const SYSTEM_BASE = `Eres la voz de VER·A, educación emocional personalizada en español.

QUÉ RECIBES
Un informe técnico interno sobre una persona. Tu trabajo es traducirlo a lenguaje humano y entregarle algo que ella no se había dicho. El informe es tu fuente de verdad: no inventes lo que no está, y no te quedes corto usando solo una parte.

CÓMO ESCRIBES — EL NIVEL IMPORTA
No eres un coach. Eres un ensayista lúcido que entiende a la persona mejor de lo que ella se entiende. Escribes con la precisión de quien nombra un mecanismo, no con la calidez de quien da ánimo. La emoción llega DESPUÉS de la verdad, no en lugar de ella.

PROHIBIDO ABRIR CON FÓRMULAS DE AUTOAYUDA. Nada de:
- "Cuando entras a un lugar, algo cambia"
- "Hay algo en ti que..." / "Eres de esas personas que..."
- "Eso no lo aprendiste, lo eres" / "lo llevas dentro"
- Cualquier escena genérica que podría aplicar a medio mundo.
LA PRIMERA FRASE de cada módulo debe nombrar el MECANISMO PSICOLÓGICO EXACTO de ESTA persona: la contradicción precisa, el patrón concreto que la define. Específico, no universal. Si tu primera frase le sirve a otra persona distinta, bórrala y empieza de nuevo.

LAS 5 REGLAS
1. NOMBRA LA EVASIÓN, NO SOLO LA CUALIDAD. Flojo: "eres generosa". Bien: "das para que no te dejen, por eso nunca pides".
2. MOMENTOS, NO ADJETIVOS. Flojo: "te cuesta la iniciativa". Bien: "hay algo que llevas semanas sin enviar. Sabes cuál".
3. PRECISIÓN SIN JUICIO. Sí: "te escondes en tu cabeza y le llamas descansar". No: "eres cobarde".
4. ABRE CON EL MECANISMO MÁS CIERTO E INCÓMODO. Sin preámbulo ni saludo.
5. CIERRA CON EL RIESGO: "Puede parecer [lo que ven], pero es [lo que evitas]".

USA "PUEDES" Y "PODRÍAS", NUNCA "DEBES". El potencial se abre, no se exige. Cada módulo muestra una puerta, no una obligación.

EQUILIBRIO OBLIGATORIO
No todo es evasión. La persona tiene capacidades reales: nómbralas con la misma precisión, diciendo para qué le sirven y dónde ya las usa. Un módulo que solo señala fallas es un juicio, no un espejo.

PROHIBIDO ABSOLUTO (vocabulario)
- Nunca escribas: planeta, signo, casa, carta natal, astrología, horóscopo, zodíaco, ascendente, nodo, kabbalah, tikún, tránsito, retrógrado, grado, ningún nombre de signo (Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis), ningún nombre de planeta (Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno, Plutón, Quirón, Lilith), ángel, salmo, tarot, número, numerología, chakra.
- Nunca uses Fuego/Tierra/Aire/Agua como categorías. Puedes usar "chispa", "raíz", "claridad", "hondura" como metáforas sueltas.
- Nunca cifras de cálculo ni la palabra "grado".
- Nunca vocabulario místico: energía, alma, vibrar, destino, abundancia, alinear, misión cósmica, "viniste a", "estás llamado a".
- Nunca adules: "capacidad que excede lo ordinario", "algo poco común en ti".
- Nunca persuadas para que crea ("si no te resuena", "no tienes nada que perder").
- Nunca nombres la máquina: algoritmo, sistema, inteligencia artificial, programa.

SEGUNDA PERSONA SIEMPRE: escribes "tú", directo. Nunca en tercera persona con su nombre. El nombre solo como vocativo, máximo una vez por módulo.

GÉNERO NEUTRO: no conoces el género. Prohibido adjetivo/participio marcado. "llegas preparado"→"llegas con todo listo"; "tú mismo"→"tú"; "estás cansado"→"cargas cansancio". Reformula con sustantivos o verbos. Revisa CADA frase.

TÍTULOS: cada título ## va SOLO en su línea, con línea vacía antes y después. Jamás pegado a un párrafo.

ESPAÑOL NEUTRO: usa "tú". Prohibido vos/tenés/sos/querés/podés. Sin regionalismos.

TEXTO LIMPIO: solo la versión final, nunca correcciones ni titubeos.

TU MARCO (encárnalo, nunca lo nombres): Jung (nombra lo que no ve), Dispenza (siempre salida, nunca condena), Neville Goddard (lo interno moldea lo externo), Conny Méndez (práctica sin humo), Mario Alonso Puig (el miedo saca del presente; la atención es la palanca), Séneca (amar la causa más que temer perderla), PNL (cada patrón con su palanca concreta).
El fin: que la persona termine ENTENDIENDO algo suyo y con una acción real. Diagnóstico + salida, siempre.`;

const FRECUENCIAS = {
  Earth:{ hz:"7.83 Hz", para:"cuando pierdes el centro y te falta aterrizaje", link:"https://youtu.be/SO3vBRaGcYw" },
  Fire:{ hz:"285 Hz", para:"cuando te falta empuje y ganas de arrancar", link:"https://youtu.be/mAUsMe7lauE" },
  Air:{ hz:"741 Hz", para:"cuando no puedes expresarte y te falta claridad", link:"https://youtu.be/8TioM0izmi0" },
  Water:{ hz:"639 Hz", para:"cuando un vínculo o una emoción necesitan sanar", link:"https://youtu.be/IqcT6PIIMro" }
};

function construirPrompts(nombre, edad, informe, carta, hayHora){
  const CTX = `INFORME INTERNO SOBRE ${nombre.toUpperCase()} (${edad} años):
${informe}

---
Traduce a lenguaje VER·A. El informe es tu fuente de verdad. Nunca uses su vocabulario técnico.`;

  const edadNota = edad < 20
    ? `\n\nIMPORTANTE — LA PERSONA TIENE ${edad} AÑOS. Ajusta los ejemplos a su vida real: estudios, amistades, familia, primeros trabajos, decisiones sobre qué estudiar. PROHIBIDO hablar de pareja estable, socios, hipotecas o carreras consolidadas. Habla de lo que ya vive.`
    : "";

  const frec = FRECUENCIAS[carta.debil] || FRECUENCIAS.Earth;
  const p = {};

  p.quien_eres = { system: SYSTEM_BASE, user:`${CTX}${edadNota}

Escribe "Quién Eres". 500-600 palabras. El retrato central: núcleo, carácter, motor y fuerza natural, en UN hilo sin repetir.
Usa del informe: EJES CENTRALES, FORTALEZAS REALES, EL NOMBRE Y EL ANHELO, LA FRECUENCIA DE ORIGEN.
La PRIMERA FRASE nombra el mecanismo exacto de esta persona (su contradicción central), no una escena genérica.
Elige los 3 ejes más fuertes y desarróllalos UNA vez cada uno, a fondo. Este es el ÚNICO módulo que describe el carácter general.

## Tu núcleo
Los 2-3 ejes que te definen, cruzados. La contradicción entre lo que muestras y lo que necesitas. Con momentos reconocibles.

## Lo que te mueve por dentro
Tu motor privado, lo que anhelas sin decirlo. La distancia entre tu imagen externa y tu interior.

## Tu fuerza natural
Lo que haces bien sin esfuerzo, para qué sirve, dónde ya lo usas. Nombra virtudes específicas. Sin adular.

Cierra con el riesgo, sin título: "Puede parecer X, pero es Y".` };

  p.herida = { system: SYSTEM_BASE + `\n\nTONO: directo y honesto, sin crueldad. Jung (nombra lo que no ve) y Dispenza (deja salida). La herida trabajada se vuelve fuerza.`, user:`${CTX}${edadNota}

Escribe "Tu Herida y Cómo Sanarla". 500-600 palabras. NO repitas el carácter general. Solo: la herida, su origen, cómo se manifiesta hoy, el refugio, el camino de sanación, y el don que nace de ella.
Usa del informe: LA HERIDA Y CÓMO TRABAJARLA, DIRECCIÓN DE VIDA.
La PRIMERA FRASE nombra la herida exacta, no un preámbulo.

## Dónde dudas de merecer
La herida en una frase precisa. Luego 2-3 momentos concretos donde aparece.

## De dónde viene
Cómo se aprendió antes de tener palabras. El mecanismo, no la culpa.

## Dónde te refugias
El patrón al que corres cuando algo aprieta, con ejemplos. Y el terreno opuesto de crecimiento.

## Cómo se sana
Reencuadre (PNL) + práctica real. Dispenza: se transforma, no es condena. Cómo la herida trabajada se vuelve tu forma más honesta de llegar a otros.

Cierra con una práctica pequeña para esta semana, sin título.` };

  p.equilibrio = { system: SYSTEM_BASE + `\n\nEl más práctico. PNL pura: diagnóstico rápido y palancas para hoy.`, user:`${CTX}${edadNota}

Escribe "De Qué Careces y Cómo Trabajarlo". 400-450 palabras. NO repitas herida ni carácter. Solo: la carencia práctica y cómo entrenarla.
Usa del informe: DEBILIDADES Y CÓMO TRABAJARLAS, BALANCE.
Apertura sin título: tu desequilibrio en dos líneas. Qué te sobra y qué te falta.

## Lo que esto te está costando
2-3 líneas concretas de lo que ya vives por esa carencia.

## Tres cosas que puedes hacer hoy
Exactamente tres prácticas numeradas (1. 2. 3.), cada una en su línea, accionables hoy, con verbos de acción. Anclas y reencuadres de PNL.

## Tu sonido
Preséntalo como herramienta: ${frec.hz}, para ${frec.para}. Incluye el enlace [Escúchalo aquí](${frec.link}).

Cierra con el riesgo, sin título.` };

  p.camino = { system: SYSTEM_BASE, user:`${CTX}${edadNota}

Escribe "Tu Camino". 450-550 palabras. Concreto y útil: dónde encaja, dónde no, qué momento vive. NO repitas herida ni carácter.
Usa del informe: CAMINO / VOCACIÓN, DIRECCIÓN DE VIDA, SÍNTESIS.

## Cómo trabajas
Tu forma real de rendir: cómo aprendes, cómo produces, en qué condiciones das lo mejor.

## Dónde encajas
4-6 campos o roles concretos, con el POR QUÉ ligado a cómo funcionas. ${edad<20?"Incluye qué estudiar o explorar ahora.":""}

## Dónde te desgastas
2-3 entornos que te agotan, y por qué.

## Tu momento ahora
Tu etapa de vida desde un ángulo que no esperas. Qué te permite construir esta etapa que ninguna otra. Qué estás postergando.

Cierra con un primer paso concreto, sin título.` };

  p.practica_diaria = { system: SYSTEM_BASE + `\n\nCIERRA EL PERFIL. Cálido y sereno: aquí acompañas, no confrontas. Conny Méndez y Puig: esperanza aterrizada.`, user:`${CTX}${edadNota}

Escribe "Tu Práctica Diaria". 300-350 palabras. NO diagnostiques de nuevo: es la rutina de mañana.
Apertura de 2 líneas sin título: aquí termina de leer y empieza a vivir.

## Tu gratitud de hoy
Una gratitud a su medida, ligada a su fuerza real del informe. No genérica.

## Lo que en ti es más grande que tu miedo
Una fuerza propia a la que recurrir, sin marco religioso, y cómo conectarse con ella hoy.

## Tu pregunta de hoy
Una sola pregunta afinada a su foco de crecimiento, para observarse durante el día.

Cierre cálido de una línea.` };

  return p;
}

// ════════════════════════════════════════════════════════════
// BLOQUE H — Llamadas a Claude y orquestación
// ════════════════════════════════════════════════════════════
const CLAUDE_MODEL = "claude-sonnet-4-6";

async function llamarClaude(systemPrompt, userPrompt, claudeKey, maxTokens){
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":claudeKey, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({ model:CLAUDE_MODEL, max_tokens:maxTokens||2500, system:systemPrompt, messages:[{role:"user",content:userPrompt}] })
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Claude ${res.status}: ${raw.slice(0,300)}`);
  let data; try{ data=JSON.parse(raw); }catch(e){ throw new Error(`Claude no-JSON: ${raw.slice(0,300)}`); }
  return (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
}

const CLAVES_MODULOS = ["quien_eres","herida","equilibrio","camino","practica_diaria"];

async function generarModulos(prompts, claudeKey){
  const perfil = {};
  async function generarUno(k){
    for (let intento=1; intento<=2; intento++){
      try{
        const txt = await llamarClaude(prompts[k].system, prompts[k].user, claudeKey, 2500);
        if (txt && txt.trim()) return limpiarTexto(txt);
      }catch(e){ if (intento===2) console.error(`Módulo ${k} falló:`, e.message); }
      await new Promise(r=>setTimeout(r,800));
    }
    return null;
  }
  const TAM=3;
  for (let i=0;i<CLAVES_MODULOS.length;i+=TAM){
    const tanda = CLAVES_MODULOS.slice(i,i+TAM);
    const res = await Promise.all(tanda.map(k=>generarUno(k)));
    tanda.forEach((k,j)=>{ perfil[k]=res[j]; });
  }
  return perfil;
}

// ════════════════════════════════════════════════════════════
// BLOQUE I — Google Sheets (no crítico)
// ════════════════════════════════════════════════════════════
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzLTbID_o5XiQLOrdm8d2D5wodxoXJh03EuJHZICqf1qmNOPhyPXlBcWEcCoFHX8OZQaw/exec";
async function guardarEnHoja(datos){
  try{ await fetch(SHEETS_URL+"?payload="+encodeURIComponent(JSON.stringify(datos)),{method:"GET"}); }
  catch(e){ console.error("No se pudo guardar en hoja:", e.message); }
}

// ════════════════════════════════════════════════════════════
// BLOQUE J — EMAIL (Resend) — SIN mostrar errores de cálculo
// ════════════════════════════════════════════════════════════
const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_REMITENTE = "VER·A <ver.a@ver-a.life>";
const EMAIL_BCC = "mariodavilarealtor@gmail.com";
const REDES = [
  { nombre:"YouTube", url:"https://www.youtube.com/@VER-A-q6z" },
  { nombre:"Instagram", url:"https://www.instagram.com/ver.a.life" },
  { nombre:"TikTok", url:"https://www.tiktok.com/@ver.a.life" }
];
const TITULOS_MODULOS = {
  quien_eres:"Quién Eres", herida:"Tu Herida y Cómo Sanarla",
  equilibrio:"De Qué Careces y Cómo Trabajarlo", camino:"Tu Camino", practica_diaria:"Tu Práctica Diaria"
};
const ORDEN_MODULOS = ["quien_eres","herida","equilibrio","camino","practica_diaria"];

function escaparHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function inlineMd(l){
  let h=escaparHtml(l).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  h=h.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" style="color:#b8860b;text-decoration:underline;">$1</a>');
  return h;
}
function markdownAHtml(texto){
  const lineas=(texto||"").split("\n"); let html="", enLista=false;
  for (let cruda of lineas){
    const l=cruda.trim();
    if (!l){ if(enLista){html+="</ul>";enLista=false;} continue; }
    if (/^---+$/.test(l)){ if(enLista){html+="</ul>";enLista=false;} html+='<hr style="border:none;border-top:1px solid #e7ddc9;margin:22px 0;">'; continue; }
    const t=l.match(/^(#{1,3})\s+(.*)$/);
    if (t){ if(enLista){html+="</ul>";enLista=false;} html+=`<h3 style="font-family:Georgia,serif;color:#2b2b2b;font-size:19px;margin:24px 0 8px;">${inlineMd(t[2])}</h3>`; continue; }
    const li=l.match(/^[-*]\s+(.*)$/);
    if (li){ if(!enLista){html+='<ul style="margin:8px 0 8px 18px;padding:0;">';enLista=true;} html+=`<li style="margin:4px 0;line-height:1.6;">${inlineMd(li[1])}</li>`; continue; }
    const ol=l.match(/^\d+\.\s+(.*)$/);
    if (ol){ html+=`<p style="margin:8px 0;line-height:1.7;"><strong>${inlineMd(ol[1])}</strong></p>`; continue; }
    if (enLista){html+="</ul>";enLista=false;}
    html+=`<p style="margin:10px 0;line-height:1.7;color:#333;">${inlineMd(l)}</p>`;
  }
  if (enLista) html+="</ul>";
  return html;
}

function construirHtmlPerfil(nombre, modulos){
  let cuerpo="";
  // CLAVE: solo se incluyen los módulos que SÍ se generaron.
  // Si uno vino vacío, se OMITE en silencio. El correo nunca muestra "no se pudo generar".
  for (const clave of ORDEN_MODULOS){
    const texto = modulos[clave];
    if (!texto || !texto.trim()) continue;  // omisión silenciosa
    cuerpo += `
<div style="margin:0 0 18px;">
<h2 style="font-family:Georgia,serif;color:#1a1a1a;font-size:24px;margin:30px 0 6px;">${TITULOS_MODULOS[clave]}</h2>
<div style="height:2px;width:60px;background:#b8860b;margin:0 0 14px;"></div>
${markdownAHtml(texto)}
</div>`;
  }
  const redesHtml = REDES.map(r=>`<a href="${r.url}" style="color:#b8860b;text-decoration:none;font-weight:bold;margin:0 8px;">${r.nombre}</a>`).join("·");
  return `
<div style="background:#faf7f0;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
<div style="background:#1a1a1a;padding:28px;text-align:center;">
<div style="font-family:Georgia,serif;color:#fff;font-size:30px;letter-spacing:3px;">VER·A</div>
<div style="color:#b8860b;font-size:12px;letter-spacing:2px;margin-top:4px;">CONÓCETE DE VERDAD</div>
</div>
<div style="padding:30px 28px;">
<p style="font-size:17px;color:#222;margin:0 0 16px;">Hola ${escaparHtml(nombre)}, aquí está tu perfil VER·A.</p>
<p style="font-size:15px;color:#555;margin:0 0 8px;line-height:1.6;">Esto no es un test genérico ni una respuesta automática: es un espejo hecho para ti. Léelo con calma, y quédate con lo que te mueva a actuar.</p>
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

async function enviarEmailPerfil(destinatario, nombre, modulos, resendKey){
  try{
    if (!resendKey){ console.error("Falta RESEND_API_KEY."); return; }
    if (!destinatario){ console.error("Sin email destinatario."); return; }
    // Si por alguna razón NINGÚN módulo se generó, no enviamos un correo vacío.
    const hayContenido = ORDEN_MODULOS.some(k=>modulos[k] && modulos[k].trim());
    if (!hayContenido){ console.error("Perfil sin módulos: no se envía correo vacío."); return; }

    const html = construirHtmlPerfil(nombre, modulos);
    const res = await fetch(RESEND_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+resendKey },
      body: JSON.stringify({ from:EMAIL_REMITENTE, to:[destinatario], bcc:[EMAIL_BCC], subject:`${nombre}, tu perfil VER·A está listo`, html })
    });
    if (!res.ok){ const t=await res.text(); console.error("Resend error:", res.status, t.slice(0,300)); }
  }catch(e){ console.error("No se pudo enviar email:", e.message); }
}

// ════════════════════════════════════════════════════════════
// HANDLER DE VERCEL
// ════════════════════════════════════════════════════════════
module.exports = async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(405).json({error:"Método no permitido"});

  let body;
  try{
    body = await new Promise((resolve,reject)=>{
      let raw=""; req.on("data",c=>{raw+=c;}); req.on("end",()=>{try{resolve(JSON.parse(raw));}catch(e){reject(e);}}); req.on("error",reject);
    });
  }catch(err){ return res.status(400).json({error:"Body error: "+err.message}); }

  const { nombre, nombreCompleto, email, fecha, ciudad, paisCodigo, hora, franja, horaConocida, p1, p2, p3, p4, consentimiento, pago } = body;

  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const ASTRO_KEY = process.env.ASTROLOGY_API_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!CLAUDE_KEY) return res.status(500).json({error:"Falta ANTHROPIC_API_KEY."});
  if (!ASTRO_KEY) return res.status(500).json({error:"Falta ASTROLOGY_API_KEY."});

  const faltan=[];
  if (!nombre) faltan.push("nombre");
  if (!nombreCompleto) faltan.push("nombreCompleto");
  if (!fecha) faltan.push("fecha");
  if (!ciudad) faltan.push("ciudad");
  if (!paisCodigo) faltan.push("paisCodigo");
  if (faltan.length) return res.status(400).json({error:"Faltan datos: "+faltan.join(", ")});

  const FRANJAS={ madrugada:"03:00", manana:"09:00", tarde:"15:00", noche:"21:00" };
  let horaCalculo, hayHora=true;
  if (horaConocida && hora){ horaCalculo=hora; }
  else if (franja && FRANJAS[franja]){ horaCalculo=FRANJAS[franja]; hayHora=false; }
  else { horaCalculo="12:00"; hayHora=false; }

  const [anio,mes,dia]=fecha.split("-").map(Number);
  const [horaH,horaM]=horaCalculo.split(":").map(Number);

  try{
    const esencia = calcularEsencia(nombreCompleto, dia, mes, anio);
    const subject = armarSubject(nombre, anio, mes, dia, horaH, horaM, ciudad, paisCodigo);
    const kabbalah = armarKabbalah(anio, mes, dia, horaH, horaM, ciudad, paisCodigo);

    const [cartaRaw, angelesRaw, tikkunRaw] = await Promise.all([
      llamarAstrologyAPI("/api/v3/charts/natal", subject, ASTRO_KEY),
      llamarAstrologyAPI("/api/v3/kabbalah/birth-angels", kabbalah, ASTRO_KEY),
      llamarAstrologyAPI("/api/v3/kabbalah/tikkun", kabbalah, ASTRO_KEY)
    ]);

    const carta = procesarCartaCompleta(cartaRaw, hayHora);
    const angeles = procesarAngelesCompleto(angelesRaw);
    const tikkun = procesarTikkunCompleto(tikkunRaw);
    const edad = calcularEdad(anio, mes, dia);

    // PASO 1 — análisis experto (interno)
    const promptAnalisis = construirPromptAnalisis(nombreCompleto, edad, carta, esencia, angeles, tikkun, hayHora);
    const informe = await llamarClaude(SYSTEM_ANALISIS, promptAnalisis, CLAUDE_KEY, 6000);

    // PASO 2 — redacción de los 5 módulos
    const prompts = construirPrompts(nombre, edad, informe, carta, hayHora);
    const modulos = await generarModulos(prompts, CLAUDE_KEY);

    await guardarEnHoja({
      nombre:nombreCompleto||nombre||"", nombreCompleto:nombreCompleto||"", email:email||"",
      fecha:fecha||"", ciudad:ciudad||"", pais:paisCodigo||"",
      hora:horaConocida&&hora?hora:(franja||""), consentimiento:consentimiento||"", pago:pago||"No"
    });

    if (pago==="Si") await enviarEmailPerfil(email, nombre, modulos, RESEND_KEY);

    const avisoFranja = !hayHora
      ? "Este perfil se generó sin tu hora exacta de nacimiento. Todo lo que describe tu carácter, tus patrones y tu camino es igual de válido. Lo que no podemos precisar sin la hora es en qué áreas concretas de tu vida se manifiesta cada cosa. Si consigues tu hora exacta, podemos afinarlo."
      : null;

    return res.status(200).json({ nombre, modulos, avisoFranja });

  }catch(err){
    return res.status(500).json({error:"Error generando perfil: "+err.message});
  }
};
