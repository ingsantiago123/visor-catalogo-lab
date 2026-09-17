// programa-main.js — visor/programa.html (Pantalla 2: elegir programa/carrera)
//
// CERO fetch(). Sigue leyendo el MISMO window.name que dejó index.html (la
// raíz del sitio) con el array completo de Datos/General-labs.json — nadie
// lo tocó entre la pantalla 1 y esta, así que sigue ahí. La lista de los 14
// programas no viene de Datos/Programas.json (ese archivo ya no se usa en
// la cadena real): se DERIVA acá mismo, recorriendo el campo "Programa(s)"
// de cada laboratorio y sacando los valores únicos.
//
// Esta misma pantalla sirve tanto a Externos como a Vivos: ?coleccion=vivo
// en la URL (lo pone visor/index.html al armar el link "Ingresar" de la
// tarjeta Vivos) hace que acá se filtre el array por tipo:'vivo' en vez de
// tipo:'externo', y que el payload armado para catalogo.html tenga items
// tipo:'vivo' en vez de tipo:'laboratorio'. Los laboratorios históricos de
// Datos/General-labs.json no traen 'tipo' — se tratan como 'externo' por
// compatibilidad (ver README.md).
//
// Recién al elegir un programa se arma el JSON con el contrato de datos del
// visor (ver visor-instrucciones.md) y se deja en window.name antes de
// navegar a catalogo.html — ese archivo (el "visor puro") tampoco toca la
// red nunca.

const COLECCION = new URLSearchParams(location.search).get('coleccion') === 'vivo' ? 'vivo' : 'externo';

const TEXTOS_COLECCION = {
  externo: {
    tituloDoc: 'Laboratorios Externos & Convenios - Selección de Programa (U.INCCA)',
    topBadgeTexto: 'Red de Convenios & Plataformas Externas • Acceso Remoto',
    heroBadgeIcono: 'fa-network-wired',
    heroBadgeTexto: 'Convenios Interinstitucionales, Simuladores & Nube',
    heroTituloPalabra: 'Externos',
    heroDescripcion: 'Plataformas, simuladores en la nube y bancos experimentales operados por entidades aliadas, redes académicas y convenios internacionales. Selecciona tu programa para acceder a las herramientas externas autorizadas.',
    trustTexto: 'Plataformas externas con autenticación y licenciamiento gestionado por convenios interinstitucionales • 2025'
  },
  vivo: {
    tituloDoc: 'Laboratorios Vivos - Selección de Programa (U.INCCA)',
    topBadgeTexto: 'Videoteca de Prácticas de Laboratorio • Consulta Asincrónica',
    heroBadgeIcono: 'fa-video',
    heroBadgeTexto: 'Videoteca de Prácticas · Estudio Asincrónico',
    heroTituloPalabra: 'Vivos',
    heroDescripcion: 'Prácticas de laboratorio grabadas en la universidad para consulta y estudio asincrónico (no son transmisiones en vivo). Selecciona tu programa para ver la videoteca disponible.',
    trustTexto: 'Grabaciones propias de la universidad, organizadas por programa académico • 2025'
  }
};

function aplicarTextosColeccion() {
  const t = TEXTOS_COLECCION[COLECCION];
  document.title = t.tituloDoc;
  const set = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
  set('topBadgeText', t.topBadgeTexto);
  set('heroBadgeText', t.heroBadgeTexto);
  set('heroTitleWord', t.heroTituloPalabra);
  set('heroDescription', t.heroDescripcion);
  set('trustText', t.trustTexto);
  const icono = document.getElementById('heroBadgeIcon');
  if (icono) icono.className = `fa-solid ${t.heroBadgeIcono} text-black`;
}

