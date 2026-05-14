module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, fecha, hora, ciudad, ciudadActual, dolor, emocion, relacion, dinero } = req.body;

  // CORRECCIÓN 5: Validar campos obligatorios antes de procesar
  if (!nombre || !fecha || !ciudad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, fecha, ciudad' });
  }

  try {
    const birthDate = new Date(fecha + 'T12:00:00');
    const day = birthDate.getDate();
    const month = birthDate.getMonth() + 1;
    const year = birthDate.getFullYear();
    const [hourStr, minStr] = (hora || '12:00').split(':');
    const birthHour = parseInt(hourStr) || 12;
    const birthMin = parseInt(minStr) || 0;

    const coords = await getCityCoords(ciudad);
    const apiKey = process.env.ASTROLOGY_API_KEY;
    const baseUrl = 'https://astrology-api.io/api/v1';

    let chartData = null, astrocartoData = null, kabbalaData = null, numerologyData = null;

    // --- LLAMADAS A APIs EXTERNAS ---

    try {
      const chartResp = await fetch(`${baseUrl}/natal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin, latitude: coords.lat, longitude: coords.lng, house_system: 'placidus' })
      });
      if (chartResp.ok) {
        chartData = await chartResp.json();
      } else {
        console.log('Chart API status:', chartResp.status, await chartResp.text());
      }
    } catch(e) { console.log('Chart API error:', e.message); }

    try {
      const astroResp = await fetch(`${baseUrl}/astrocartography/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin, latitude: coords.lat, longitude: coords.lng, limit: 5 })
      });
      if (astroResp.ok) {
        astrocartoData = await astroResp.json();
      } else {
        console.log('Astrocarto API status:', astroResp.status, await astroResp.text());
      }
    } catch(e) { console.log('Astrocarto error:', e.message); }

    try {
      const kabResp = await fetch(`${baseUrl}/kabbalah/birth-angels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin })
      });
      if (kabResp.ok) {
        kabbalaData = await kabResp.json();
        console.log('Kabbalah raw response:', JSON.stringify(kabbalaData)); // DEBUG
      } else {
        console.log('Kabbalah API status:', kabResp.status, await kabResp.text());
      }
    } catch(e) { console.log('Kabbalah error:', e.message); }

    try {
      const numResp = await fetch(`${baseUrl}/numerology/kabbalah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ name: nombre })
      });
      if (numResp.ok) {
        numerologyData = await numResp.json();
        console.log('Numerology raw response:', JSON.stringify(numerologyData)); // DEBUG
      } else {
        console.log('Numerology API status:', numResp.status, await numResp.text());
      }
    } catch(e) { console.log('Numerology error:', e.message); }

    // --- PROCESAMIENTO DE DATOS ---

    const elements = chartData ? getElementsFromChart(chartData) : getElementsFromSign(day, month);
    const sunSign = chartData?.planets?.find(p => p.name === 'Sun')?.sign || getSunSign(day, month);
    const moonSign = chartData?.planets?.find(p => p.name === 'Moon')?.sign || null;

    // CORRECCIÓN 2: Quirón traducido a lenguaje VER·A antes de enviarlo al prompt
    const chironRaw = chartData?.planets?.find(p => p.name === 'Chiron') || null;
    const chironVERA = translateChironToVERA(chironRaw, year);

    // CORRECCIÓN 3: Extraer nombre72 correctamente según la estructura real de la API
    const nombre72 = extractNombre72(kabbalaData, day, month, year);

    // CORRECCIÓN 5: ciudadActual con fallback explícito
    const ciudadActualSafe = ciudadActual || ciudad || 'tu ciudad actual';
    const cities = astrocartoData?.cities || getDefaultCities(ciudadActualSafe);

    // Calcular distribución de energía real desde los elementos (no hardcodeada)
    const energyDistribution = calculateEnergyDistribution(elements);

    const prompt = buildVeRAPrompt({
      nombre,
      fecha: `${day}/${month}/${year}`,
      hora: hora || 'no disponible',
      ciudad,
      ciudadActual: ciudadActualSafe,
      dolor,
      emocion,
      relacion,
      dinero,
      sunSign,
      moonSign,
      elements,
      chironVERA,
      nombre72,
      cities,
      numerologyData,
      energyDistribution
    });

    // CORRECCIÓN 6: Aumentar max_tokens para evitar JSON truncado
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error('Claude API error:', claudeResp.status, errText);
      return res.status(500).json({ error: 'Error en generación del perfil', details: errText });
    }

    const claudeData = await claudeResp.json();
    const text = claudeData.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json\n?|```\n?/g, '').trim();

    let report;
    try {
      report = JSON.parse(clean);
    } catch(parseErr) {
      console.error('JSON parse error:', parseErr.message);
      console.error('Raw Claude response:', clean.substring(0, 500));
      return res.status(500).json({ error: 'Error al procesar el perfil generado', raw: clean.substring(0, 200) });
    }

    report._meta = {
      nombre72,
      elements,
      cities,
      hasChart: !!chartData,
      hasKabbalah: !!kabbalaData,
      hasAstrocarto: !!astrocartoData,
      energyDistribution
    };

    res.status(200).json(report);

  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ error: error.message });
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function getCityCoords(cityName) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'VER-A-App/1.0' } }
    );
    const data = await resp.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch(e) { console.log('Geocoding error:', e.message); }
  return { lat: 10.4806, lng: -66.9036 }; // fallback: Caracas
}

function getElementsFromChart(chartData) {
  const elementMap = {
    'Aries':'Fuego','Leo':'Fuego','Sagittarius':'Fuego','Sagitario':'Fuego',
    'Taurus':'Tierra','Virgo':'Tierra','Capricorn':'Tierra','Capricornio':'Tierra','Tauro':'Tierra',
    'Gemini':'Aire','Libra':'Aire','Aquarius':'Aire','Acuario':'Aire','Geminis':'Aire',
    'Cancer':'Agua','Scorpio':'Agua','Pisces':'Agua','Escorpio':'Agua','Piscis':'Agua'
  };
  const counts = { Fuego:0, Tierra:0, Aire:0, Agua:0 };
  const weights = { Sun:3, Moon:3, Mercury:2, Venus:2, Mars:2, Jupiter:1, Saturn:1, Chiron:1, 'North Node':1 };
  chartData.planets?.forEach(p => {
    const e = elementMap[p.sign];
    if (e) counts[e] += (weights[p.name] || 1);
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  return {
    counts,
    dominant: sorted[0][0],
    weak: sorted[sorted.length-1][0]
  };
}

function getElementsFromSign(day, month) {
  const sign = getSunSign(day, month);
  const fire = ['Aries','Leo','Sagitario'].includes(sign);
  const earth = ['Tauro','Virgo','Capricornio'].includes(sign);
  const air = ['Geminis','Libra','Acuario'].includes(sign);
  const dominant = fire?'Fuego':earth?'Tierra':air?'Aire':'Agua';
  const all = ['Fuego','Tierra','Aire','Agua'];
  const weak = all.filter(e=>e!==dominant).pop();
  return { dominant, weak, counts:{ Fuego: fire?4:1, Tierra: earth?4:1, Aire: air?4:2, Agua: (!fire&&!earth&&!air)?4:2 } };
}

function getSunSign(day, month) {
  const signs = [
    [20,'Capricornio'],[19,'Acuario'],[20,'Piscis'],[20,'Aries'],
    [21,'Tauro'],[21,'Geminis'],[23,'Cancer'],[23,'Leo'],
    [23,'Virgo'],[23,'Libra'],[22,'Escorpio'],[22,'Sagitario']
  ];
  return day <= signs[month-1][0] ? signs[month-1][1] : signs[month%12][1];
}

// CORRECCIÓN 3: Extrae nombre72 de cualquier estructura posible que devuelva la API
function extractNombre72(kabbalaData, day, month, year) {
  if (!kabbalaData) return get72NameFallback(day, month, year);

  // Intentar múltiples rutas según cómo la API puede estructurar la respuesta
  const rawName =
    kabbalaData.primary_angel?.name ||
    kabbalaData.primary_angel ||
    kabbalaData.angel?.name ||
    kabbalaData.angel ||
    kabbalaData.name ||
    kabbalaData.birth_angel?.name ||
    kabbalaData.birth_angel ||
    null;

  const rawNumber =
    kabbalaData.primary_angel?.number ||
    kabbalaData.number ||
    kabbalaData.angel?.number ||
    kabbalaData.birth_angel?.number ||
    null;

  if (rawName && rawNumber) {
    return { numero: rawNumber, nombre: rawName };
  }

  // Si hay datos pero no en el formato esperado, log para debug
  console.log('Kabbalah structure unexpected:', JSON.stringify(kabbalaData).substring(0, 300));
  return get72NameFallback(day, month, year);
}

function get72NameFallback(day, month, year) {
  const date = new Date(year, month-1, day);
  const start = new Date(year, 0, 1);
  const num = ((Math.floor((date-start)/86400000))%72)+1;
  const names = {
    1:'El Sanador del Pasado',2:'La Esperanza Restaurada',3:'El Creador de Milagros',
    4:'El Canal de Prosperidad',5:'El Sanador del Cuerpo',6:'El Liberador de Cadenas',
    7:'El Puente con lo Divino',8:'El Escudo de Luz',9:'El Portador de Sabiduría',
    10:'El Soltador del Pasado',11:'El Amor Incondicional',12:'El Revertidor del Destino',
    13:'El Unificador',14:'El Perdonador',15:'El Rendidor al Bien',
    16:'El Abundante en lo Cotidiano',17:'El Equilibrador',18:'El Creativo Fértil',
    19:'El Materializador de Sueños',20:'El Despertador',21:'El Compasivo',
    22:'El Retornador',23:'La Abundancia Total',24:'El Purificador',
    25:'El Conector Sagrado',26:'El Ordenador del Caos',27:'El Socio Silencioso',
    28:'El Alma Gemela',29:'El Revelador del Propósito',30:'El Unidor de Almas',
    31:'El Completador',32:'El Triunfador',33:'El Revelador de Sombras',
    34:'El Transformador del Dolor',35:'El Liberador del Miedo',36:'El Sanador Profundo',
    37:'El Vidente',38:'El Eterno',39:'El Domador del Ego',
    40:'El Próspero Sostenido',41:'El Invencible',42:'El Expansor',
    43:'El Viajero del Alma',44:'El Descansador',45:'El Unificador de Opuestos',
    46:'El Recto Próspero',47:'El Retornador a Raíces',48:'El Portador de Verdad',
    49:'El Liberador de la Ira',50:'El Renovador',51:'El Ordenador',
    52:'El Orador Sagrado',53:'El Transformador del Odio',54:'El Aliviador',
    55:'El Manifestador',56:'El Pacificador',57:'El Escuchador Interior',
    58:'El Unificador del Ser',59:'El Revelador de Verdad',60:'El Vitalizador',
    61:'El Multiplicador',62:'El Pacífico',63:'El Orden en el Caos',
    64:'El Descansador del Alma',65:'El Maestro',66:'El Ordenador Universal',
    67:'El Amor Puro',68:'El Liberador de Vergüenza',69:'El Liberador del Karma',
    70:'El Despertador Espiritual',71:'El Conector Divino',72:'El Agradecido Total'
  };
  return { numero: num, nombre: names[num] || 'El Transformador' };
}

// CORRECCIÓN 2: Traduce Quirón a lenguaje VER·A antes de pasarlo al prompt
function translateChironToVERA(chiron, birthYear) {
  if (!chiron) {
    // Generación 1976-1988: Quirón en Tauro → herida de valor/recursos
    // Generación 1989-1993: Quirón en Cáncer → herida de pertenencia
    if (birthYear >= 1976 && birthYear <= 1988) {
      return {
        area: 'tu relación con el valor propio y los recursos',
        patron: 'la creencia de que tu valor depende de lo que produces o posees',
        don: 'la capacidad de ayudar a otros a reconocer su valor intrínseco'
      };
    } else if (birthYear >= 1988 && birthYear <= 1993) {
      return {
        area: 'tu sentido de pertenencia y raíces emocionales',
        patron: 'la sensación de no encajar o de no merecer ser recibido/a',
        don: 'la capacidad de crear hogares emocionales para quienes se sienten solos'
      };
    }
    return {
      area: 'tu herida más profunda y transformadora',
      patron: 'el patrón que más duele y más enseña',
      don: 'el poder que emerge cuando esa herida sana'
    };
  }

  // Traducir signo y casa a lenguaje VER·A
  const signMap = {
    'Taurus':'tu relación con el valor propio, el cuerpo y los recursos materiales',
    'Tauro':'tu relación con el valor propio, el cuerpo y los recursos materiales',
    'Aries':'tu derecho a existir, a ocupar espacio y a actuar',
    'Geminis':'tu voz, tu forma de comunicarte y de ser escuchado/a',
    'Gemini':'tu voz, tu forma de comunicarte y de ser escuchado/a',
    'Cancer':'tu sentido de pertenencia, hogar y recibir cuidado',
    'Leo':'tu derecho a brillar, a ser visto/a y a recibir reconocimiento',
    'Virgo':'tu relación con la perfección, el servicio y el mérito',
    'Libra':'tus relaciones, el equilibrio y tu capacidad de pedir',
    'Scorpio':'tu intimidad, confianza y transformación emocional profunda',
    'Escorpio':'tu intimidad, confianza y transformación emocional profunda',
    'Sagittarius':'tu filosofía, dirección de vida y libertad de creer',
    'Sagitario':'tu filosofía, dirección de vida y libertad de creer',
    'Capricorn':'tu relación con la autoridad, el logro y el reconocimiento público',
    'Capricornio':'tu relación con la autoridad, el logro y el reconocimiento público',
    'Aquarius':'tu singularidad, tu lugar en el colectivo y tu originalidad',
    'Acuario':'tu singularidad, tu lugar en el colectivo y tu originalidad',
    'Pisces':'tu conexión espiritual, tus límites y tu sensibilidad',
    'Piscis':'tu conexión espiritual, tus límites y tu sensibilidad'
  };

  const houseMap = {
    1:'en tu identidad y cómo te presentas al mundo',
    2:'en tu relación con los recursos y el valor que te das',
    3:'en tu comunicación, voz y entorno cercano',
    4:'en tus raíces, familia e interior emocional',
    5:'en tu expresión creativa y capacidad de dar amor',
    6:'en tu trabajo cotidiano, salud y servicio',
    7:'en tus relaciones cercanas y compromisos',
    8:'en tu capacidad de transformarte y confiar en profundidad',
    9:'en tu búsqueda de sentido, creencias y libertad',
    10:'en tu misión pública y lo que dejas en el mundo',
    11:'en tu comunidad, amigos y visión de futuro',
    12:'en tu mundo interior, intuición y legado invisible'
  };

  const area = signMap[chiron.sign] || 'tu herida más profunda y transformadora';
  const context = houseMap[chiron.house] || '';

  return {
    area: context ? `${area}, especialmente ${context}` : area,
    patron: `Un patrón repetitivo relacionado con ${area.toLowerCase()}`,
    don: `Una profunda capacidad de sanar en otros exactamente lo que más te costó a ti`
  };
}

// CORRECCIÓN 4: Calcular distribución de energía real desde los elementos
function calculateEnergyDistribution(elements) {
  const { counts } = elements;
  const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;

  // Fuego → Acción, Tierra → Pensamiento/estructura, Aire → Pensamiento/ideas, Agua → Emoción
  // Intuición es función de Agua + Fuego elevados
  const accion = Math.round((counts.Fuego / total) * 100);
  const emocion = Math.round((counts.Agua / total) * 100);
  const pensamiento = Math.round((counts.Aire / total) * 100);
  const intuicion = 100 - accion - emocion - pensamiento;

  return { accion, emocion, pensamiento, intuicion: Math.max(intuicion, 0) };
}

function getDefaultCities(currentCity) {
  return [
    { city: currentCity || 'Tu ciudad', type: 'base', description: 'Tu base de lanzamiento actual' },
    { city: 'Ciudad de México', type: 'career', description: 'Mercado más activo de Latinoamérica' },
    { city: 'Miami', type: 'prosperity', description: 'Capital del mercado latino en EE.UU.' },
    { city: 'Madrid', type: 'love', description: 'Mercado europeo hispanohablante' }
  ];
}

// CORRECCIÓN 1 y 4: Prompt sin valores hardcodeados — Claude genera todo con contexto real
function buildVeRAPrompt({ nombre, fecha, hora, ciudad, ciudadActual, dolor, emocion, relacion, dinero, sunSign, moonSign, elements, chironVERA, nombre72, cities, numerologyData, energyDistribution }) {
  const firstName = nombre.split(' ')[0];
  const horaTexto = hora !== 'no disponible' ? `a las ${hora}` : '(hora no registrada)';

  const citiesText = cities.map((c, i) => `${i+1}. ${c.city} — tipo: ${c.type} — ${c.description}`).join('\n');

  const numerologyText = numerologyData
    ? `\n- Código numerológico: ${JSON.stringify(numerologyData)}`
    : '';

  // Pasamos los porcentajes calculados como REFERENCIA BASE, no como valores fijos
  const energyContext = `Distribución energética calculada desde el perfil de ${firstName}:
  - Fuego/Acción: ${energyDistribution.accion}% | Agua/Emoción: ${energyDistribution.emocion}% | Aire/Pensamiento: ${energyDistribution.pensamiento}% | Intuición: ${energyDistribution.intuicion}%
  (Ajusta estos porcentajes según el análisis cualitativo del perfil completo. No los copies mecánicamente.)`;

  return `Eres VER·A — plataforma de EDUCACIÓN EMOCIONAL PERSONALIZADA en español.
