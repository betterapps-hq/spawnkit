import { constants, crc32, deflateSync, inflateSync } from "node:zlib"

const signature = Buffer.from("89504e470d0a1a0a", "hex")

// Recompress only the PNG data stream: filters, pixels and metadata remain byte-identical.
// Never transcode textures automatically: lossy encoding can change masks and game data.
export function compressPng(input) {
  if (input.length > 4 * 1024 * 1024 || !input.subarray(0, 8).equals(signature)) return input
  const chunks = []
  let offset = 8
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset)
    if (length > input.length - offset - 12) return input
    const chunk = input.subarray(offset, offset + length + 12)
    const type = chunk.toString("ascii", 4, 8)
    if (crc32(chunk.subarray(4, -4)) !== chunk.readUInt32BE(chunk.length - 4)) return input
    if (type === "acTL") return input // Animated PNG is left untouched.
    chunks.push({ type, chunk })
    offset += chunk.length
    if (type === "IEND") break
  }
  if (
    offset !== input.length ||
    chunks[0]?.type !== "IHDR" ||
    chunks[0].chunk.length !== 25 ||
    chunks.at(-1)?.type !== "IEND"
  )
    return input
  const header = chunks[0].chunk
  const width = header.readUInt32BE(8),
    height = header.readUInt32BE(12)
  if (!width || !height || width * height > 16_777_216) return input
  const first = chunks.findIndex((chunk) => chunk.type === "IDAT")
  if (first < 0) return input
  let last = first
  while (chunks[last + 1]?.type === "IDAT") last++
  if (chunks.slice(last + 1).some((chunk) => chunk.type === "IDAT")) return input
  const compressed = Buffer.concat(chunks.slice(first, last + 1).map(({ chunk }) => chunk.subarray(8, -4)))
  // Bound decompression independently of the untrusted header; keep malformed inputs unchanged.
  const raw = inflateSync(compressed, { maxOutputLength: 64 * 1024 * 1024 })
  let best = compressed
  for (const strategy of [constants.Z_DEFAULT_STRATEGY, constants.Z_FILTERED]) {
    const candidate = deflateSync(raw, { level: 9, strategy })
    if (candidate.length < best.length) best = candidate
  }
  const idat = Buffer.alloc(best.length + 12)
  idat.writeUInt32BE(best.length)
  idat.write("IDAT", 4)
  best.copy(idat, 8)
  idat.writeUInt32BE(crc32(idat.subarray(4, -4)), idat.length - 4)
  const result = Buffer.concat([
    signature,
    ...chunks.slice(0, first).map(({ chunk }) => chunk),
    idat,
    ...chunks.slice(last + 1).map(({ chunk }) => chunk)
  ])
  return result.length < input.length ? result : input
}

export function optimizeGameImages(files, paths, log = console.log) {
  const optimized = []
  for (const path of paths) {
    const file = files.find((file) => file.path === path)
    if (!file) continue
    const input = Buffer.from(file.content, "base64")
    try {
      const output = compressPng(input)
      if (output.length < input.length) {
        optimized.push({ path, content: output.toString("base64") })
        log(`Game image optimized losslessly: ${JSON.stringify(path)} ${input.length} → ${output.length} bytes`)
      }
    } catch {
      log(`Game image kept unchanged: ${JSON.stringify(path)} could not be safely recompressed.`)
    }
  }
  return optimized
}