// Íconos representativos por programa (fallback genérico si no hay coincidencia)
const ICONOS_PROGRAMA = {
  'Administración de Empresas': 'fa-briefcase',
  'Biología': 'fa-dna',
  'Contaduría Pública': 'fa-file-invoice-dollar',
  'Cultura Física y Deporte': 'fa-person-running',
  'Derecho': 'fa-scale-balanced',
  'Esp. Gestión Agroindustrial': 'fa-seedling',
  'Esp. Gestión Ambiental': 'fa-leaf',
  'Esp. Gestión de la Producción Sostenible': 'fa-recycle',
  'Ingeniería de Alimentos': 'fa-utensils',
  'Ingeniería de Sistemas': 'fa-cloud-nodes',
  'Ingeniería Electrónica': 'fa-microchip',
  'Ingeniería Industrial': 'fa-industry',
  'Ingeniería Mecánica': 'fa-cubes-stacked',
  'Música': 'fa-music'
};
const ICONO_DEFAULT = 'fa-flask-vial';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Clave de sessionStorage: un eco LOCAL de esta pestaña, no una fuente de
// datos nueva. window.name sigue siendo el único origen real — esto es
// solo para no perderlo cuando catalogo.html lo sobreescribe con SU propio
// payload al ir para adelante (ver "Volver" en visor/README.md).
const CLAVE_RESPALDO = 'labExternosDatos';

// Lee el array crudo de laboratorios. Primero intenta window.name (canal
// principal); si no tiene la forma esperada (por ejemplo, al volver desde
// catalogo.html, que ya lo sobreescribió con el payload de un programa
// específico), recurre al respaldo en sessionStorage de esta misma
// pestaña — nunca a una red ni a un archivo nuevo. null si ninguno sirve.
function leerEntrada() {
  try {
    if (window.name) {
      const data = JSON.parse(window.name);
      if (Array.isArray(data)) {
        try { sessionStorage.setItem(CLAVE_RESPALDO, window.name); } catch (e) { /* sin storage disponible, no pasa nada */ }
        return data;
      }
    }
  } catch (e) { /* window.name corrupto: seguimos al respaldo */ }

  try {
    const respaldo = sessionStorage.getItem(CLAVE_RESPALDO);
    if (respaldo) {
      const data = JSON.parse(respaldo);
      if (Array.isArray(data)) {
        window.name = respaldo; // lo dejamos consistente para la próxima lectura
        return data;
      }
    }
  } catch (e) { /* tampoco había respaldo usable */ }

  return null;
}

// El payload (los 132 laboratorios completos) pesa varios cientos de KB, así
// que en vez de resignarse apenas se pinta la página, reintenta un ratito
// antes de mostrar el estado "sin datos" — detecta el momento en que
// window.name queda configurado, en vez de mirarlo una sola vez.
function esperarDatos(leer, alListo, alFallar) {
  const INTERVALO_MS = 100;
  const MAX_ESPERA_MS = 1200;
  const inicio = Date.now();

  (function intentar() {
    const datos = leer();
    if (datos) {
      alListo(datos);
      return;
    }
    if (Date.now() - inicio >= MAX_ESPERA_MS) {
      alFallar();
      return;
    }
    setTimeout(intentar, INTERVALO_MS);
  })();
}

// Solo los laboratorios de la colección elegida (Externos o Vivos). Los
// registros históricos de Datos/General-labs.json no traen 'tipo' — se
// cuentan como 'externo' por compatibilidad (ver README.md).
function filtrarPorColeccion(laboratorios) {
  if (COLECCION === 'vivo') return laboratorios.filter(lab => lab && lab.tipo === 'vivo');
  return laboratorios.filter(lab => lab && (lab.tipo === 'externo' || lab.tipo === undefined));
}

// Todos los programas a los que aplica un laboratorio. Los registros
// históricos (sin 'tipo') traen varios programas juntos en "Programa(s)";
// el esquema nuevo (con 'tipo') trae un único "programa" por ítem — se
// separa igual por coma/punto y coma por si algún día trae más de uno.
function programasDeLab(lab) {
  const fuente = lab.tipo ? (lab.programa || '') : (lab['Programa(s)'] || '');
  return fuente
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(Boolean);
}

