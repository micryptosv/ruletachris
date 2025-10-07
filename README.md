
# Ruleta Caliche PWA

PWA 100% estática lista para desplegar en GitHub + Vercel.

## Estructura
- **index.html**: markup principal y contenedores de modales.
- **styles.css**: estilos.
- **app.js**: lógica de ruleta, preguntas, modales, configuración y PWA.
- **manifest.webmanifest**: manifiesto PWA.
- **sw.js**: service worker (cache offline).
- **data/questions.json**: 50 preguntas (puedes editar).
- **data/prizes.json**: 12 premios (uno por segmento).
- **assets/intro.mp4**: tu video de intro (añádelo tú).
- **assets/icons/icon-192.png**, **icon-512.png**: íconos PWA.

## Personalización
- Edita `data/questions.json` y `data/prizes.json`.
- También puedes **importar/exportar** JSON desde el modal de **Config.** (botón arriba-derecha). Los cambios en tiempo de ejecución se guardan en **localStorage**; para que sean permanentes en el repo, exporta los JSON y reemplázalos en `/data`.

## Video de intro
Coloca tu archivo en `assets/intro.mp4`. Si el navegador bloquea el autoplay, el usuario puede tocar **Saltar** o cualquier click para mostrar la app.

## Desarrollo local
Abre `index.html` con un servidor estático (por CORS).
- Python: `python3 -m http.server 5173`
- Luego visita http://localhost:5173

## Deploy (GitHub + Vercel)
1. Sube todo este folder al repositorio en GitHub (por ejemplo `ruleta-pwa`).
2. En Vercel: **New Project** → importa tu repo → Framework: **Other** → Root: `/` → Build Command: **(vacío)** → Output: **/**.
3. Deploy. Listo. La PWA se instalará desde el navegador (icono de instalar).

### Nota sobre escritura de JSON en hosting estático
Los navegadores **no pueden escribir** directamente en archivos del servidor en hosting estático (GitHub/Vercel). Por eso, los cambios se guardan en **localStorage** y puedes **Exportar** los JSON para subirlos al repo cuando quieras actualizar los archivos del proyecto.
