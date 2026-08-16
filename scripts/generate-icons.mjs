/**
 * Gera os ícones PWA do app sem dependências externas.
 *
 * Desenha um coração branco sobre o azul da marca (#2563eb, o mesmo
 * theme-color já declarado em client/index.html e a cor do ícone Heart
 * no Dashboard), rasterizando a curva implícita do coração
 * (x² + y² − 1)³ − x²y³ ≤ 0 e escrevendo o PNG na mão via zlib nativo.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../client/public");

const BRAND = [0x25, 0x63, 0xeb]; // #2563eb
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/** Escreve um PNG RGBA de 8 bits a partir de um buffer de pixels. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  // Cada linha é prefixada pelo byte de filtro (0 = None).
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** (x² + y² − 1)³ − x²y³ ≤ 0 delimita o coração. */
function insideHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

/**
 * A curva ocupa x ∈ [−1.13, 1.13] e y ∈ [−1.36, 1.0] (bico embaixo), com
 * centro vertical em ≈ −0.18. `scale` define o alcance visível [−scale,
 * scale]: 1.82 deixa o coração ocupando ~65% do quadro, dentro da área
 * segura circular exigida por ícones maskable.
 */
function drawIcon(size, { scale = 1.82, yCenter = -0.18, samples = 3 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Supersampling para suavizar as bordas do coração.
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const fx = px + (sx + 0.5) / samples;
          const fy = py + (sy + 0.5) / samples;
          // Normaliza para [-scale, scale], com y invertido (a curva
          // tem o bico do coração em y negativo).
          const x = ((fx / size) * 2 - 1) * scale;
          const y = -(((fy / size) * 2 - 1) * scale) + yCenter;
          if (insideHeart(x, y)) hits++;
        }
      }

      const alpha = hits / (samples * samples);
      const idx = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[idx + c] = Math.round(BRAND[c] + (WHITE[c] - BRAND[c]) * alpha);
      }
      rgba[idx + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ["icon-192x192.png", 192],
  ["icon-512x512.png", 512],
  ["badge-72x72.png", 72],
];

for (const [name, size] of targets) {
  const png = drawIcon(size);
  writeFileSync(path.join(OUT_DIR, name), png);
  console.log(`gerado ${name} (${size}x${size}, ${png.length} bytes)`);
}
