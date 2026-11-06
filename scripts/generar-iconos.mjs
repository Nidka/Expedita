// Genera los íconos de la app instalable (PWA) a partir de Michi.
// Uso: node scripts/generar-iconos.mjs
import sharp from 'sharp'

const FONDO = '#F4F2EE'
const ORIGEN = 'src/assets/michi/sentado.webp'

/** Michi centrado sobre fondo liso; `escala` es la altura del gato respecto del lienzo. */
async function icono(tam, escala, salida) {
  const alto = Math.round(tam * escala)
  const gato = await sharp(ORIGEN).resize({ height: alto, kernel: 'lanczos3' }).toBuffer()
  await sharp({ create: { width: tam, height: tam, channels: 4, background: FONDO } })
    .composite([{ input: gato, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(salida)
}

await icono(192, 0.78, 'public/icono-192.png')
await icono(512, 0.78, 'public/icono-512.png')
// Enmascarable: el contenido queda dentro de la zona segura (círculo del 80 %)
await icono(512, 0.58, 'public/icono-mascara.png')
console.log('Íconos generados')
