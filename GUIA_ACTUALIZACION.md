# 🎯 Guía de Actualización de Fechas

Esta guía te explica cómo actualizar las fechas de exámenes de forma fácil y segura.

## 📝 Archivo Principal: `data/events.json`

Este es el **único archivo que necesitas editar** para actualizar fechas, profesores, horarios o ubicaciones.

## 🔧 Cómo Actualizar un Evento

### Paso 1: Abrir el archivo
Abre `data/events.json` en cualquier editor de texto.

### Paso 2: Encontrar el evento
Busca el evento que quieres modificar en el array `events`.

### Paso 3: Editar los campos
Cada evento tiene estos campos:

```json
{
  "date": "2025-11-25",        // Fecha en formato YYYY-MM-DD
  "time": "16:00",             // Hora en formato HH:MM (24 horas)
  "div": "A",                  // División (A, B, C, E, F, H, M, etc.)
  "prof": "GENCARELLI",        // Apellido del profesor
  "subj": "INGINF-2014 LABORATORIO IV",  // Materia completa
  "loc": "CAMPUS"              // Ubicación (CAMPUS o CORDOBA)
}
```

### Paso 4: Actualizar la fecha de modificación
Al final del archivo, actualiza:

```json
"config": {
  "lastUpdated": "2025-11-25"  // ← Cambiar a la fecha actual
}
```

### Paso 5: Guardar y probar
1. Guarda el archivo
2. Recarga la página web
3. Verifica que los cambios aparecen correctamente

## ➕ Agregar un Nuevo Evento

Copia un evento existente y modifica todos los campos:

```json
{
  "date": "2025-12-20",
  "time": "09:00",
  "div": "A",
  "prof": "NUEVO PROFESOR",
  "subj": "INGINF-2014 NUEVA MATERIA",
  "loc": "CAMPUS"
}
```

**⚠️ Importante**: No olvides agregar una coma (`,`) después del evento anterior.

## ❌ Eliminar un Evento

1. Encuentra el evento en el array
2. Elimina todo el objeto `{ ... }`
3. Asegúrate de que las comas estén correctas

## 🏢 Agregar una Nueva Ubicación

En la sección `locations`, agrega:

```json
"NUEVA_SEDE": {
  "address": "Dirección completa",
  "phone": "+54 (351) 1234567"
}
```

## ✅ Lista de Verificación

Antes de guardar, verifica:

- [ ] Todas las fechas están en formato `YYYY-MM-DD`
- [ ] Todas las horas están en formato `HH:MM` (24 horas)
- [ ] No faltan ni sobran comas
- [ ] Las comillas `"` están correctamente cerradas
- [ ] Actualizaste `lastUpdated`

## 🆘 Solución de Problemas

### El calendario no carga / pantalla en blanco
- Revisa la consola del navegador (F12)
- Probablemente hay un error de sintaxis en el JSON
- Usa un validador JSON online: https://jsonlint.com/

### Los eventos no aparecen
- Verifica que la fecha esté en el formato correcto
- Asegúrate de que el evento esté dentro del array `events`

### Colores diferentes cada vez
- Los colores se asignan automáticamente según el nombre de la materia
- Para que sean consistentes, el nombre de la materia debe ser idéntico

## 🔄 Sincronización con Git

Después de modificar `events.json`:

```bash
git add data/events.json
git commit -m "Actualizar fechas de exámenes"
git push origin main
```

Los cambios se reflejarán automáticamente en GitHub Pages en 1-2 minutos.

## 📞 Soporte

Si tienes problemas, verifica:
1. El archivo `FECHAS_VERIFICADAS.md` para ver el formato correcto
2. La consola del navegador para mensajes de error
3. Que el archivo JSON sea válido en https://jsonlint.com/

---

**Recuerda**: `data/events.json` es la fuente única de verdad. Cualquier cambio aquí se reflejará en toda la aplicación.
