# Sonora

Reproductor de escritorio para Windows (Electron + React + Vite): música en la nube vía **Audius** y, si quieres, archivos locales (MP3, FLAC, etc.).

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)

## Instalación

```bash
git clone https://github.com/ZRfax/App-Musica.git
cd App-Musica
npm install
```

## Ejecutar en modo desarrollo

```bash
npm run dev
```

## Generar el ejecutable portable (.exe)

Compila el código y empaqueta la app (nombre **Sonora**):

```bash
npm run package
```

O el alias:

```bash
npm run package:win
```

El ejecutable queda en:

`dist/Sonora-win32-x64/Sonora.exe`

Cada vez que cambies el código, vuelve a ejecutar `npm run package` para regenerar esa carpeta. La carpeta antigua `App Musica-win32-x64` (si existía) ya no se usa.

**Si aparece `EBUSY: resource busy or locked`:** cierra **Sonora.exe**, cierra el Explorador de archivos si tenía abierta esa carpeta y vuelve a ejecutar `npm run package`. Si sigue bloqueado, reinicia el Explorador o el PC, o borra manualmente `dist\Sonora-win32-x64` y empaqueta otra vez.

## Instalador NSIS (opcional)

```bash
npm run build:win
```

El instalador se genera en `dist-installer/` (por ejemplo `Sonora-Setup-1.0.0.exe`), separado de la carpeta portable `dist/`.

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+Shift+M` | Abrir / mostrar el mini reproductor |

## Funciones

- **Nube:** tendencias y búsqueda en Audius (sin carpeta obligatoria)
- **Local:** elegir carpeta con MP3, FLAC, WAV, M4A, OGG; se recuerda la última ruta
- Mini reproductor flotante (`Ctrl+Shift+M`)
- Favoritos, más reproducidas, playlists y búsqueda
- Control de progreso y volumen
