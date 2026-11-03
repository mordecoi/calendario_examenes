# Guía de actualización

Todo se edita en **`data/events.json`**. Después: commit + push a `main` y GitHub Pages se actualiza en 1-2 minutos.

## Fechas (`events`)

Una línea por fecha y división:

```json
{"date": "2026-11-24", "time": "18:00", "div": "A", "prof": "FUNES", "subj": "INFORMÁTICA INDUSTRIAL", "loc": "CAMPUS"}
```

- `date`: `YYYY-MM-DD` · `time`: `HH:MM` (24 h)
- `subj`: el nombre tiene que ser **idéntico** en todas las fechas de la materia (se usa para colores,
  inscripciones y correlativas).
- `loc`: una clave de `locations`.
- Los meses que se muestran salen solos de las fechas cargadas (si no hay fechas en enero, enero no aparece).

## Correlativas (`correlatives`)

```json
"correlatives": {
  "MÉTODOS NUMÉRICOS": ["INFORMÁTICA INDUSTRIAL"],
  "MATERIA B": ["MATERIA A", "MATERIA C"]
}
```

Se lee: *para rendir MÉTODOS NUMÉRICOS tenés que estar inscripto a INFORMÁTICA INDUSTRIAL en un día
anterior*. Si tiene varias correlativas, hacen falta todas. Si una correlativa ya la aprobaste, no la pongas.

Si cancelás o movés la correlativa, la inscripción que dependía de ella **no se borra**: queda marcada con ⚠️.

## Sede (`locations`)

```json
"CAMPUS": { "address": "DONATO ALVAREZ 380 - ...", "phone": "+54 (351) 4144444" }
```

## Configuración (`config`)

- `colors`: paleta; cada materia recibe un color fijo (en orden alfabético).
- `period`: texto que aparece debajo del título.
- `version`, `lastUpdated`: actualizalos al editar.

## ¿Actualizar fechas borra lo que ya elegí?

No. Tus elecciones están en la rama `data` (y en cada dispositivo), separadas de `events.json`. Al cargar
fechas nuevas:

- Si tu fecha sigue igual, queda igual.
- Si cambió el horario o la división pero la materia sigue ese mismo día, tu elección se actualiza sola.
- Si tu fecha desapareció del calendario, se **conserva** marcada con ⚠️ para que elijas otra.
- Solo se descartan elecciones de un período anterior (fechas antes del primer examen cargado).
