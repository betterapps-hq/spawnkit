export const MAX_COVER_INPUT_BYTES = 1024 * 1024
export const MAX_COVER_BYTES = 384 * 1024
export const MAX_COVER_SIDE = 960

/** Inspect the bounded, single-frame WebP format our encoder emits; never decode pixels in the Worker. */
export function safeCoverBytes(bytes) {
  const data = Buffer.from(bytes)
  if (
    data.length < 30 ||
    data.length > MAX_COVER_BYTES ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WEBP" ||
    data.readUInt32LE(4) !== data.length - 8
  )
    return false
  let width = 0,
    height = 0,
    canvasWidth = 0,
    canvasHeight = 0,
    alpha = false
  for (let offset = 12; offset < data.length;) {
    if (offset + 8 > data.length) return false
    const type = data.toString("ascii", offset, offset + 4)
    const size = data.readUInt32LE(offset + 4)
    const start = offset + 8,
      end = start + size
    if (end + (size % 2) > data.length || (size % 2 && data[end] !== 0)) return false
    if (type === "VP8X") {
      // Only transparency is allowed. No animation, metadata or unknown flags.
      if (offset !== 12 || size !== 10 || data[start] & ~0x10 || data.readUIntLE(start + 1, 3)) return false
      canvasWidth = data.readUIntLE(start + 4, 3) + 1
      canvasHeight = data.readUIntLE(start + 7, 3) + 1
      if (canvasWidth > MAX_COVER_SIDE || canvasHeight > MAX_COVER_SIDE) return false
    } else if (type === "ALPH") {
      if (!canvasWidth || alpha || width || size < 1) return false
      alpha = true
    } else if (type === "VP8 ") {
      if (width || size < 10 || data[start] & 1 || data.readUIntLE(start + 3, 3) !== 0x2a019d) return false
      width = data.readUInt16LE(start + 6) & 0x3fff
      height = data.readUInt16LE(start + 8) & 0x3fff
      if (!width || !height || width > MAX_COVER_SIDE || height > MAX_COVER_SIDE) return false
    } else return false
    offset = end + (size % 2)
  }
  return Boolean(width && (!canvasWidth || (canvasWidth === width && canvasHeight === height)))
}
