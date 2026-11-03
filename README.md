# Calendario de Exámenes

Web para elegir fechas de finales (Noviembre 2026 – Marzo 2027), publicada con GitHub Pages.

- **PC:** los 4 meses en una grilla 2×2 y, a la derecha, la agenda con todas las fechas.
- **Celular:** los meses apilados (scroll hacia abajo), cada uno con su agenda debajo.
- Arriba, la tarjeta **Próximo examen** con la cuenta regresiva.
- **Correlativas:** una materia queda bloqueada 🔒 hasta que te inscribas a su correlativa en una fecha **anterior**.
- Tus inscripciones se **sincronizan solas** entre dispositivos.

## Estructura

```
index.html            Página (Tailwind por CDN)
data/events.json      Fechas, correlativas, sede y colores  ← lo que se edita
js/app.js             Arranque y coordinación
js/calendar.js        Grilla de meses
js/agenda.js          Lista de fechas (columna derecha en PC, debajo de cada mes en celular)
js/nextExam.js        Tarjeta "Próximo examen"
js/modal.js           Detalle de una fecha + inscribirse / cambiar / cancelar
js/subscriptions.js   "Mis inscripciones"
js/locks.js           Lógica de correlativas
js/storage.js         localStorage + guardado automático en la nube
js/cloud.js           Lectura/escritura en GitHub
js/utils.js           Fechas, colores, helpers
```

## Sincronización entre dispositivos

Las inscripciones se guardan en `subscriptions.json` en la rama **`data`** del repo (no en `main`, así
el historial queda limpio y Pages no se vuelve a publicar en cada cambio).

- **Leer** no requiere nada: cualquier dispositivo ve tus inscripciones (el repo es público).
- **Escribir** requiere un token de GitHub guardado en ese dispositivo (botón ⚙️). Se pega una sola vez.
  Crealo en GitHub → Settings → Developer settings → **Fine-grained tokens**, solo para el repo
  `calendario_examenes`, con permiso **Contents: Read and write**.
- Cada cambio se guarda local al instante y se sube solo ~1,5 s después. El indicador de arriba muestra
  `☁️ Sincronizado`, `⏳ Guardando…`, `⚠️ Sin subir` (tocalo para reintentar) o `👁️ Solo lectura`.
- Si la rama `data` no existe, se crea sola en el primer guardado.

## Actualizar fechas o correlativas

Ver [GUIA_ACTUALIZACION.md](GUIA_ACTUALIZACION.md).

## Probar localmente

Los módulos ES necesitan un servidor (no abre con doble clic):

```bash
python -m http.server 8000
# abrir http://localhost:8000
```
