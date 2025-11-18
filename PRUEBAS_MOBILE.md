# 📱 Guía de Pruebas Móviles

## ✅ Características Mobile-Friendly Implementadas

### 1. **Diseño Responsivo**
- ✅ Viewport configurado correctamente
- ✅ Fuente adaptable (texto más pequeño en móvil)
- ✅ Botones táctiles grandes (min 44x44px)
- ✅ Grid del calendario adaptativo

### 2. **Optimizaciones Táctiles**
- ✅ `touch-action: manipulation` - evita zoom accidental
- ✅ `-webkit-tap-highlight-color: transparent` - sin flash azul
- ✅ Eventos touch separados de click
- ✅ Detección de scroll vs tap

### 3. **Modal Móvil**
- ✅ Pantalla completa en móviles (< 640px)
- ✅ Modal centrado en tablets/desktop
- ✅ Cierre por swipe hacia abajo
- ✅ Scroll dentro del modal

### 4. **Performance**
- ✅ Carga asíncrona de datos
- ✅ Indicador de carga visible
- ✅ Sistema de fallback offline
- ✅ Cache control para móviles

### 5. **Navegación**
- ✅ Botones de mes grandes y fáciles de tocar
- ✅ Sticky header (se mantiene visible al scroll)
- ✅ Scroll suave
- ✅ Overscroll contenido

## 🧪 Cómo Probar en Móvil

### Opción 1: DevTools de Chrome (Desktop)
1. Abre Chrome DevTools (F12)
2. Click en el icono de móvil (Toggle Device Toolbar)
3. Selecciona un dispositivo (iPhone 12, Galaxy S20, etc.)
4. Recarga la página

### Opción 2: Servidor Local
1. Abre PowerShell en la carpeta del proyecto
2. Ejecuta un servidor HTTP:
   ```powershell
   # Con Python 3
   python -m http.server 8000
   
   # Con Node.js (si tienes http-server instalado)
   npx http-server
   ```
3. Abre en tu móvil: `http://[tu-ip]:8000`
   - Para encontrar tu IP: `ipconfig` en PowerShell
   - Busca "IPv4 Address" (ejemplo: 192.168.1.100)

### Opción 3: GitHub Pages (Recomendado)
1. Sube el código a GitHub
2. Activa GitHub Pages
3. Accede desde tu móvil a: `https://[usuario].github.io/[repo]/`

## 📋 Checklist de Pruebas Móviles

### Funcionalidad Básica
- [ ] La página carga correctamente
- [ ] El indicador de carga aparece y desaparece
- [ ] El calendario se muestra completo
- [ ] Los eventos son visibles y legibles

### Interacción Táctil
- [ ] Tap en un evento abre el modal
- [ ] El modal se abre sin lag
- [ ] Puedo cerrar el modal tocando fuera
- [ ] Puedo cerrar con swipe hacia abajo
- [ ] El botón "Inscribirme" funciona

### Navegación
- [ ] Los botones "Anterior" y "Siguiente" funcionan
- [ ] El mes cambia correctamente
- [ ] El sticky header funciona al hacer scroll
- [ ] Las inscripciones aparecen en la lista

### Persistencia
- [ ] Las inscripciones se guardan al recargar
- [ ] El localStorage funciona
- [ ] Los datos JSON se cargan correctamente

### Conexión Inestable
- [ ] En modo avión, muestra advertencia de offline
- [ ] Usa datos de fallback si no puede cargar JSON
- [ ] La app sigue funcionando sin conexión

### Diferentes Tamaños
- [ ] iPhone SE (375px) - móvil pequeño
- [ ] iPhone 12 (390px) - móvil estándar
- [ ] iPad (768px) - tablet
- [ ] Desktop (1920px) - escritorio

## 🔍 Elementos Específicos Móviles

### Tamaños de Fuente
| Elemento | Móvil | Desktop |
|----------|-------|---------|
| H1 | text-xl (20px) | text-3xl (30px) |
| Días calendario | text-[10px] | text-sm (14px) |
| Eventos | text-[9px] | text-xs (12px) |
| Botones | text-sm | text-base |

### Espaciado
| Elemento | Móvil | Desktop |
|----------|-------|---------|
| Container padding | p-2 (8px) | p-8 (32px) |
| Modal padding | p-4 (16px) | p-6 (24px) |
| Día calendario | p-1 (4px) | p-2 (8px) |

### Altura Mínima
- Días del calendario: `min-height: 80px` en móvil
- Modal: Pantalla completa en móvil
- Botones: Mínimo 44x44px (estándar Apple)

## 🐛 Solución de Problemas Móviles

### Problema: No carga en móvil
**Solución:**
- Verifica que estés usando HTTPS (GitHub Pages usa HTTPS)
- Revisa la consola del navegador móvil
- Asegúrate de que la ruta del JSON sea correcta

### Problema: Los eventos no son clicables
**Solución:**
- Verifica que `touch-action: manipulation` esté activo
- Aumenta el área táctil del evento
- Revisa que no haya elementos superpuestos

### Problema: El modal no se cierra
**Solución:**
- Toca fuera del modal (área oscura)
- Usa el botón X en la esquina
- Swipe hacia abajo desde el título

### Problema: Texto muy pequeño
**Solución:**
- El navegador permite zoom (max-scale=5.0)
- Las clases responsive ajustan automáticamente
- Considera aumentar los tamaños base si es necesario

## 🌐 Compatibilidad de Navegadores Móviles

| Navegador | Versión | Compatible |
|-----------|---------|------------|
| Safari iOS | 14+ | ✅ Sí |
| Chrome Android | 90+ | ✅ Sí |
| Firefox Android | 90+ | ✅ Sí |
| Samsung Internet | 14+ | ✅ Sí |
| Opera Mobile | 60+ | ✅ Sí |

## 📊 Métricas de Performance Móvil

### Objetivo
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1
- **FID** (First Input Delay): < 100ms

### Herramientas de Medición
- Google PageSpeed Insights
- Chrome DevTools Lighthouse (Mobile)
- WebPageTest (Mobile 3G/4G)

## 💡 Tips para Mejorar Experiencia Móvil

1. **Reduce el tamaño de imágenes** (si agregas alguna)
2. **Minimiza el JavaScript** (ya está modularizado)
3. **Usa Service Workers** para cache offline (futuro)
4. **Agrega un manifest.json** para PWA (futuro)
5. **Optimiza las fuentes** (Inter ya está optimizada)

---

**Última actualización**: 18 de Noviembre de 2025
