// video-main.js — visor/video.html (página individual de un laboratorio vivo)
//
// CERO fetch(). Recibe UN solo laboratorio 'vivo' por window.name: lo arma
// catalogo.html (assets/js/main.js, irAVideoVivo()) al hacer clic en una
// tarjeta de video, respaldando antes su propio payload en sessionStorage
// para que "Volver al catálogo" lo pueda restaurar sin perderlo (mismo
// patrón que index.html/programa.html — ver "Volver sin perder los datos"
// en README.md).

const CLAVE_RESPALDO_CATALOGO = 'visorCatalogoRespaldo';

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Google Drive entrega links "para compartir" (.../view?usp=drivesdk o
// .../view); para incrustarlos en un <iframe> hay que pedir la variante
// "/preview" del mismo archivo. Si la URL no matchea el patrón esperado,
// se devuelve tal cual (mejor un link roto visible que ocultar el dato).
function toEmbedUrlDrive(url) {
  if (!url) return '';
  const m = String(url).match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}

// A diferencia de catalogo.html (que espera { items: [...] }), acá el
// anfitrión manda UN solo ítem suelto — cualquier otra forma se trata como
// "no hay datos", nunca como un error.
function leerEntrada() {
  try {
    if (!window.name) return null;
    const data = JSON.parse(window.name);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Array.isArray(data.items)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function renderSinDatos() {
  document.getElementById('app').innerHTML = `
<div class="app-shell">
  <div class="topbar">
    <a class="topbar__back" href="catalogo.html">
      <span class="material-symbols-outlined" style="font-size:1rem;">arrow_back</span>
      <span>Volver al catálogo</span>
    </a>
  </div>
  <p class="state-message">No hay ningún video cargado. Volvé al catálogo para elegir uno.</p>
</div>`;
}

function renderVideo(item) {
  document.title = item.nombre || 'Laboratorio Vivo';

  const embedUrl = toEmbedUrlDrive(item.videoUrl);
  const esTransversal = item.transversalidad === 'Transversal';
  const itemTexto = item.item != null && item.item !== '' ? String(item.item) : '';

  document.getElementById('app').innerHTML = `
<div class="app-shell">
  <div class="topbar">
    <a class="topbar__back" href="${escapeHtml(item.volver_url || 'catalogo.html')}" id="volverLink">
      <span class="material-symbols-outlined" style="font-size:1rem;">arrow_back</span>
      <span>Volver al catálogo</span>
    </a>
    ${itemTexto ? `<div class="topbar__badge">
      <span style="width:.5rem;height:.5rem;border-radius:9999px;background:#000;display:inline-block;"></span>
      <span>Práctica ${escapeHtml(itemTexto)}</span>
    </div>` : ''}
  </div>

  <div class="video-page">
    <div class="video-page__player modal-visual modal-visual--video">
      ${embedUrl
        ? `<iframe src="${escapeHtml(embedUrl)}" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="${escapeHtml(item.nombre)}"></iframe>`
        : `<div class="modal-visual__label">[ VIDEO NO DISPONIBLE ]</div>`}
    </div>

    <div class="video-page__info">
      <div class="modal-header__badges">
        <span class="modal-badge modal-badge--solid">${escapeHtml(item.materia || 'Sin materia')}</span>
        <span class="modal-badge modal-badge--outline">${escapeHtml(item.programa || 'Sin programa')}</span>
        <span class="modal-badge ${esTransversal ? 'modal-badge--solid' : 'modal-badge--outline'}">${escapeHtml(item.transversalidad || '—')}</span>
      </div>
      <h1 class="video-page__title">${escapeHtml(item.nombre || 'Laboratorio en vivo sin nombre')}</h1>

      <div class="modal-section">
        <h4><span class="material-symbols-outlined" style="font-size:.9rem;">info</span> Descripción</h4>
        <p>${escapeHtml(item.descripcion || 'Descripción no disponible.')}</p>
      </div>

      <div class="fact-grid">
        <div class="fact"><div class="fact__label">Ítem</div><div class="fact__value">${itemTexto ? `#${escapeHtml(itemTexto)}` : '—'}</div></div>
        <div class="fact"><div class="fact__label">Docente / Fuente</div><div class="fact__value">${escapeHtml(item.docenteFuente || '—')}</div></div>
        <div class="fact"><div class="fact__label">Transversalidad</div><div class="fact__value">${escapeHtml(item.transversalidad || '—')}</div></div>
      </div>

      ${item.videoUrl ? `<a class="btn-outline" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer">
        <span class="material-symbols-outlined" style="font-size:.9rem;">open_in_new</span>
        Abrir en Google Drive
      </a>` : ''}
    </div>
  </div>

  <div class="app-footer">Laboratorios vivos grabados en la universidad &bull; Universidad INCCA de Colombia</div>
</div>`;

  const volverLink = document.getElementById('volverLink');
  if (volverLink) {
    // Restaura el catálogo respaldado ANTES de que el <a href> navegue
    // (evento sincrónico: no hace falta preventDefault ni esperar nada).
    volverLink.addEventListener('click', () => {
      try {
        const respaldo = sessionStorage.getItem(CLAVE_RESPALDO_CATALOGO);
        if (respaldo) window.name = respaldo;
      } catch (e) { /* sin storage disponible: catalogo.html cae a su estado "sin datos" */ }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const item = leerEntrada();
  if (item) {
    renderVideo(item);
  } else {
    renderSinDatos();
  }
});