Tu función: generar un perfil profundo, específico y motivador para ${firstName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DE ${firstName.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nombre completo: ${nombre}
Fecha de nacimiento: ${fecha} ${horaTexto}
Ciudad natal: ${ciudad}
Ciudad actual: ${ciudadActual}

CÓDIGO DE ORIGEN (energía solar): ${sunSign}
ENERGÍA LUNAR: ${moonSign || 'no disponible — usa el código solar'}
ELEMENTO DOMINANTE: ${elements.dominant} (puntuación: ${elements.counts[elements.dominant]})
ELEMENTO DÉBIL (área de crecimiento): ${elements.weak} (puntuación: ${elements.counts[elements.weak]})
${energyContext}

FRECUENCIA DE ORIGEN — Código ${nombre72.numero}: "${nombre72.nombre}"

HERIDA ORIGINAL Y DON:
- Área de herida: ${chironVERA.area}
- Patrón que se repite: ${chironVERA.patron}
- Don que emerge al sanar: ${chironVERA.don}
${numerologyText}

CIUDADES CALCULADAS PARA EL MAPA DE LUGARES:
${citiesText}

RESPUESTAS EMOCIONALES DE ${firstName.toUpperCase()}:
- Lo que más le duele: ${dolor || 'no especificado'}
- Su emoción difícil: ${emocion || 'no especificada'}
- Su patrón en relaciones: ${relacion || 'no especificado'}
- Su relación con el dinero: ${dinero || 'no especificada'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS DEL PERFIL VER·A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROHIBIDO usar: planetas, casas, signos zodiacales, carta natal, tránsitos, Kabbalah, astrología, chakras, nombres de signos (Aries, Tauro, Géminis, etc.)
2. VOCABULARIO VER·A OBLIGATORIO:
   - "tu código de origen" (nunca signo solar)
   - "tu equilibrio energético" (nunca balance de elementos)
   - "tu herida original" (nunca Quirón)
   - "tu don transformador" (el regalo de la herida)
   - "tu frecuencia de origen" (nunca nombre angelical o Kabbalah)
   - "tu mapa de lugares" (nunca astrocartografía)
3. INTEGRAR de forma natural y sin citarlos directamente: Dispenza (neurociencia del cambio), Jung (sombra y arquetipo), Neville Goddard (imaginación creadora), Conny Méndez (metafísica práctica), PNL (reencuadre, anclas, submodalidades)
4. Cada sección debe ser ESPECÍFICA para ${firstName} — usar sus respuestas emocionales reales
5. El perfil debe terminar con ${firstName} con ganas de levantarse y hacer algo diferente HOY
6. Tono: directo, cálido, profundo — como alguien que te conoce de verdad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIÓN DE RESPUESTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Responde ÚNICAMENTE con JSON válido. Sin texto antes, sin texto después, sin backticks, sin comentarios.

Estructura exacta requerida:
{
  "opening": "2-3 líneas que golpeen el corazón de ${firstName} — específicas, no genéricas",
  "quien_eres": "párrafo profundo y específico sobre la identidad de ${firstName}",
  "tres_fuerzas": ["fuerza concreta 1", "fuerza concreta 2", "fuerza concreta 3"],
  "energia": {
    "pensamiento": [número entre 0-100 calculado para ${firstName}],
    "emocion": [número entre 0-100 calculado para ${firstName}],
    "accion": [número entre 0-100 calculado para ${firstName}],
    "intuicion": [número entre 0-100, los 4 deben sumar 100],
    "descripcion": "qué significa esta distribución específicamente para ${firstName}"
  },
  "proposito": {
    "pasion": "qué enciende a ${firstName}",
    "talento": "qué hace ${firstName} con facilidad natural",
    "mision": "para qué está aquí ${firstName}",
    "camino": "cómo se ve eso desde ${ciudadActual}",
    "frase": "cita de uno de los autores base que resuene con este propósito"
  },
  "codigo_72": {
    "numero": ${nombre72.numero},
    "nombre": "${nombre72.nombre}",
    "descripcion": "qué significa esta frecuencia para ${firstName} en lenguaje VER·A",
    "bloqueo": "patrón emocional que bloquea esta frecuencia en ${firstName}",
    "don": "cómo se activa este don en la vida cotidiana",
    "afirmacion": "afirmación en primera persona conectada con esta frecuencia"
  },
  "equilibrio": {
    "elemento_debil": "${elements.weak}",
    "descripcion": "qué significa para ${firstName} tener poco de este elemento",
    "practicas": [
      "práctica 1 con base científica específica",
      "práctica 2 de PNL o submodalidades",
      "práctica 3 corporal o sensorial"
    ],
    "frecuencia_hz": "número Hz específico para este elemento",
    "frecuencia_nombre": "nombre de esta frecuencia en VER·A"
  },
  "herida_don": {
    "herida": "cómo se manifiesta la herida específicamente en ${firstName} según sus respuestas",
    "manifestacion": "dónde la ve ${firstName} en su vida real",
    "don": "el poder específico que emerge cuando esto sana",
    "practica_pnl": "técnica PNL concreta con pasos claros",
    "frase": "cita de Jung o Dispenza sobre la transformación de la herida"
  },
  "vinculos": {
    "patron": "patrón específico de ${firstName} en relaciones basado en su respuesta",
    "origen": "de dónde viene este patrón",
    "transformacion": "cómo transformarlo con una técnica concreta",
    "senal": "señal de alerta específica para reconocer el patrón",
    "frase": "cita motivadora sobre relaciones"
  },
  "dinero": {
    "patron": "patrón de ${firstName} con el dinero basado en su respuesta",
    "creencia_raiz": "la creencia instalada que lo genera",
    "transformacion": "reencuadre PNL específico para esta creencia",
    "practica_semana": "acción concreta que puede hacer esta semana"
  },
  "momento_actual": {
    "descripcion": "en qué ciclo de su vida está ${firstName} ahora",
    "oportunidad": "la oportunidad específica de este momento",
    "accion_semana": "una acción muy concreta que puede hacer esta semana",
    "frase": "cita motivadora para este momento"
  },
  "ciudades": [
    {
      "emoji": "📍",
      "ciudad": "${ciudadActual}",
      "titulo": "Donde estás",
      "descripcion": "por qué esta ciudad es importante para ${firstName} ahora mismo"
    },
    {
      "emoji": "🥇",
      "ciudad": "${cities[1]?.city || 'Ciudad de México'}",
      "titulo": "Tu ciudad de prosperidad",
      "descripcion": "por qué esta ciudad específicamente para el perfil de ${firstName}"
    },
    {
      "emoji": "🥈",
      "ciudad": "${cities[2]?.city || 'Miami'}",
      "titulo": "Tu ciudad de expansión",
      "descripcion": "por qué esta ciudad para ${firstName}"
    },
    {
      "emoji": "🥉",
      "ciudad": "${cities[3]?.city || 'Madrid'}",
      "titulo": "Ciudad sorpresa",
      "descripcion": "por qué esta ciudad sorprende para el perfil de ${firstName}"
    }
  ],
  "frecuencias": [
    {"cuando": "situación específica de ${firstName}", "hz": "frecuencia recomendada en Hz"},
    {"cuando": "situación específica de ${firstName}", "hz": "frecuencia recomendada en Hz"},
    {"cuando": "situación específica de ${firstName}", "hz": "frecuencia recomendada en Hz"},
    {"cuando": "situación específica de ${firstName}", "hz": "frecuencia recomendada en Hz"},
    {"cuando": "situación específica de ${firstName}", "hz": "frecuencia recomendada en Hz"}
  ],
  "practica_diaria": {
    "gratitud": "pregunta de gratitud específica para ${firstName} — no genérica",
    "conexion": "afirmación de conexión con lo más grande — sin religión, sin nombres divinos",
    "emocion_hoy": "pregunta de inteligencia emocional específica para ${firstName}"
  },
  "pasos_esta_semana": [
    "paso 1 muy concreto y alcanzable",
    "paso 2 muy concreto y alcanzable",
    "paso 3 muy concreto y alcanzable"
  ],
  "frase_final": "frase única e irrepetible escrita solo para ${firstName}",
  "pregunta_transformadora": "la pregunta que puede cambiar algo en la vida de ${firstName} esta semana"
}`;
}
