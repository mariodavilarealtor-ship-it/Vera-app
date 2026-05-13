export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nombre, email, fecha, hora, ciudad, ciudadActual, dolor, emocion, relacion, dinero } = req.body;

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

    try {
      const chartResp = await fetch(`${baseUrl}/natal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin, latitude: coords.lat, longitude: coords.lng, house_system: 'placidus' })
      });
      if (chartResp.ok) chartData = await chartResp.json();
    } catch(e) { console.log('Chart API error:', e.message); }

    try {
      const astroResp = await fetch(`${baseUrl}/astrocartography/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin, latitude: coords.lat, longitude: coords.lng, limit: 5 })
      });
      if (astroResp.ok) astrocartoData = await astroResp.json();
    } catch(e) { console.log('Astrocarto error:', e.message); }

    try {
      const kabResp = await fetch(`${baseUrl}/kabbalah/birth-angels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ day, month, year, hour: birthHour, minute: birthMin })
      });
      if (kabResp.ok) kabbalaData = await kabResp.json();
    } catch(e) { console.log('Kabbalah error:', e.message); }

    try {
      const numResp = await fetch(`${baseUrl}/numerology/kabbalah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ name: nombre })
      });
      if (numResp.ok) numerologyData = await numResp.json();
    } catch(e) { console.log('Numerology error:', e.message); }

    const elements = chartData ? getElementsFromChart(chartData) : getElementsFromSign(day, month);
    const sunSign = chartData?.planets?.find(p => p.name === 'Sun')?.sign || getSunSign(day, month);
    const moonSign = chartData?.planets?.find(p => p.name === 'Moon')?.sign || null;
    const chiron = chartData?.planets?.find(p => p.name === 'Chiron') || null;
    const nombre72 = kabbalaData?.primary_angel || get72NameFallback(day, month, year);
    const cities = astrocartoData?.cities || getDefaultCities(ciudadActual);

    const prompt = buildVeRAPrompt({ nombre, fecha: `${day}/${month}/${year}`, hora: hora || 'no disponible', ciudad, ciudadActual, dolor, emocion, relacion, dinero, sunSign, moonSign, elements, chiron, nombre72, cities, numerologyData });

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });

    const claudeData = await claudeResp.json();
    const text = claudeData.content.map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const report = JSON.parse(clean);
    report._meta = { nombre72, elements, cities, hasChart: !!chartData, hasKabbalah: !!kabbalaData, hasAstrocarto: !!astrocartoData };

    res.status(200).json(report);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getCityCoords(cityName) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, { headers: { 'User-Agent': 'VER-A-App/1.0' } });
    const data = await resp.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch(e) {}
  return { lat: 10.4806, lng: -66.9036 };
}

function getElementsFromChart(chartData) {
  const elementMap = { 'Aries':'Fuego','Leo':'Fuego','Sagittarius':'Fuego','Sagitario':'Fuego','Taurus':'Tierra','Virgo':'Tierra','Capricorn':'Tierra','Capricornio':'Tierra','Tauro':'Tierra','Gemini':'Aire','Libra':'Aire','Aquarius':'Aire','Acuario':'Aire','Geminis':'Aire','Cancer':'Agua','Scorpio':'Agua','Pisces':'Agua','Escorpio':'Agua','Piscis':'Agua' };
  const counts = { Fuego:0, Tierra:0, Aire:0, Agua:0 };
  const weights = { Sun:3, Moon:3, Mercury:2, Venus:2, Mars:2, Jupiter:1, Saturn:1 };
  chartData.planets?.forEach(p => { const e = elementMap[p.sign]; if(e) counts[e] += (weights[p.name]||1); });
  const dominant = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  const weak = Object.entries(counts).sort((a,b)=>a[1]-b[1])[0][0];
  return { counts, dominant, weak };
}

function getElementsFromSign(day, month) {
  const sign = getSunSign(day, month);
  const fire = ['Aries','Leo','Sagitario'].includes(sign);
  const earth = ['Tauro','Virgo','Capricornio'].includes(sign);
  const air = ['Geminis','Libra','Acuario'].includes(sign);
  const dominant = air?'Aire':fire?'Fuego':earth?'Tierra':'Agua';
  const all = ['Fuego','Tierra','Aire','Agua'];
  const weak = all.filter(e=>e!==dominant)[1];
  return { dominant, weak, counts:{Fuego:3,Tierra:1,Aire:3,Agua:2} };
}

