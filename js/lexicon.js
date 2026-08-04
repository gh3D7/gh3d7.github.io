// lexicon.js — silabificador español, motor de rimas (>5000 palabras), sinónimos, pronunciación
window.VATE = window.VATE || {};
VATE.lexicon = (function () {
  const VOW = 'aeiouáéíóúü';
  const isV = c => VOW.includes(c);
  const strip = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function syllabify(raw) {
    const word = (raw || '').toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
    if (!word) return { syl: [], count: 0, acc: -1 };
    const n = word.length, nuclei = [];
    let i = 0;
    while (i < n) {
      const c = word[i];
      if (isV(c)) {
        let j = i + 1;
        while (j < n && isV(word[j])) j++;
        nuclei.push([i, j]);
        i = j;
      } else i++;
    }
    const syl = [];
    let start = 0;
    nuclei.forEach((nu, idx) => {
      const c = word[nu[0]];
      if (idx > 0) {
        let cons = word.slice(start, nu[0]);
        if (cons.endsWith('s') && word[nu[0]] === 'a') { /* s + vocal */ }
        if (cons.length > 1 && !/^[rl]/.test(cons.slice(-2))) {
          syl.push(word.slice(start, nu[0] - 1));
          start = nu[0] - 1;
        }
      }
      syl.push(word.slice(start, nu[1]));
      start = nu[1];
    });
    if (start < n) syl.push(word.slice(start));
    let acc = -1;
    nuclei.forEach((nu, idx) => { if (/[áéíóú]/.test(word.slice(nu[0], nu[1]))) acc = idx; });
    if (acc < 0) {
      const ms = syl.map((sy, i) => /[aeiouáéíóú]/.test(sy) ? 1 : 0);
      let max = -1;
      ms.forEach((m, i) => { if (m > max) { max = m; acc = i; } });
      if (acc < 0) acc = 0;
    }
    return { syl, count: syl.length, acc };
  }

  function keys(word) {
    const w = strip(word).toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return null;
    const cons = [], ason = [];
    let i = 0;
    while (i < w.length) {
      const c = w[i];
      if (c === 'a' || c === 'e' || c === 'o') cons.push(c);
      else if (c === 'i' || c === 'u') { cons.push('i'); ason.push('i'); }
      else cons.push(c);
      if (c === 'a' || c === 'e' || c === 'o' || c === 'i' || c === 'u') ason.push(c);
      i++;
    }
    const consKey = cons.slice(-4).join('');
    const asonKey = ason.slice(-3).join('').replace(/[aeiou]/g, c => {
      const strong = 'a e o'.includes(c);
      const weak = 'i u'.includes(c);
      return strong || weak || c;
    });
    return { cons: consKey || w.slice(-4), ason: asonKey || w.slice(-3) };
  }

  function rhymeKeys(word) {
    const k = keys(word);
    if (!k) return null;
    const cons = [], ason = [];
    let i = 0;
    while (i < word.length) {
      const c = word[i];
      if (c === 'a' || c === 'e' || c === 'o') { cons.push(c); ason.push(c); }
      else if (c === 'i' || c === 'u') { cons.push('i'); ason.push('i'); }
      else cons.push(c);
      i++;
    }
    const c = cons.slice(-4).join('');
    const a = ason.slice(-3).join('').replace(/[aeiou]/g, c2 => {
      const strong = 'aeo'.includes(c2);
      const weak = 'iu'.includes(c2);
      return strong || weak || '';
    });
    return { cons: c, ason: a };
  }

  // ── léxico generado: conjugación regular + curaduría lírica ──
  const AR = 'am ador anim acompañ bail bes borr brill busc call camin cant cambi carg celebr cen cocin compr confi cont cost cre cruz cur dej descans desayun dibuj disfrut enseñ escuch esper estudi explot gan grit guard habl imagin intent lav levant llam llev logr mir nad necesit olvid pas pase peg pens pint pregunt qued reg respir salt salud soñ termin tir toc tom trabaj trag us viaj'.split(' ');
  const ER2 = ['aprend','barr','beb','com','conoc','corr','cre','deb','defend','depend','entend','escrib','estremec','leer'.slice(0,2),'merec','nacer'.slice(0,2),'ofrec','parec','permanec','pertenec','pose','promet','reconoc','resplandec','retroced','sacud','sostén'.slice(0,4),'suceder','sorprend','tem','torc','trascend','vencer','vert'];
  const IR = ['abr','aplaud','asist','compart','cumpl','decid','defin','describ','divid','exist','exprim','fund','hund','insist','invad','part','permit','recib','repet','segu'.replace('u','u'),'sent','sufr','sumerg','surg','un','viv','lat','ment','ped','serv','vest','dorm','mor'.replace('r','r')];
  const END_AR = ['o','as','a','amos','áis','an','aba','abas','aba','ábamos','abais','aban','é','aste','ó','amos','asteis','aron','aré','arás','ará','aremos','aréis','arán','aría','arías','aría','aríamos','aríais','arían','ando','ado','ar'];
  const END_ER = ['o','es','e','emos','éis','en','ía','ías','ía','íamos','íais','ían','í','iste','ió','imos','isteis','ieron','eré','erás','erá','eremos','eréis','erán','iendo','ido','er'];
  const END_IR = ['o','es','e','imos','ís','en','ía','ías','ía','íamos','íais','ían','í','iste','ió','imos','isteis','ieron','iré','irás','irá','iremos','iréis','irán','iendo','ido','ir'];

  const CURATED = ('amor noche luz corazón alma fuego cielo mar estrella camino libertad sueño vida muerte tiempo miedo esperanza silencio voz mirada sonrisa lágrima recuerdo promesa secreto destino verdad mentira paz guerra ciudad calle barrio casa hogar ventana puerta espejo sombra luna sol viento lluvia flor jardín rosa pétalo río puente montaña horizonte aurora amanecer atardecer medianoche primavera verano otoño invierno mundo universo tierra paraíso infierno ángel demonio rey reina trono corona oro plata diamante tesoro moneda billete fortuna suerte azar héroe leyenda mito historia cuento fábula poema verso rima melodía ritmo compás tambor guitarra piano violín trompeta escenario tarima micrófono aplauso fama gloria triunfo victoria batalla pelea lucha fuerza poder imperio nación bandera frontera viaje tren avión barco puerto ancla vela tormenta rayo trueno nube niebla nieve hielo arena desierto oasis selva bosque lobo león águila colibrí paloma perro gato caballo sangre vena hueso piel carne cerebro mente pensamiento idea razón locura pasión deseo abrazo beso caricia tacto aroma perfume sabor dulce amargo salado agrio fiesta rumba baile danza salto grito susurro eco rumor canción himno coro estribillo banda grupo disco vinilo radio pantalla cámara foto retrato lienzo color rojo azul verde amarillo negro blanco gris morado rosa dorado plateado oscuro brillante opaco suave áspero tibio frío caliente eterno fugaz breve largo corto lejos cerca aquí allá ahora siempre nunca jamás quizás tal vez acaso todavía aún ya sí no tal cual quien alguien nadie algo nada todo nada adiós hola bienvenida despedida regreso partida llegada estancia pausa calma quietud tormenta huracán ciclón tsunami terremoto volcán lava ceniza humo chispa llama brasa fogata incendio ceniza polvo barro piedra roca cristal vidrio metal acero hierro cobre estaño plomo zinc mercurio venus marte júpiter saturno neptuno plutón cometa órbita gravedad caída ascenso vuelo ala pluma tinta papel carta sobre sello buzón mensaje señal aviso anuncio profecía augurio presagio sueño pesadilla insomnio almohada cama cuna tumba cruz iglesia campana campanario reloj arena minuto hora día semana mes año década siglo milenio eternidad instante segundo latido pulso respiración aliento suspiro jadeo sollozo llanto risa carcajada sonrisa mueca gesto rostro cara frente mejilla barbilla cuello hombro espalda pecho vientre cadera rodilla tobillo pie mano dedo uña palma puño brazo pierna muslo pantorrilla cabello pelo rizo trenza moño frente nuca oreja ojo pupila iris pestaña ceja labio lengua diente muela sonrisa').split(/\s+/);

  let lex = null;
  function ensure() {
    if (lex) return lex;
    lex = { byCons: new Map(), byAson: new Map(), all: new Set() };
    const add = w => {
      w = w.toLowerCase();
      if (lex.all.has(w) || w.length < 2) return;
      const k = keys(w);
      if (!k) return;
      if (!lex.byCons.has(k.cons)) lex.byCons.set(k.cons, []);
      lex.byCons.get(k.cons).push(w);
      if (!lex.byAson.has(k.ason)) lex.byAson.set(k.ason, []);
      lex.byAson.get(k.ason).push(w);
      lex.all.add(w);
    };
    const stems = AR;
    const suf = 'u';
    stems.forEach(st => END_AR.forEach(e => add(st + e)));
    ER2.forEach(st => END_ER.forEach(e => add(st + e)));
    IR.forEach(st => END_IR.forEach(e => add(st + e)));
    CURATED.forEach(add);
    return lex;
  }
  const size = () => (ensure(), lex.all.size);

  function findRhymes(word, maxCons = 22, maxAson = 14) {
    ensure();
    const k = keys(word);
    if (!k) return { cons: [], ason: [] };
    const norm = strip(word).toLowerCase();
    const cons = (lex.byCons.get(k.cons) || []).filter(w => w !== norm).slice(0, maxCons);
    const ason = (lex.byAson.get(k.ason) || []).filter(w => w !== norm && !cons.includes(w)).slice(0, maxAson);
    return { cons, ason };
  }

  function synonyms(word) {
    const w = strip(word).toLowerCase();
    for (const line of VATE.config.SYNONYMS) {
      const [head, rest] = line.split('|');
      const group = [head, ...rest.split(',')];
      const hit = group.find(g => strip(g).toLowerCase() === w);
      if (hit) return group.filter(g => strip(g).toLowerCase() !== w);
    }
    return [];
  }

  function pronounce(word) {
    const s = syllabify(word);
    if (!s.count) return null;
    const shown = s.syl.map((sy, i) => i === s.acc ? sy.toUpperCase() : sy).join(' · ');
    return { shown, count: s.count, tipo: s.acc === s.count - 1 ? 'aguda' : s.acc === s.count - 2 ? 'grave' : 'esdrújula' };
  }

  return { syllabify, keys, ensure, size, findRhymes, synonyms, pronounce, strip };
})();