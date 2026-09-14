# Visor de Laboratorios

Un "visor" de 3 pantallas — elegir colección → elegir programa → ver el
catálogo — que implementa el patrón descrito en
[`visor-instrucciones.md`](./visor-instrucciones.md): **ningún archivo de
este repo hace nunca `fetch()`**. Las 3 pantallas son funciones puras de lo
que reciban por `window.name`; no conocen ni les importa quién las alimenta.

Este repo **no incluye ningún origen de datos real ni ningún "anfitrión"**
— a propósito, es solo el visor. `prueba.html` es la referencia de cómo
alimentarlo: trae un dataset real de 132 laboratorios embebido directo en
el atributo `name` de un `<iframe>`, apuntando a `index.html`.

## Las 3 pantallas

```
prueba.html (o cualquier anfitrión externo real)
   │ deja el array COMPLETO de laboratorios en window.name
   ▼
index.html      → elegir colección (Externos / Vivos / Propios)
   │  cuenta laboratorios.length para el conteo real de "Externos"
   │  clic en "Externos" (link normal — window.name no se toca)
   ▼
programa.html   → elegir programa/carrera
   │  deriva los programas recorriendo "Programa(s)" de cada laboratorio
   │  clic en "Ingresar" en un programa
   │  (acá SÍ se reescribe window.name: el array crudo se reemplaza por el
   │   contrato ya filtrado que necesita catalogo.html)
   ▼
catalogo.html   → catálogo + ficha de ESE programa
      (SOLO lee window.name — el "visor puro")
```

Las 3 pantallas leen `window.name`; **ninguna hace `fetch()`**. `index.html`
y `programa.html` además guardan un eco de `window.name` en
`sessionStorage` de la pestaña — no es una fuente de datos nueva, solo
evita perder los datos cuando "Volver" lleva a una pantalla cuyo
`window.name` ya fue sobreescrito por un salto más adelante en la cadena
(ver "Volver sin perder los datos" más abajo).

```
visor-catalogo-lab/
├── index.html                 — PANTALLA 1: elegir colección
├── programa.html               — PANTALLA 2: elegir programa
├── catalogo.html                — PANTALLA 3: el visor puro
├── prueba.html                  — banco de pruebas: <iframe> con 132 labs reales en su name
├── assets/
│   ├── css/
│   │   ├── styles.css             — CSS a mano, compartido por index.html y catalogo.html
│   │   └── programa-styles.css    — estilos propios de programa.html (Tailwind + este CSS)
│   └── js/
│       ├── index-main.js          — lógica de la pantalla 1
│       ├── programa-main.js       — lógica de la pantalla 2
│       └── main.js                — lógica de la pantalla 3: leerEntrada → merge → dispatch → render → hidratar
├── visor-instrucciones.md       — el patrón general que sigue este visor
└── README.md                    — este archivo
```

## Cómo alimentarlo (el contrato del array crudo)

`index.html` y `programa.html` esperan encontrar en `window.name` un JSON
**array** de objetos "laboratorio", con estos campos:

| Campo | Uso |
|---|---|
| `No.` | id numérico opcional, para generar ids de ítem estables en el catálogo |
| `Nombre del Laboratorio` | título |
| `Categoría` | categoría / filtro del catálogo |
| `Origen / Plataforma` | badge de origen |
| `Aplica a` | `"Transversal"` o cualquier otro valor |
| `Programa(s)` | programas a los que aplica, separados por `,` o `;` — de acá se derivan las tarjetas de `programa.html`, sin ningún archivo aparte |
| `Materias` | materias, separadas por `;` |
| `Descripción ` | texto de la ficha (con espacio al final del nombre del campo — así viene en el dataset de referencia) |
| `Compatible con Moodle` | modalidad, mostrada en la ficha |
| `Costo` | costo, mostrado en la ficha |
| `Link del Recurso` | URL externa del laboratorio |
| `imagen` | URL de una imagen real del laboratorio (opcional) |

Mirá `prueba.html` para un ejemplo real y completo de este array (132
laboratorios reales).

## `catalogo.html` — el visor puro (pantalla 3)

No hace ningún `fetch()`, no conoce ninguna ruta ni nombre de ningún otro
archivo del repo y no asume quién lo usa: es una función pura de lo que
reciba en `window.name`. Sin ese dato, cae en placeholders genéricos
(`"Visor"`, sin link de volver, etc.), nunca en una suposición sobre quién
lo está usando.

### Cómo le llegan los datos

El anfitrión de `catalogo.html` es `programa.html` (la pantalla 2). Al
hacer click en "Ingresar", arma el JSON de abajo con los laboratorios de
ese programa — incluido su propio `volver_url` apuntando de vuelta a sí
mismo — hace `window.name = JSON.stringify(datos)` **en la misma
pestaña**, y deja que el link navegue a `catalogo.html`. Como `window.name`
persiste a través de la navegación dentro del mismo frame, `catalogo.html`
lo encuentra ahí apenas carga — sin query string, sin una segunda llamada
de red.

Si abrís `catalogo.html` directo (sin pasar por ningún anfitrión),
`window.name` viene vacío: es el comportamiento esperado, no un error.

### Contrato de datos de `catalogo.html`

Objeto raíz + `items[]`, cada ítem con `tipo: "laboratorio"` (único tipo
soportado por ahora; cualquier otro se descarta en silencio):