function getSunSign(day, month) {
  const signs = [[20,'Capricornio'],[19,'Acuario'],[20,'Piscis'],[20,'Aries'],[21,'Tauro'],[21,'Geminis'],[23,'Cancer'],[23,'Leo'],[23,'Virgo'],[23,'Libra'],[22,'Escorpio'],[22,'Sagitario']];
  return day <= signs[month-1][0] ? signs[month-1][1] : signs[month%12][1];
}

function get72NameFallback(day, month, year) {
  const date = new Date(year, month-1, day);
  const start = new Date(year, 0, 1);
  const num = ((Math.floor((date-start)/86400000))%72)+1;
  const names = {1:'El Sanador del Pasado',2:'La Esperanza Restaurada',3:'El Creador de Milagros',4:'El Canal de Prosperidad',5:'El Sanador del Cuerpo',6:'El Liberador de Cadenas',7:'El Puente con lo Divino',8:'El Escudo de Luz',9:'El Portador de Sabiduría',10:'El Soltador del Pasado',11:'El Amor Incondicional',12:'El Revertidor del Destino',13:'El Unificador',14:'El Perdonador',15:'El Rendidor al Bien',16:'El Abundante en lo Cotidiano',17:'El Equilibrador',18:'El Creativo Fértil',19:'El Materializador de Sueños',20:'El Despertador',21:'El Compasivo',22:'El Retornador',23:'La Abundancia Total',24:'El Purificador',25:'El Conector Sagrado',26:'El Ordenador del Caos',27:'El Socio Silencioso',28:'El Alma Gemela',29:'El Revelador del Propósito',30:'El Unidor de Almas',31:'El Completador',32:'El Triunfador',33:'El Revelador de Sombras',34:'El Transformador del Dolor',35:'El Liberador del Miedo',36:'El Sanador Profundo',37:'El Vidente',38:'El Eterno',39:'El Domador del Ego',40:'El Próspero Sostenido',41:'El Invencible',42:'El Expansor',43:'El Viajero del Alma',44:'El Descansador',45:'El Unificador de Opuestos',46:'El Recto Próspero',47:'El Retornador a Raíces',48:'El Portador de Verdad',49:'El Liberador de la Ira',50:'El Renovador',51:'El Ordenador',52:'El Orador Sagrado',53:'El Transformador del Odio',54:'El Aliviador',55:'El Manifestador',56:'El Pacificador',57:'El Escuchador Interior',58:'El Unificador del Ser',59:'El Revelador de Verdad',60:'El Vitalizador',61:'El Multiplicador',62:'El Pacífico',63:'El Orden en el Caos',64:'El Descansador del Alma',65:'El Maestro',66:'El Ordenador Universal',67:'El Amor Puro',68:'El Liberador de Vergüenza',69:'El Liberador del Karma',70:'El Despertador Espiritual',71:'El Conector Divino',72:'El Agradecido Total'};
  return { numero: num, nombre: names[num]||'El Transformador' };
}

function getDefaultCities(currentCity) {
  return [
    {city:currentCity||'Tu ciudad',type:'base',description:'Tu base de lanzamiento'},
    {city:'Ciudad de México',type:'career',description:'Mercado más activo de Latinoamérica'},
    {city:'Miami',type:'prosperity',description:'Capital del mercado latino en EE.UU.'},
    {city:'Madrid',type:'love',description:'Mercado europeo hispanohablante'}
  ];
}

