// index-main.js — visor/index.html (Pantalla 1: elegir colección)
//
// CERO fetch(). Lee window.name, que index.html (la raíz del sitio) dejó
// cargado con el contenido COMPLETO de Datos/General-labs.json antes de
// navegar hasta acá (ver assets/js/index-main.js de la raíz). No se vuelve
// a tocar la red en ningún momento de acá en adelante: window.name
// persiste tal cual a través de esta navegación y de la siguiente (hacia
// programa.html), así que esa pantalla lee EL MISMO valor sin que nadie
// tenga que volver a dejarlo.
//
// Cada laboratorio del array trae (o no) un campo 'tipo': 'externo' | 'vivo'
// | 'propio'. Los datos históricos (Datos/General-labs.json) no tienen ese
// campo — se tratan como 'externo' por compatibilidad, nunca se descartan.
// Vivos se activa solo si el array trae al menos un ítem con tipo 'vivo';
// Propios sigue sin fuente de datos, así que se muestra como "Próximamente"
// — no hay ningún dato que derivar para ella (distinto de inventar un texto
// pretendiendo que sí lo hay, que es lo que se evita acá).

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Clave de sessionStorage: un eco LOCAL de esta pestaña, no una fuente de
// datos nueva. window.name sigue siendo el único origen real — esto es
// solo para no perderlo cuando una pantalla más adelante en la cadena lo
// sobreescribe con su propio payload (ver "Volver" en visor/README.md).
const CLAVE_RESPALDO = 'labExternosDatos';

// Lee el array crudo de laboratorios. Primero intenta window.name (canal
// principal); si no tiene la forma esperada (por ejemplo, al volver desde
// programa.html o catalogo.html, que ya lo sobreescribieron con SU propio
// payload), recurre al respaldo en sessionStorage de esta misma pestaña —
// nunca a una red ni a un archivo nuevo. null si ninguno de los dos sirve.
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

function renderCabecera() {
  return `
<div class="topbar">
  <a class="topbar__back" href="../index.html">
    <span class="material-symbols-outlined" style="font-size:1rem;">arrow_back</span>
    <span>Volver a Inicio</span>
  </a>
  <div class="topbar__badge">
    <span style="width:.5rem;height:.5rem;border-radius:9999px;background:#000;display:inline-block;"></span>
    <span>Selección de Colección</span>
  </div>
</div>
<div class="hero">
  <h1>Laboratorios</h1>
  <p>Elegí qué tipo de laboratorio querés explorar. Cada colección tiene sus propios programas y su propio catálogo.</p>
</div>`;
}

function renderTarjetaExternos(totalLabs) {
  const conteoTexto = `${totalLabs} Laboratorio${totalLabs === 1 ? '' : 's'} Disponible${totalLabs === 1 ? '' : 's'}`;
  return `
<div class="collection-card">
  <div>
    <div class="collection-card__icon"><span class="material-symbols-outlined">public</span></div>
    <span class="collection-card__badge collection-card__badge--solid">Activo</span>
    <h2 class="collection-card__title">Laboratorios Externos</h2>
    <p class="collection-card__desc">Recursos académicos y tecnológicos de plataformas aliadas disponibles en Internet (PhET, CircuitVerse, GeoGebra y más), organizados por programa.</p>
  </div>
  <div class="collection-card__footer">
    <span class="collection-card__count"><span class="material-symbols-outlined"></span>${escapeHtml(conteoTexto)}</span>
    <a class="collection-card__cta" href="programa.html">Ingresar <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span></a>
  </div>
</div>`;
}

function renderTarjetaVivos(totalVideos) {
  const conteoTexto = `${totalVideos} Video${totalVideos === 1 ? '' : 's'} Disponible${totalVideos === 1 ? '' : 's'}`;
  return `
<div class="collection-card">
  <div>
    <div class="collection-card__icon"><span class="material-symbols-outlined">videocam</span></div>
    <span class="collection-card__badge collection-card__badge--solid">Activo</span>
    <h2 class="collection-card__title">Laboratorios Vivos</h2>
    <p class="collection-card__desc">Prácticas de laboratorio grabadas en la universidad para consulta y estudio asincrónico, organizadas por programa.</p>
  </div>
  <div class="collection-card__footer">
    <span class="collection-card__count"><span class="material-symbols-outlined"></span>${escapeHtml(conteoTexto)}</span>
    <a class="collection-card__cta" href="programa.html?coleccion=vivo">Ingresar <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span></a>
  </div>
</div>`;
}

function renderTarjetaInactiva(icono, titulo, descripcion) {
  return `
<div class="collection-card collection-card--inactive">
  <div>
    <div class="collection-card__icon"><span class="material-symbols-outlined">${icono}</span></div>
    <span class="collection-card__badge">Próximamente</span>
    <h2 class="collection-card__title">${escapeHtml(titulo)}</h2>
    <p class="collection-card__desc">${escapeHtml(descripcion)}</p>
  </div>
  <div class="collection-card__footer">
    <span class="collection-card__count"><span class="material-symbols-outlined">schedule</span>Sin datos todavía</span>
    <span class="collection-card__cta collection-card__cta--disabled">No disponible</span>
  </div>
</div>`;
}

function renderCargando() {
  document.getElementById('app').innerHTML = `
<div class="app-shell">
  ${renderCabecera()}
  <p class="state-message">Cargando…</p>
</div>`;
}

function renderSinDatos() {
  // Se entró directo a esta pantalla, sin pasar por el index general del
  // sitio (que es quien deja los datos en window.name). Nunca en blanco.
  document.getElementById('app').innerHTML = `
<div class="app-shell">
  ${renderCabecera()}
  <p class="state-message">No hay datos cargados. <a href="../index.html" style="text-decoration:underline;">Volvé al inicio</a> para entrar de nuevo.</p>
</div>`;
}

function renderConDatos(laboratorios) {
  const totalExternos = laboratorios.filter(lab => lab && (lab.tipo === 'externo' || lab.tipo === undefined)).length;
  const totalVivos = laboratorios.filter(lab => lab && lab.tipo === 'vivo').length;

  document.getElementById('app').innerHTML = `
<div class="app-shell">
  ${renderCabecera()}
  <div class="labs-grid">
    ${renderTarjetaExternos(totalExternos)}
    ${totalVivos > 0
      ? renderTarjetaVivos(totalVivos)
      : renderTarjetaInactiva('videocam', 'Laboratorios Vivos', 'Prácticas de laboratorio grabadas en la universidad para consulta y estudio asincrónico.')}
    ${renderTarjetaInactiva('science', 'Laboratorios Propios', 'Aplicativos y espacios desarrollados directamente por la Universidad INCCA para sus estudiantes.')}
  </div>
  <div class="app-footer">Selecciona una colección para ver sus programas y laboratorios &bull; Universidad INCCA de Colombia</div>
</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCargando();
  esperarDatos(leerEntrada, renderConDatos, renderSinDatos);
});
