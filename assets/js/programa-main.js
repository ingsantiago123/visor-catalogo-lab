// programa-main.js — visor/programa.html (Pantalla 2: elegir programa/carrera)
//
// CERO fetch(). Sigue leyendo el MISMO window.name que dejó index.html (la
// raíz del sitio) con el array completo de Datos/General-labs.json — nadie
// lo tocó entre la pantalla 1 y esta, así que sigue ahí. La lista de los 14
// programas no viene de Datos/Programas.json (ese archivo ya no se usa en
// la cadena real): se DERIVA acá mismo, recorriendo el campo "Programa(s)"
// de cada laboratorio y sacando los valores únicos.
//
// Recién al elegir un programa se arma el JSON con el contrato de datos del
// visor (ver visor-instrucciones.md) y se deja en window.name antes de
// navegar a catalogo.html — ese archivo (el "visor puro") tampoco toca la
// red nunca.

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

// Todos los programas a los que aplica un laboratorio (mismo criterio de
// separación usado en toda la cadena: coma o punto y coma).
function programasDeLab(lab) {
  return (lab['Programa(s)'] || '')
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(Boolean);
}

function construirTarjetaPrograma(programa, laboratorios) {
  const icono = ICONOS_PROGRAMA[programa] || ICONO_DEFAULT;

  // Orígenes / plataformas únicos de los laboratorios de este programa
  const origenes = [];
  laboratorios.forEach(lab => {
    const origen = (lab['Origen / Plataforma'] || '').trim();
    if (origen && !origenes.includes(origen)) origenes.push(origen);
  });
  const textoOrigenes = origenes.length
    ? `En este programa puedes encontrar laboratorios de: ${origenes.join(', ')}. Entra para descubrir qué ofrecemos.`
    : 'Próximamente encontrarás aquí laboratorios externos disponibles para este programa.';

  const totalLabs = laboratorios.length;
  const textoConteo = `${totalLabs} Laboratorio${totalLabs === 1 ? '' : 's'} Disponible${totalLabs === 1 ? '' : 's'}`;

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
          <p class="text-black text-sm leading-relaxed mb-6 font-normal">${escapeHtml(textoOrigenes)}</p>
        </div>
        <div class="pt-4 border-t-2 border-black flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-black font-semibold"><i class="fa-solid fa-flask-vial"></i><span>${textoConteo}</span></div>
          <a class="inline-flex items-center gap-1.5 font-bold text-black hover:underline" href="catalogo.html" data-programa="${escapeHtml(programa)}"><span>Ingresar</span><i class="fa-solid fa-chevron-right text-[11px]"></i></a>
        </div>
      </div>`;
}

// Convierte los labs (tal cual vienen de General-labs.json) al contrato de
// datos del visor (ver visor/README.md): objeto raíz + items[] tipados.
// Esto es lo único que catalogo.html recibe — nunca ve el JSON crudo.
function construirPayloadVisor(programa, laboratorios) {
  return {
    titulo: `Laboratorios de ${programa}`,
    subtitulo: 'Red de Convenios & Plataformas Externas',
    descripcion: '',
    volver_url: 'programa.html',
    items: laboratorios.map((lab, idx) => ({
      // Number.isFinite (no solo != null): si "No." llegara vacío o con un
      // valor no numérico, cada item igual necesita un id único dentro de
      // ESTE payload (basta con eso, no tiene que ser único en todo el JSON).
      id: `lab-${Number.isFinite(lab['No.']) ? lab['No.'] : idx + 1}`,
      tipo: 'laboratorio',
      visible: true,
      orden: idx,
      nombre: lab['Nombre del Laboratorio'] || '',
      categoria: lab['Categoría'] || '',
      origen: lab['Origen / Plataforma'] || '',
      aplicaA: lab['Aplica a'] || '',
      descripcion: lab['Descripción '] || '',
      materias: lab['Materias'] || '',
      modalidad: lab['Compatible con Moodle'] || '',
      costo: lab['Costo'] || '',
      link: lab['Link del Recurso'] || '',
      imagen: lab['imagen'] || ''
    }))
  };
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

function renderConDatos(laboratorios) {
  const grid = document.getElementById('programsGrid');

  // Programas únicos, derivados de "Programa(s)" en cada laboratorio —
  // ordenados alfabéticamente, sin depender de ningún archivo aparte.
  const programas = [...new Set(laboratorios.flatMap(programasDeLab))].sort((a, b) => a.localeCompare(b, 'es'));

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

renderCargando();
esperarDatos(leerEntrada, renderConDatos, renderSinDatos);