function construirTarjetaPrograma(programa, laboratorios) {
  const icono = ICONOS_PROGRAMA[programa] || ICONO_DEFAULT;
  const totalLabs = laboratorios.length;
  const unidad = COLECCION === 'vivo' ? 'Video' : 'Laboratorio';
  const textoConteo = `${totalLabs} ${unidad}${totalLabs === 1 ? '' : 's'} Disponible${totalLabs === 1 ? '' : 's'}`;

  let textoDescripcion;
  if (COLECCION === 'vivo') {
    const materias = [];
    laboratorios.forEach(lab => {
      const materia = (lab.materia || '').trim();
      if (materia && !materias.includes(materia)) materias.push(materia);
    });
    textoDescripcion = materias.length
      ? `Videoteca de prácticas de: ${materias.join(', ')}. Entra para ver las grabaciones disponibles.`
      : 'Próximamente encontrarás aquí prácticas grabadas disponibles para este programa.';
  } else {
    // Orígenes / plataformas únicos de los laboratorios de este programa
    const origenes = [];
    laboratorios.forEach(lab => {
      const origen = (lab['Origen / Plataforma'] || lab.docenteFuente || '').trim();
      if (origen && !origenes.includes(origen)) origenes.push(origen);
    });
    textoDescripcion = origenes.length
      ? `En este programa puedes encontrar laboratorios de: ${origenes.join(', ')}. Entra para descubrir qué ofrecemos.`
      : 'Próximamente encontrarás aquí laboratorios externos disponibles para este programa.';
  }

  return `
      <div class="bg-white border-2 border-black rounded-xl p-6 flex flex-col justify-between text-black transition-none">
        <div>
          <div class="flex items-center justify-between mb-5">
            <div class="w-12 h-12 rounded-lg bg-white border-2 border-black text-black flex items-center justify-center text-xl">
              <i class="fa-solid ${icono}"></i>
            </div>
            <span class="px-3 py-1 rounded-md bg-white border-2 border-black text-black text-xs font-bold uppercase">Programas</span>
          </div>
          <h2 class="text-xl font-bold text-black mb-2">${escapeHtml(programa)}</h2>
          <p class="text-black text-sm leading-relaxed mb-6 font-normal">${escapeHtml(textoDescripcion)}</p>
        </div>
        <div class="pt-4 border-t-2 border-black flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-black font-semibold"><i class="fa-solid ${COLECCION === 'vivo' ? 'fa-circle-play' : 'fa-flask-vial'}"></i><span>${textoConteo}</span></div>
          <a class="inline-flex items-center gap-1.5 font-bold text-black hover:underline" href="catalogo.html" data-programa="${escapeHtml(programa)}"><span>Ingresar</span><i class="fa-solid fa-chevron-right text-[11px]"></i></a>
        </div>
      </div>`;
}

// Convierte los labs (tal cual vienen de General-labs.json, o del esquema
// nuevo con 'tipo') al contrato de datos del visor (ver visor/README.md):
// objeto raíz + items[] tipados. Esto es lo único que catalogo.html
// recibe — nunca ve el JSON crudo.
function construirPayloadVisorVivo(programa, laboratorios) {
  const materias = [];
  laboratorios.forEach(lab => {
    const materia = (lab.materia || '').trim();
    if (materia && !materias.includes(materia)) materias.push(materia);
  });
  const descripcion = materias.length
    ? `Videoteca de prácticas grabadas de ${programa}: ${materias.join(', ')}. Selecciona cualquiera para ver el video completo.`
    : '';

  return {
    titulo: `Laboratorios Vivos de ${programa}`,
    subtitulo: 'Videoteca de Prácticas de Laboratorio',
    descripcion,
    volver_url: 'programa.html?coleccion=vivo',
    pie: 'Laboratorios vivos grabados en la universidad • Universidad INCCA de Colombia',
    items: laboratorios.map((lab, idx) => ({
      id: `vivo-${Number.isFinite(lab.item) ? lab.item : idx + 1}`,
      tipo: 'vivo',
      visible: true,
      orden: idx,
      item: lab.item,
      nombre: lab.nombre || '',
      programa: lab.programa || '',
      materia: lab.materia || '',
      transversalidad: lab.transversalidad || '',
      descripcion: lab.descripcion || '',
      videoUrl: lab.videoUrl || '',
      docenteFuente: lab.docenteFuente || ''
    }))
  };
}

