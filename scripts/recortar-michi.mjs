// Recorta la hoja de sprites de Michi en WebP con fondo transparente.
// Uso: node scripts/recortar-michi.mjs <hoja.jpg> [--solo-detectar]
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const [entrada, bandera] = process.argv.slice(2)
if (!entrada) throw new Error('Indica la ruta de la hoja de sprites')

const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const N = W * H
const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]]

// 1) Fondo = píxeles claros y poco saturados conectados al borde (relleno por inundación).
const pareceFondo = (i) => {
  const [r, g, b] = px(i)
  return Math.min(r, g, b) > 195 && Math.max(r, g, b) - Math.min(r, g, b) < 34
}
const fondo = new Uint8Array(N)
const pila = []
for (let x = 0; x < W; x++) pila.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y++) pila.push(y * W, y * W + W - 1)
while (pila.length) {
  const i = pila.pop()
  if (fondo[i] || !pareceFondo(i)) continue
  fondo[i] = 1
  const x = i % W, y = (i / W) | 0
  if (x > 0) pila.push(i - 1)
  if (x < W - 1) pila.push(i + 1)
  if (y > 0) pila.push(i - W)
  if (y < H - 1) pila.push(i + W)
}

// 2) Imagen RGBA: el fondo blanco se vuelve transparente; grises (sombras, antialias) quedan translúcidos y oscuros.
const rgba = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  const [r, g, b] = px(i)
  if (fondo[i]) {
    const lum = (r + g + b) / 3
    const a = Math.max(0, Math.min(1, (247 - lum) / 50))
    rgba.set([40, 24, 48, Math.round(a * 150)], i * 4)
  } else rgba.set([r, g, b, 255], i * 4)
}

// 3) Componentes conectados por franja de fila (las filas están muy juntas), sobre una rejilla
//    de 4 px con dilatación que une «zzz», «?», destellos y líneas de movimiento a su gato.
const C = 4, GW = Math.ceil(W / C), GH = Math.ceil(H / C)
const FRANJAS = [[0, 282], [282, 570], [570, 822], [822, H]]
const R = 3
const px4 = []
for (const [ya, yb] of FRANJAS) {
  const g0 = Math.floor(ya / C), g1 = Math.ceil(yb / C)
  const celda = new Uint8Array(GW * GH)
  for (let y = ya; y < yb; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!fondo[i] || rgba[i * 4 + 3] > 40) celda[((y / C) | 0) * GW + ((x / C) | 0)] = 1
    }
  const dil = new Uint8Array(GW * GH)
  for (let y = g0; y < g1; y++)
    for (let x = 0; x < GW; x++)
      if (celda[y * GW + x])
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const yy = y + dy, xx = x + dx
            if (yy >= g0 && yy < g1 && xx >= 0 && xx < GW) dil[yy * GW + xx] = 1
          }
  const visto = new Uint8Array(GW * GH)
  const fila = []
  for (let s = g0 * GW; s < g1 * GW; s++) {
    if (!dil[s] || visto[s]) continue
    const caja = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 }
    const q = [s]
    visto[s] = 1
    while (q.length) {
      const c = q.pop()
      const x = c % GW, y = (c / GW) | 0
      if (celda[c]) {
        caja.x0 = Math.min(caja.x0, x); caja.y0 = Math.min(caja.y0, y)
        caja.x1 = Math.max(caja.x1, x); caja.y1 = Math.max(caja.y1, y)
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, n = yy * GW + xx
        if (xx >= 0 && xx < GW && yy >= g0 && yy < g1 && dil[n] && !visto[n]) {
          visto[n] = 1
          q.push(n)
        }
      }
    }
    if (caja.x1 >= 0 && (caja.x1 - caja.x0) * (caja.y1 - caja.y0) > 100)
      fila.push({ x: caja.x0 * C, y: caja.y0 * C, w: (caja.x1 - caja.x0 + 1) * C, h: (caja.y1 - caja.y0 + 1) * C })
  }
  fila.sort((a, b) => a.x - b.x)
  px4.push(...fila)
}

if (bandera === '--solo-detectar') {
  px4.forEach((c, i) => console.log(i, JSON.stringify(c)))
  process.exit(0)
}

const NOMBRES = [
  'sentado', 'caminando', 'corriendo', 'durmiendo', 'asomado',
  'saludando', 'pensando', 'leyendo', 'martillo', 'balanza',
  'documento', 'libros', 'alerta', 'laptop', 'feliz',
  'enojado', 'espaldas', 'icono-balanza', 'icono-martillo', 'icono-libro', 'icono-pergamino', 'icono-laurel',
]
if (px4.length !== NOMBRES.length) throw new Error(`Se detectaron ${px4.length} sprites; se esperaban ${NOMBRES.length}`)

const salida = 'src/assets/michi'
mkdirSync(salida, { recursive: true })
const lienzo = sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
for (const [i, c] of px4.entries()) {
  const m = 6
  const x = Math.max(0, c.x - m), y = Math.max(0, c.y - m)
  const w = Math.min(W - x, c.w + 2 * m), h = Math.min(H - y, c.h + 2 * m)
  await lienzo
    .clone()
    .extract({ left: x, top: y, width: w, height: h })
    .resize({ height: 256, width: 256, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(`${salida}/${NOMBRES[i]}.webp`)
  console.log(NOMBRES[i], `${w}x${h}`)
}