```jsonc
{
  "titulo": "Laboratorios de Ingeniería de Sistemas",
  "subtitulo": "Red de Convenios & Plataformas Externas",
  "descripcion": "",
  "volver_url": "programa.html",
  "items": [
    {
      "id": "lab-42",
      "tipo": "laboratorio",
      "visible": true,
      "orden": 0,
      "nombre": "Simulador de Circuitos",
      "categoria": "Electricidad, Imanes y Circuitos",
      "origen": "PhET",
      "aplicaA": "Transversal",
      "descripcion": "...",
      "materias": "Materia A (Programa X); Materia B (Programa Y)",
      "modalidad": "Sí (plataforma web, gratuita)",
      "costo": "Gratuito / $0",
      "link": "https://...",
      "imagen": ""
    }
  ]
}
```

#### Campos del objeto raíz

| Campo | Default si falta | Notas |
|---|---|---|
| `titulo` | `"Visor"` | `<h1>` y también el `<title>` de la pestaña |
| `subtitulo` | `""` → no se muestra ningún badge | Badge chico junto al link de "volver"; si no viene, el visor no inventa ninguno |
| `descripcion` | si viene vacío, el visor arma una frase con los `origen` únicos de los `items` recibidos | |
| `volver_url` | `""` → **no se renderiza ningún link de "volver"** | El visor nunca asume a dónde volver; sin este dato, simplemente no hay botón |
| `items` | `[]` → estado "Todavía no hay laboratorios para mostrar." | |

#### Campos de un ítem `tipo: "laboratorio"`

| Campo | Default si falta | Notas |
|---|---|---|
| `id` | `item-<posición>` | Estable = mejor para deep-links a futuro |
| `visible` | `true` | `false` = no se renderiza ni cuenta |
| `orden` | posición en el array | Determina el orden final de la grilla |
| `nombre` | `"Laboratorio sin nombre"` | Título de la tarjeta y de la ficha |
| `categoria` | `"General"` | Badge + filtro por categoría + ícono |
| `origen` | `"Fuente no especificada"` | Badge de plataforma/origen |
| `aplicaA` | `""` | `"Transversal"` → ficha muestra "Sí"; cualquier otro valor no vacío → "No" |
| `descripcion` | `"Descripción no disponible."` | Texto completo en la ficha |
| `materias` | `""` → "Sin materias registradas" | Se separa por `;` para las chips de la ficha |
| `modalidad` | `"—"` | Ficha, columna "Modalidad" |
| `costo` | `"—"` | Ficha, columna "Costo" |
| `link` | `""` → botón "Abrir Recurso Original" oculto | URL externa, se abre en pestaña nueva |
| `imagen` | `""` → esquema de categoría (ícono + nombre) | Si falla la carga de la imagen, cae automáticamente al esquema |

## `index.html` — pantalla 1 (elegir colección)

Lee `window.name` (el array completo de laboratorios) y calcula
`laboratorios.length` para el conteo real de la tarjeta de Externos — nunca
un número escrito a mano. Vivos y Propios son tarjetas fijas
"Próximamente": no hay ningún dato real para ellas en este repo. No le pasa
nada nuevo por `window.name` a la pantalla 2: el link de "Ingresar" es un
`<a href>` común, y como nadie reescribe `window.name` acá, el mismo array
sigue disponible al llegar a `programa.html`.

## `programa.html` — pantalla 2 (elegir programa/carrera)

Sigue leyendo el mismo `window.name`. La lista de programas se deriva
recorriendo el campo `"Programa(s)"` de cada laboratorio del array y
sacando los valores únicos — no depende de ningún archivo aparte. Recién al
elegir un programa arma el payload del visor (contrato de arriba) y ahí sí
reemplaza `window.name` antes de navegar a `catalogo.html`.

## "Volver" sin perder los datos: respaldo en `sessionStorage`

`window.name` es un único casillero por pestaña — cuando `programa.html`
navega para adelante a `catalogo.html`, tiene que reemplazarlo por el
payload de ESE programa (`catalogo.html` no sabe leer otra cosa). Sin nada
más, volver atrás dejaría a `programa.html` con la forma equivocada de dato
y ningún programa para mostrar.

Por eso `index.html` y `programa.html` guardan, además, un **eco local** de
su propio `window.name` en `sessionStorage` de esa misma pestaña (no es una
fuente de datos nueva, ni red, ni otro archivo — es lo mismo que ya había
en `window.name`, solo que no se pierde cuando una pantalla más adelante lo
sobreescribe). Si `window.name` no tiene la forma que la pantalla necesita
al cargar, recurre a ese respaldo antes de rendirse, y lo vuelve a dejar en
`window.name` para que la próxima lectura quede consistente. Con esto,
"Volver" desde `catalogo.html` hasta `programa.html`, o desde ahí hasta
`index.html`, muestra de nuevo los datos reales — no el estado "sin datos".

## Probarlo: `prueba.html`

Abrí `prueba.html` con Live Server (o similar) y recorré la cadena completa
con clicks reales: Pantalla 1 (conteo real de 132) → Pantalla 2 (los 14
programas, derivados del mismo array) → elegí cualquier programa →
Pantalla 3, el catálogo real de ese programa, con su ficha y su imagen (si
es de PhET). Ninguna de las 3 pantallas toca la red en ningún momento de
ese recorrido — todo sale del único `window.name` que puso el `<iframe>`
al principio.

Abrir cualquiera de las 3 pantallas sin pasar por `prueba.html` (sin
`window.name`) muestra los placeholders del estado vacío de cada una —
nunca un error ni una pantalla en blanco. Es un caso de prueba esperado, no
un bug.