function buildVeRAPrompt({ nombre, fecha, hora, ciudad, ciudadActual, dolor, emocion, relacion, dinero, sunSign, moonSign, elements, chiron, nombre72, cities, numerologyData }) {
  const firstName = nombre.split(' ')[0];
  return `Eres VER·A — plataforma de EDUCACION EMOCIONAL PERSONALIZADA. Genera un perfil completo en español para ${firstName}.

DATOS:
- Nombre: ${nombre} | Nacimiento: ${fecha} ${hora!=='no disponible'?`a las ${hora}`:'(hora no disponible)'} | Ciudad natal: ${ciudad} | Ciudad actual: ${ciudadActual}
- Codigo de origen: ${sunSign} | Luna: ${moonSign||'no disponible'} | Elemento dominante: ${elements.dominant} | Elemento debil (area de crecimiento): ${elements.weak}
- Frecuencia de origen codigo ${nombre72.numero}: ${nombre72.nombre}
- Herida original: ${chiron?`${chiron.sign} Casa ${chiron.house}`:'generacion 1976-1993 Tauro/Geminis'}
${numerologyData?`- Numerologia: ${JSON.stringify(numerologyData)}`:''}

CIUDADES CALCULADAS:
${cities.map((c,i)=>`${i+1}. ${c.city} — ${c.type}: ${c.description}`).join('\n')}

RESPUESTAS EMOCIONALES:
- Cuando duele: ${dolor} | Emocion dificil: ${emocion} | Patron relaciones: ${relacion} | Relacion dinero: ${dinero}

REGLAS ABSOLUTAS:
1. NUNCA uses: planetas, casas, signos zodiacales, carta natal, transitos, Kabbalah, astrologia, nombres de signos (Aries, Tauro, etc), chakras
2. USA SIEMPRE: "tu codigo de origen", "tu equilibrio energetico", "tu herida original", "tu don transformador", "tu frecuencia de origen", "tu mapa de lugares"
3. Integra: Dispenza, Jung, Neville Goddard, Conny Mendez, PNL con tecnicas concretas
4. El perfil debe terminar con ${firstName} MOTIVADO/A para actuar HOY
5. Tono: directo, calido, profundo, sin esoterismos visibles

Responde SOLO con JSON valido sin texto antes ni despues sin backticks:
{"opening":"2-3 lineas que golpeen al corazon de ${firstName}","quien_eres":"parrafo especifico para esta persona","tres_fuerzas":["fuerza 1","fuerza 2","fuerza 3"],"energia":{"pensamiento":40,"emocion":30,"accion":20,"intuicion":10,"descripcion":"texto especifico"},"proposito":{"pasion":"texto","talento":"texto","mision":"texto","camino":"texto considerando ${ciudadActual}","frase":"cita"},"codigo_72":{"numero":${nombre72.numero},"nombre":"${nombre72.nombre}","descripcion":"parrafo profundo en lenguaje VER.A","bloqueo":"patron emocional","don":"como se activa","afirmacion":"en primera persona"},"equilibrio":{"elemento_debil":"${elements.weak}","descripcion":"que significa para ${firstName}","practicas":["practica 1 con base cientifica","practica 2 PNL","practica 3 cuerpo"],"frecuencia_hz":"hz","frecuencia_nombre":"nombre"},"herida_don":{"herida":"especifica para ${firstName} basada en respuestas","manifestacion":"como se ve en su vida","don":"el poder que emerge","practica_pnl":"tecnica concreta","frase":"cita de Jung o Dispenza"},"vinculos":{"patron":"especifico basado en ${relacion}","origen":"de donde viene","transformacion":"como transformarlo","senal":"senal de alerta","frase":"cita"},"dinero":{"patron":"especifico basado en ${dinero}","creencia_raiz":"la creencia instalada","transformacion":"reencuadre PNL","practica_semana":"accion concreta"},"momento_actual":{"descripcion":"ciclo actual","oportunidad":"oportunidad especifica","accion_semana":"accion muy concreta","frase":"cita motivadora"},"ciudades":[{"emoji":"📍","ciudad":"${ciudadActual}","titulo":"Donde estas","descripcion":"por que es poderosa para ${firstName}"},{"emoji":"🥇","ciudad":"${cities[1]?.city||'Ciudad de Mexico'}","titulo":"Tu ciudad de prosperidad","descripcion":"por que especificamente"},{"emoji":"🥈","ciudad":"${cities[2]?.city||'Miami'}","titulo":"Tu ciudad de expansion","descripcion":"por que"},{"emoji":"🥉","ciudad":"${cities[3]?.city||'Madrid'}","titulo":"Ciudad sorpresa","descripcion":"por que sorprende"}],"frecuencias":[{"cuando":"situacion 1","hz":"hz"},{"cuando":"situacion 2","hz":"hz"},{"cuando":"situacion 3","hz":"hz"},{"cuando":"situacion 4","hz":"hz"},{"cuando":"situacion 5","hz":"hz"}],"practica_diaria":{"gratitud":"pregunta especifica para ${firstName}","conexion":"afirmacion universal sin religion","emocion_hoy":"pregunta de inteligencia emocional"},"pasos_esta_semana":["paso 1 concreto","paso 2 concreto","paso 3 concreto"],"frase_final":"frase unica e irrepetible para ${firstName}","pregunta_transformadora":"pregunta que cambie algo esta semana"}`;
}
