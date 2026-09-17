// main.js — Visor genérico por window.name (patrón de visor-instrucciones.md)
//
// Este archivo NO SABE quién lo embebe ni dónde vive ese anfitrión en disco.
// El visor es una función pura de su entrada: NUNCA hace fetch(), nunca
// conoce Datos/*.json, ni ninguna ruta ni nombre de ningún módulo del
// proyecto. Todo — título, texto, ítems, y hasta el link de "volver" —
// llega en el JSON que el anfitrión deja en window.name antes de navegar
// hasta acá. Sin ese dato, el visor cae en placeholders genéricos: nunca
// asume con quién está hablando. Ver README.md para el contrato.
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Contrato de datos: 'laboratorio' (Externos/Propios) y 'vivo' (Vivos).
  // Agregar un tipo nuevo = sumarlo acá + a DEFAULTS_POR_TIPO + a RENDERERS.
  // ---------------------------------------------------------------------
  const TIPOS_VALIDOS = ['laboratorio', 'vivo'];

  const SIN_DATOS = {
    titulo: 'Visor',
    subtitulo: '',
    descripcion: '',
    volver_url: '', // sin anfitrión conocido: no se asume ninguna ruta ajena
    pie: 'Universidad INCCA de Colombia',
    items: []
  };

  const DEFAULTS_POR_TIPO = {
    laboratorio: {
      nombre: 'Laboratorio sin nombre',
      categoria: 'General',
      origen: 'Fuente no especificada',
      aplicaA: '',
      descripcion: 'Descripción no disponible.',
      materias: '',
      modalidad: '—',
      costo: '—',
      link: '',
      imagen: ''
    },
    vivo: {
      item: null,
      nombre: 'Laboratorio en vivo sin nombre',
      programa: '',
      materia: '',
      transversalidad: '',
      descripcion: 'Descripción no disponible.',
      videoUrl: '',
      docenteFuente: 'Fuente no especificada'
    }
  };

  // Ícono Material Symbols por categoría (fallback genérico si no hay match)
  const ICONOS_CATEGORIA = {
    'Conceptos de Matemáticas': 'calculate',
    'Aplicaciones de Matemáticas': 'functions',
    'Movimiento': 'speed',
    'Electricidad, Imanes y Circuitos': 'bolt',
    'Química General': 'science',
    'Ingeniería Química': 'precision_manufacturing',
    'Química Cuántica': 'scatter_plot',
    'Calor y Termoeléctrica': 'thermostat',
    'Luz y Radiación': 'wb_sunny',
    'Programación y Algoritmos': 'code',
    'Sonido y Ondas': 'graphic_eq',
    'Trabajo, Energía y Potencia': 'power',
    'Biología': 'biotech',
    'Fenómenos Cuánticos': 'blur_on',
    'Tierra y Espacio': 'public'
  };
  const ICONO_DEFAULT = 'science';

  // ---------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(str) {
    return String(str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ---------------------------------------------------------------------
  // §4.4 — Lectura de window.name (nunca rompe, aunque esté vacío o corrupto)
  // ---------------------------------------------------------------------
  function leerEntrada() {
    try {
      if (!window.name) return null;
      const data = JSON.parse(window.name);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // §6 — Pipeline de merge campo a campo contra defaults (tolerancia total)
  // ---------------------------------------------------------------------
  function mergeItem(raw, idx) {
    const r = (raw && typeof raw === 'object') ? raw : {};
    const tipo = TIPOS_VALIDOS.includes(r.tipo) ? r.tipo : null;
    if (!tipo) return null; // tipo desconocido -> descarte silencioso

    const def = DEFAULTS_POR_TIPO[tipo];
    const base = {
      id: (r.id && String(r.id)) || `item-${idx + 1}`,
      tipo,
      visible: r.visible !== false, // default true
      orden: Number.isFinite(r.orden) ? r.orden : idx
    };

    const cuerpo = {};
    Object.keys(def).forEach(campo => {
      const valor = r[campo];
      cuerpo[campo] = (valor || valor === 0) ? valor : def[campo];
    });

    if (tipo === 'vivo') {
      cuerpo.item = Number.isFinite(r.item) ? r.item : idx + 1;
      // 'vivo' no tiene 'categoria' propia (usa 'materia'): se alía acá para
      // que la barra de filtros y el conteo por categoría (genéricos, sin
      // conocer tipos) sigan funcionando igual para cualquier tipo de ítem.
      cuerpo.categoria = cuerpo.materia || 'General';
    }

    return Object.assign(base, cuerpo);
  }

  function obtenerDatos() {
    const recibido = leerEntrada() || {};
    return {
      titulo: recibido.titulo || SIN_DATOS.titulo,
      subtitulo: recibido.subtitulo || SIN_DATOS.subtitulo,
      descripcion: recibido.descripcion || SIN_DATOS.descripcion,
      volver_url: recibido.volver_url || SIN_DATOS.volver_url,
      pie: recibido.pie || SIN_DATOS.pie,
      items: (Array.isArray(recibido.items) ? recibido.items : SIN_DATOS.items)
        .map(mergeItem)
        .filter(Boolean)
        .filter(it => it.visible)
        .sort((a, b) => a.orden - b.orden)
    };
  }

  // ---------------------------------------------------------------------
  // Esquema visual: imagen real (solo laboratorios de PhET) o esquema de
  // categoría (dashed). Si la imagen falla al cargar, cae al esquema.
  // ---------------------------------------------------------------------
  function construirEsquema(imagen, icono, categoria) {
    const catEsc = escapeHtml((categoria || '').toUpperCase());
    if (!imagen) {
      return `<div class="lab-card__placeholder">
        <span class="material-symbols-outlined">${icono}</span>
        <span class="label">[ ${catEsc} ]</span>
      </div>`;
    }
    return `<img src="${escapeHtml(imagen)}" alt="${catEsc}" loading="lazy" data-fallback-icon="${icono}" data-fallback-cat="${catEsc}">`;
  }

  function activarFallbackImagenes(root) {
    root.querySelectorAll('img[data-fallback-icon]').forEach(img => {
      img.addEventListener('error', function () {
        const div = document.createElement('div');
        div.className = 'lab-card__placeholder';
        div.innerHTML = `<span class="material-symbols-outlined">${img.dataset.fallbackIcon}</span><span class="label">[ ${img.dataset.fallbackCat} ]</span>`;
        img.replaceWith(div);
      }, { once: true });
    });
  }

  // ---------------------------------------------------------------------
  // §7 — Despacho por plantillas: un único tipo ('laboratorio') por ahora
  // ---------------------------------------------------------------------
  function renderLaboratorioCard(item) {
    const catKey = slugify(item.categoria);
    const icono = ICONOS_CATEGORIA[item.categoria] || ICONO_DEFAULT;
    return `
<article class="lab-card" data-item="${escapeHtml(item.id)}" data-category="${catKey}" tabindex="0" role="button" aria-haspopup="dialog">
  <div>
    <div class="lab-card__thumb">
      ${construirEsquema(item.imagen, icono, item.categoria)}
      <span class="lab-card__origin-badge">${escapeHtml(item.origen)}</span>
      <span class="lab-card__view-badge"><span class="material-symbols-outlined">visibility</span> Ver Ficha</span>
    </div>
    <div class="lab-card__body">
      <div class="lab-card__meta">
        <span class="lab-card__category">${escapeHtml(item.categoria)}</span>
        <span class="lab-card__tag">[${escapeHtml(item.aplicaA)}]</span>
      </div>
      <h3 class="lab-card__title">${escapeHtml(item.nombre)}</h3>
      <p class="lab-card__desc">${escapeHtml(item.descripcion)}</p>
    </div>
  </div>
  <div class="lab-card__footer">
    <div class="lab-card__footer-inner">
      <span>${escapeHtml(item.origen)}</span>
      <span class="lab-card__explore">Explorar →</span>
    </div>
  </div>
</article>`;
  }

  // 'vivo' no abre modal: al hacer clic navega a video.html, su propia
  // página (ver abrirFicha/irAVideoVivo) — por eso, a diferencia de la
  // tarjeta 'laboratorio', no lleva aria-haspopup="dialog".
  function renderVivoCard(item) {
    const catKey = slugify(item.categoria);
    const esTransversal = item.transversalidad === 'Transversal';
    return `
<article class="lab-card" data-item="${escapeHtml(item.id)}" data-category="${catKey}" tabindex="0" role="link">
  <div>
    <div class="lab-card__thumb">
      <div class="lab-card__placeholder">
        <span class="material-symbols-outlined">smart_display</span>
        <span class="label">[ PRÁCTICA ${escapeHtml(String(item.item))} ]</span>
      </div>
      <span class="lab-card__origin-badge">${esTransversal ? 'Transversal' : 'Específico'}</span>
      <span class="lab-card__view-badge"><span class="material-symbols-outlined">play_circle</span> Ver Video</span>
    </div>
    <div class="lab-card__body">
      <div class="lab-card__meta">
        <span class="lab-card__category">${escapeHtml(item.materia)}</span>
        <span class="lab-card__tag">${escapeHtml(item.programa)}</span>
      </div>
      <h3 class="lab-card__title">${escapeHtml(item.nombre)}</h3>
      <p class="lab-card__desc">${escapeHtml(item.descripcion)}</p>
    </div>
  </div>
  <div class="lab-card__footer">
    <div class="lab-card__footer-inner">
      <span>${escapeHtml(item.docenteFuente)}</span>
      <span class="lab-card__explore">Ver Video →</span>
    </div>
  </div>
</article>`;
  }

  const RENDERERS = {
    laboratorio: renderLaboratorioCard,
    vivo: renderVivoCard
  };

  function construirBarraCategorias(items) {
    const conteo = new Map();
    items.forEach(it => {
      const cat = it.categoria || '';
      if (!cat) return;
      conteo.set(cat, (conteo.get(cat) || 0) + 1);
    });
    const ordenadas = [...conteo.entries()].sort((a, b) => b[1] - a[1]);

    let html = `<button type="button" class="filter-btn is-active" data-filter="all">Todos los Laboratorios <span class="filter-btn__count">${items.length}</span></button>`;
    ordenadas.forEach(([cat, count]) => {
      const key = slugify(cat);
      html += `<button type="button" class="filter-btn" data-filter="${key}">${escapeHtml(cat)} <span class="filter-btn__count">${count}</span></button>`;
    });
    return html;
  }

  // Si el anfitrión no mandó descripción, la calculamos de los orígenes
  // reales de los items recibidos (mismo criterio que usaba el catálogo).
  function construirTextoDescripcion(datos) {
    if (datos.descripcion && datos.descripcion.trim()) return datos.descripcion;
    if (!datos.items.length) return 'Todavía no hay laboratorios cargados para este contenido.';

    // 'origen' es propio de 'laboratorio' (Externos/Propios); otros tipos
    // (como 'vivo') no lo tienen. Sin 'origen' que listar, una frase neutra
    // por cantidad de ítems — nunca la de "no hay nada" habiendo contenido.
    const origenes = [];
    datos.items.forEach(it => {
      if (it.origen && !origenes.includes(it.origen)) origenes.push(it.origen);
    });
    if (!origenes.length) {
      return `Explora los ${datos.items.length} ítem${datos.items.length === 1 ? '' : 's'} disponibles en esta sección. Selecciona cualquiera para ver su ficha completa.`;
    }
    const lista = origenes.length > 1
      ? origenes.slice(0, -1).join(', ') + ' y ' + origenes[origenes.length - 1]
      : origenes[0];
    return `Explora los laboratorios externos de este programa, operados por aliados académicos como ${lista}. Selecciona cualquiera para ver su ficha completa.`;
  }

  // Cabecera 100% dirigida por datos: sin volver_url no hay link de vuelta,
  // sin subtitulo no hay badge — el visor no inventa a qué sistema pertenece.
  function renderCabecera(datos) {
    const volverHtml = datos.volver_url
      ? `<a class="topbar__back" href="${escapeHtml(datos.volver_url)}" id="volverLink">
    <span class="material-symbols-outlined" style="font-size:1rem;">arrow_back</span>
    <span>Volver</span>
  </a>`
      : '<span></span>';
    const badgeHtml = datos.subtitulo
      ? `<div class="topbar__badge">
    <span style="width:.5rem;height:.5rem;border-radius:9999px;background:#000;display:inline-block;"></span>
    <span>${escapeHtml(datos.subtitulo)}</span>
  </div>`
      : '';
    return `
<div class="topbar">
  ${volverHtml}
  ${badgeHtml}
</div>
<div class="hero">
  <h1>${escapeHtml(datos.titulo)}</h1>
  <p>${escapeHtml(construirTextoDescripcion(datos))}</p>
</div>
<div class="filters" id="filterBar">${construirBarraCategorias(datos.items)}</div>`;
  }

  function renderModalShell() {
    return `
<div class="modal-overlay is-hidden" id="labModal" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="modal-card" id="modalCard">
    <div class="modal-header">
      <div class="modal-header__row">
        <div>
          <div class="modal-header__badges">
            <span class="modal-badge modal-badge--solid" id="modalCategoryBadge"></span>
            <span class="modal-badge modal-badge--outline" id="modalLocationText"></span>
          </div>
          <h2 class="modal-title" id="modalTitle"></h2>
        </div>
        <button type="button" class="modal-close" id="modalCloseBtn" aria-label="Cerrar modal">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-visual" id="modalWireframeBox"></div>
    </div>
    <div class="modal-body">
      <div class="modal-section">
        <h4><span class="material-symbols-outlined" style="font-size:.9rem;">info</span> Descripción</h4>
        <p id="modalDescription"></p>
      </div>
      <div class="modal-section">
        <h4><span class="material-symbols-outlined" style="font-size:.9rem;">menu_book</span> Materias</h4>
        <div class="chip-list" id="modalMateriasList"></div>
      </div>
      <div class="fact-grid">
        <div class="fact"><div class="fact__label">Modalidad</div><div class="fact__value" id="modalModalidad">—</div></div>
        <div class="fact"><div class="fact__label">Costo</div><div class="fact__value" id="modalCosto">—</div></div>
        <div class="fact"><div class="fact__label">Transversal</div><div class="fact__value" id="modalTransversal">—</div></div>
      </div>
    </div>
    <div class="modal-footer">
      <a class="btn-outline" href="#" id="modalResourceLink" target="_blank" rel="noopener noreferrer">
        <span class="material-symbols-outlined" style="font-size:.9rem;">open_in_new</span>
        Abrir Recurso Original
      </a>
    </div>
  </div>
</div>`;
  }

  // ---------------------------------------------------------------------
  // Render principal: inyecta todo de una vez (insertAdjacentHTML) y luego
  // hidrata (engancha listeners sobre el DOM ya montado).
  // ---------------------------------------------------------------------
  function render(datos) {
    document.title = datos.titulo; // el título de la pestaña también sale del dato, no de un texto fijo

    const app = document.getElementById('app');
    app.innerHTML = '<div class="app-shell" id="appShell"></div>';
    const shell = document.getElementById('appShell');

    shell.insertAdjacentHTML('beforeend', renderCabecera(datos));

    const gridHtml = datos.items.length
      ? datos.items.map(it => (RENDERERS[it.tipo] || renderLaboratorioCard)(it)).join('')
      : '<p class="state-message">Todavía no hay laboratorios para mostrar.</p>';
    shell.insertAdjacentHTML('beforeend', `<div class="labs-grid" id="labsGrid">${gridHtml}</div>`);

    shell.insertAdjacentHTML('beforeend',
      `<div class="app-footer">${escapeHtml(datos.pie)}</div>`);

    app.insertAdjacentHTML('beforeend', renderModalShell());

    activarFallbackImagenes(app);
    hidratar(app, datos);
  }

  // ---------------------------------------------------------------------
  // Hidratación: listeners sobre el árbol ya montado (§6.1)
  // ---------------------------------------------------------------------
  function hidratar(app, datos) {
    const filterBar = document.getElementById('filterBar');
    if (filterBar) {
      filterBar.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.filter-btn');
        if (!btn) return;
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const filtro = btn.getAttribute('data-filter');
        app.querySelectorAll('.lab-card').forEach(card => {
          const cat = card.getAttribute('data-category');
          card.style.display = (filtro === 'all' || filtro === cat) ? '' : 'none';
        });
      });
    }

    const grid = document.getElementById('labsGrid');
    if (grid) {
      grid.addEventListener('click', (ev) => {
        const card = ev.target.closest('[data-item]');
        if (!card) return;
        abrirFicha(card.getAttribute('data-item'), datos);
      });
      grid.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const card = ev.target.closest('[data-item]');
        if (!card) return;
        ev.preventDefault();
        abrirFicha(card.getAttribute('data-item'), datos);
      });
    }

    const modal = document.getElementById('labModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', cerrarFicha);
    if (modal) {
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) cerrarFicha();
      });
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') cerrarFicha();
    });

    const volverLink = document.getElementById('volverLink');
    if (volverLink) {
      volverLink.addEventListener('click', (ev) => {
        ev.preventDefault();
        volver(datos.volver_url);
      });
    }
  }

  // Respaldo del payload de ESTE catálogo (en sessionStorage de esta misma
  // pestaña) antes de reemplazar window.name para ir a video.html — mismo
  // patrón que usan index.html/programa.html para que "Volver" no pierda
  // los datos (ver "Volver sin perder los datos" en README.md).
  const CLAVE_RESPALDO_CATALOGO = 'visorCatalogoRespaldo';

  function abrirFicha(id, datos) {
    const item = datos.items.find(it => it.id === id);
    if (!item) return;
    if (item.tipo === 'vivo') {
      irAVideoVivo(item);
      return;
    }
    openLabModal(item);
  }

  function irAVideoVivo(item) {
    try { sessionStorage.setItem(CLAVE_RESPALDO_CATALOGO, window.name); } catch (e) { /* sin storage disponible, no pasa nada */ }
    window.name = JSON.stringify({
      item: item.item,
      nombre: item.nombre,
      programa: item.programa,
      materia: item.materia,
      transversalidad: item.transversalidad,
      descripcion: item.descripcion,
      videoUrl: item.videoUrl,
      docenteFuente: item.docenteFuente,
      volver_url: 'catalogo.html'
    });
    window.location.href = 'video.html';
  }

  function llenarChips(container, valores, textoVacio) {
    container.innerHTML = '';
    const limpios = valores.filter(Boolean);
    if (!limpios.length) {
      container.innerHTML = `<span class="chip">${escapeHtml(textoVacio)}</span>`;
      return;
    }
    limpios.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = v;
      container.appendChild(chip);
    });
  }

  function openLabModal(item) {
    document.getElementById('modalTitle').textContent = item.nombre;
    document.getElementById('modalCategoryBadge').textContent = item.categoria;
    document.getElementById('modalLocationText').textContent = item.origen;
    document.getElementById('modalDescription').textContent = item.descripcion;

    const materias = item.materias ? item.materias.split(';').map(m => m.trim()) : [];
    llenarChips(document.getElementById('modalMateriasList'), materias, 'Sin materias registradas');

    document.getElementById('modalModalidad').textContent = item.modalidad || '—';
    document.getElementById('modalCosto').textContent = item.costo || '—';
    document.getElementById('modalTransversal').textContent =
      item.aplicaA === 'Transversal' ? 'Sí' : (item.aplicaA ? 'No' : '—');

    const icono = ICONOS_CATEGORIA[item.categoria] || ICONO_DEFAULT;
    const wireframeBox = document.getElementById('modalWireframeBox');
    if (item.imagen) {
      wireframeBox.className = 'modal-visual modal-visual--image';
      wireframeBox.innerHTML = `<div class="modal-visual__frame">${construirEsquema(item.imagen, icono, item.categoria)}</div><div class="modal-visual__caption">${escapeHtml(item.origen)} • ${escapeHtml(item.aplicaA)}</div>`;
    } else {
      wireframeBox.className = 'modal-visual';
      wireframeBox.innerHTML = `<div class="modal-visual__label">[ ESQUEMA: ${escapeHtml((item.categoria || '').toUpperCase())} ]</div><div class="modal-visual__caption">${escapeHtml(item.origen)} • ${escapeHtml(item.aplicaA)}</div>`;
    }
    activarFallbackImagenes(wireframeBox);

    const resourceLink = document.getElementById('modalResourceLink');
    if (item.link) {
      resourceLink.href = item.link;
      resourceLink.style.display = '';
    } else {
      resourceLink.removeAttribute('href');
      resourceLink.style.display = 'none';
    }

    const modal = document.getElementById('labModal');
    modal.classList.remove('is-hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function cerrarFicha() {
    const modal = document.getElementById('labModal');
    if (!modal) return;
    modal.classList.add('is-hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ---------------------------------------------------------------------
  // §9 — Puente con el anfitrión: best-effort con fallback garantizado.
  // En el flujo real (navegación directa, sin iframe) window.parent ===
  // window, así que esto navega derecho a volver_url. Queda implementado
  // completo porque prueba.html SÍ embebe el visor en un <iframe>.
  // ---------------------------------------------------------------------
  function volver(volverUrl) {
    const embebido = window.parent && window.parent !== window;

    if (!embebido || !volverUrl) {
      if (volverUrl) window.location.href = volverUrl;
      return;
    }

    let resuelto = false;
    const onRespuesta = (ev) => {
      if (!ev.data || ev.data.source !== 'anfitrion' || ev.data.type !== 'ok-volver') return;
      resuelto = true;
      window.removeEventListener('message', onRespuesta);
    };
    window.addEventListener('message', onRespuesta);
    window.parent.postMessage({ source: 'visor', type: 'volver' }, '*');

    setTimeout(() => {
      if (!resuelto) {
        window.removeEventListener('message', onRespuesta);
        window.location.href = volverUrl;
      }
    }, 400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    render(obtenerDatos());
  });
})();
