# Calendario de Exámenes

Aplicación web para gestionar las inscripciones a exámenes finales. Compatible con GitHub Pages.

## 📁 Estructura del Proyecto

```
calendario_examenes/
├── index.html              # Página principal (HTML + CSS)
└── js/                     # Módulos JavaScript (ES6)
    ├── app.js             # Punto de entrada principal
    ├── calendar.js        # Lógica del calendario
    ├── data.js            # Base de datos de eventos
    ├── modal.js           # Gestión del modal
    ├── storage.js         # Manejo de localStorage
    ├── subscriptions.js   # Lista de inscripciones
    └── utils.js           # Utilidades generales
```

## 🔧 Módulos

### `app.js`
Punto de entrada de la aplicación. Inicializa y coordina todos los módulos.

### `calendar.js`
Renderizado del calendario y controles de navegación entre meses.

### `data.js`
Contiene:
- Array de eventos con fechas, horarios y profesores
- Detalles de ubicaciones (Campus y Córdoba)
- Paleta de colores para materias

### `modal.js`
Gestiona la ventana modal con detalles del evento y botón de inscripción.

### `storage.js`
Manejo de persistencia de datos usando localStorage del navegador.

### `subscriptions.js`
Renderiza la lista de "Mis Inscripciones" y permite cancelar inscripciones.

### `utils.js`
Funciones auxiliares como `getColorForSubject()`.

## 🚀 Uso en GitHub Pages

Esta aplicación usa **ES6 Modules** nativos del navegador, por lo que funciona directamente en GitHub Pages sin necesidad de compilación.

### Despliegue:
1. Subir todos los archivos al repositorio
2. Activar GitHub Pages en Settings → Pages
3. Seleccionar la rama `main` como fuente
4. Acceder a: `https://[usuario].github.io/[repositorio]/`

## 💾 Persistencia de Datos

Las inscripciones se guardan automáticamente en `localStorage` del navegador, por lo que persisten entre sesiones.

## 📱 Características

- ✅ Diseño responsive (móvil y escritorio)
- ✅ Calendario interactivo
- ✅ Modal con detalles de exámenes
- ✅ Sistema de inscripciones persistente
- ✅ Colores únicos por materia
- ✅ Touch-friendly (optimizado para móviles)

## 🛠️ Tecnologías

- HTML5
- CSS3 (Tailwind CSS via CDN)
- JavaScript ES6+ (Módulos nativos)
- LocalStorage API
