# Calendario de Exámenes

Aplicación web para gestionar las inscripciones a exámenes finales. Compatible con GitHub Pages.

## 📁 Estructura del Proyecto

```
calendario_examenes/
├── index.html              # Página principal (HTML + CSS)
├── data/                   # Datos de la aplicación
│   └── events.json        # Base de datos de eventos (persistente)
└── js/                     # Módulos JavaScript (ES6)
    ├── app.js             # Punto de entrada principal
    ├── calendar.js        # Lógica del calendario
    ├── data.js            # Cargador de datos desde JSON
    ├── modal.js           # Gestión del modal
    ├── storage.js         # Manejo de localStorage
    ├── subscriptions.js   # Lista de inscripciones
    └── utils.js           # Utilidades generales
```

## 🔧 Módulos

### `data/events.json` ⭐ NUEVO
Archivo JSON con la base de datos de eventos. **Este es el archivo que debes editar** para actualizar fechas, profesores o agregar nuevos exámenes.

Estructura:
```json
{
  "events": [...],      // Array de eventos
  "locations": {...},   // Ubicaciones disponibles
  "config": {           // Configuración
    "colors": [...],
    "version": "1.0.0",
    "lastUpdated": "2025-11-18"
  }
}
```

### `app.js`
Punto de entrada de la aplicación. Inicializa y coordina todos los módulos.

### `calendar.js`
Renderizado del calendario y controles de navegación entre meses.

### `data.js`
Carga dinámicamente los datos desde `events.json`. Incluye un sistema de fallback que usa datos embebidos si el JSON no se puede cargar.

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

### Datos de Eventos (events.json)
Los eventos se almacenan en `data/events.json`. Este archivo es la **fuente única de verdad** para todos los exámenes.

### Inscripciones de Usuarios (localStorage)
Las inscripciones se guardan automáticamente en `localStorage` del navegador, por lo que persisten entre sesiones.

## 📝 Cómo Actualizar Fechas de Exámenes

1. Abre el archivo `data/events.json`
2. Modifica, agrega o elimina eventos en el array `events`
3. Actualiza el campo `lastUpdated` con la fecha actual
4. Guarda el archivo
5. Los cambios se reflejarán automáticamente al recargar la página

### Ejemplo de evento:
```json
{
  "date": "2025-12-01",
  "time": "17:00",
  "div": "A",
  "prof": "CALIGARIS",
  "subj": "INGINF-2014 SISTEMAS DE BASES DE DATOS",
  "loc": "CAMPUS"
}
```

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
