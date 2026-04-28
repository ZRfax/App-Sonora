# 📖 Guía de Inicio - App Música

## Instalación y Ejecución

### 1. **Instalar dependencias**

```bash
npm install
```

### 2. **Ejecutar en modo desarrollo**

```bash
npm run dev
```

### 3. **Construir la aplicación**

```bash
npm run build:win  # Para Windows
# o
npm run build      # Build genérico
```

---

## ✅ Verificación de Características

Después de ejecutar `npm run dev`, verifica que funcione:

### ✨ Barra de Búsqueda

1. Ve al sidebar izquierdo (después del botón Home)
2. Verás un campo de búsqueda elegante
3. Escribe un nombre de canción/artista
4. Las canciones se filtran automáticamente

### 🎵 Panel Flotante

1. En la esquina superior izquierda verás un "🎵 Music Control"
2. Contiene:
   - 📀 Carátula de la canción actual
   - ⏮️ Botones de reproducción (Anterior, Play/Pause, Siguiente)
   - 🔊 Control de volumen
   - 🔍 Botón de búsqueda rápida
3. **PUEDES ARRASTRARLO** - Click en el título y arrastra
4. **OCULTAR** - Click en ⬆️ para minimizar

### 🎼 Reproducción

1. Añade una carpeta de música (botón "Add Folder")
2. Haz doble-click en una canción
3. Usa los controles del panel flotante o la barra inferior
4. Busca otras canciones usando la barra de búsqueda

---

## 🐛 Troubleshooting

### No funciona la búsqueda

- Verifica que hayas añadido canciones primero
- Intenta en Library con canciones visibles

### El panel flotante no aparece

- Desplázate arriba/izquierda (x:20, y:20)
- Podría estar fuera de pantalla
- Actualiza (F5) o reinicia la app

### Las canciones no suena

- Verifica que los archivos MP3 existan
- Comprueba que browser permite audio
- Check console (F12) para errores

---

## 📂 Estructura de Archivos Importante

```
src/
├── main/
│   └── index.ts          # Electron main process mejorado
├── preload/
│   └── index.ts          # APIs expuestas
└── renderer/
    └── src/
        ├── App.tsx                    # App principal con FloatingPlayer
        ├── store/
        │   └── playerStore.ts         # Zustand store con búsqueda
        └── components/
            ├── SearchBar.tsx          # NUEVO - Barra de búsqueda
            ├── SearchBar.css          # NUEVO - Estilos búsqueda
            ├── FloatingPlayer.tsx     # NUEVO - Panel flotante
            ├── FloatingPlayer.css     # NUEVO - Estilos panel
            ├── Library.tsx            # Mejorado - Usa filteredPlaylist
            ├── PlayerControls.tsx
            └── Sidebar.tsx            # Mejorado - Incluye SearchBar
```

---

## 🔧 Variables de Desarrollo

Si necesitas debuggear:

```javascript
// En console (F12)
window.api.selectFolder(); // Abre folder picker
```

---

## 📊 Estado Zustand Disponible

En console puedes ver el estado actual:

```javascript
// Ver estado completo
console.log(usePlayerStore.getState());

// Llamar acciones
usePlayerStore.getState().searchSongs("nirvana");
usePlayerStore.getState().clearSearch();
usePlayerStore.getState().playSong(song);
```

---

## 🎯 Próximos Pasos Recomendados

1. ✅ Prueba la búsqueda con tus canciones
2. ✅ Practica arrastrar el panel flotante
3. ✅ Experimenta con el control de volumen
4. ✅ Usa los atajos Play/Pause
5. ✅ Reporta bugs que encuentres

---

**¡Disfruta tu app de música! 🎶**