function construirPayloadVisorExterno(programa, laboratorios) {
  return {
    titulo: `Laboratorios de ${programa}`,
    subtitulo: 'Red de Convenios & Plataformas Externas',
    descripcion: '',
    volver_url: 'programa.html',
    items: laboratorios.map((lab, idx) => ({
      // Prefijo distinto por rama de origen ('lab-' vs 'lab-item-'): un
      // laboratorio nuevo (esquema con 'tipo', identificado por 'item') y uno
      // histórico (identificado por "No.") pueden compartir el mismo número
      // de posición dentro de ESTE programa filtrado — con un solo prefijo
      // ambos calculan el mismo id y el modal abriría el ítem equivocado.
      id: Number.isFinite(lab['No.'])
        ? `lab-${lab['No.']}`
        : (Number.isFinite(lab.item) ? `lab-item-${lab.item}` : `lab-idx-${idx + 1}`),
      tipo: 'laboratorio',
      visible: true,
      orden: idx,
      nombre: lab['Nombre del Laboratorio'] || lab.nombre || '',
      categoria: lab['Categoría'] || '',
      origen: lab['Origen / Plataforma'] || lab.docenteFuente || '',
      aplicaA: lab['Aplica a'] || lab.transversalidad || '',
      descripcion: lab['Descripción '] || lab.descripcion || '',
      materias: lab['Materias'] || '',
      modalidad: lab['Compatible con Moodle'] || '',
      costo: lab['Costo'] || '',
      link: lab['Link del Recurso'] || '',
      imagen: lab['imagen'] || ''
    }))
  };
}

function construirPayloadVisor(programa, laboratorios) {
  return COLECCION === 'vivo'
    ? construirPayloadVisorVivo(programa, laboratorios)
    : construirPayloadVisorExterno(programa, laboratorios);
}

function renderCargando() {
  document.getElementById('programsGrid').innerHTML =
    '<p class="col-span-full text-center text-black font-semibold text-sm py-8">Cargando programas…</p>';
}

function renderSinDatos() {
  document.getElementById('programsGrid').innerHTML = `<p class="col-span-full text-center text-black font-semibold text-sm py-8">
    No hay datos cargados. <a class="underline font-bold" href="index.html">Volvé a la selección de colección</a> para entrar de nuevo.
  </p>`;
}

function renderConDatos(laboratoriosCrudos) {
  const grid = document.getElementById('programsGrid');
  const laboratorios = filtrarPorColeccion(laboratoriosCrudos);

  // Programas únicos, derivados de "Programa(s)" (o "programa") en cada
  // laboratorio de ESTA colección — ordenados alfabéticamente, sin depender
  // de ningún archivo aparte.
  const programas = [...new Set(laboratorios.flatMap(programasDeLab))].sort((a, b) => a.localeCompare(b, 'es'));

  if (!programas.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-black font-semibold text-sm py-8">
      Todavía no hay ${COLECCION === 'vivo' ? 'laboratorios vivos' : 'laboratorios externos'} cargados para ningún programa.
    </p>`;
    return;
  }

  const labsPorPrograma = new Map();
  programas.forEach(programa => {
    labsPorPrograma.set(programa, laboratorios.filter(lab => programasDeLab(lab).includes(programa)));
  });

  grid.innerHTML = programas
    .map(programa => construirTarjetaPrograma(programa, labsPorPrograma.get(programa) || []))
    .join('');

  // Antes de que el navegador siga el link "Ingresar", dejamos el JSON del
  // programa elegido en window.name de ESTA misma pestaña, reemplazando el
  // array crudo por el contrato ya filtrado que necesita catalogo.html.
  grid.querySelectorAll('a[data-programa]').forEach(enlace => {
    enlace.addEventListener('click', () => {
      const programa = enlace.getAttribute('data-programa');
      const labs = labsPorPrograma.get(programa) || [];
      window.name = JSON.stringify(construirPayloadVisor(programa, labs));
    });
  });
}

aplicarTextosColeccion();
renderCargando();
esperarDatos(leerEntrada, renderConDatos, renderSinDatos);
