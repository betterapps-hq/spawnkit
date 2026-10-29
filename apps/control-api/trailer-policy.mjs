export const MAX_TRAILER_INPUT_BYTES = 2 * 1024 * 1024
export const MAX_TRAILER_BYTES = 2 * 1024 * 1024
export const MAX_TRAILER_SIDE = 640
export const MAX_TRAILER_SECONDS = 8

/** Validate the small, nonfragmented H.264 MP4 our encoder emits, without decoding video in a Worker. */
export function safeTrailerBytes(bytes) {
  const data = Buffer.from(bytes)
  if (data.length < 100 || data.length > MAX_TRAILER_BYTES) return false
  let budget = 512
  function boxes(start, end) {
    const result = []
    for (let at = start; at < end;) {
      if (--budget < 0 || at + 8 > end) throw new Error("Invalid MP4 boxes")
      const size = data.readUInt32BE(at)
      if (size < 8 || at + size > end) throw new Error("Invalid MP4 box size")
      result.push({ type: data.toString("ascii", at + 4, at + 8), start: at + 8, end: at + size })
      at += size
    }
    return result
  }
  const one = (items, type) => {
    const selected = items.filter((item) => item.type === type)
    if (selected.length !== 1) throw new Error("Missing or duplicate MP4 box")
    return selected[0]
  }
  const children = (box) => boxes(box.start, box.end)
  const minimum = (box, length) => {
    if (box.end - box.start < length) throw new Error("Truncated MP4 box")
  }
  const duration = (box) => {
    minimum(box, 20)
    if (data[box.start] !== 0) throw new Error("Unsupported MP4 duration")
    const scale = data.readUInt32BE(box.start + 12)
    const ticks = data.readUInt32BE(box.start + 16)
    if (!scale || !ticks || ticks / scale > MAX_TRAILER_SECONDS + 0.05) throw new Error("Invalid MP4 duration")
    return { scale, ticks }
  }
  try {
    const top = boxes(0, data.length)
    const ftyp = one(top, "ftyp")
    minimum(ftyp, 8)
    if (top[0] !== ftyp || data.toString("ascii", ftyp.start, ftyp.start + 4) !== "isom") return false
    const moov = one(top, "moov"),
      mdat = one(top, "mdat")
    if (
      moov.end > mdat.start ||
      mdat.end === mdat.start ||
      top.some((b) => !["ftyp", "moov", "free", "mdat"].includes(b.type))
    )
      return false
    const movie = children(moov)
    duration(one(movie, "mvhd"))
    const track = children(one(movie, "trak")) // exactly one track, so no audio or subtitles
    const tkhd = one(track, "tkhd")
    minimum(tkhd, 84)
    if (data[tkhd.start] !== 0) return false
    const width = data.readUInt32BE(tkhd.start + 76) / 65536
    const height = data.readUInt32BE(tkhd.start + 80) / 65536
    if (![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= MAX_TRAILER_SIDE)) return false
    const media = children(one(track, "mdia"))
    const timing = duration(one(media, "mdhd"))
    const handler = one(media, "hdlr")
    minimum(handler, 12)
    if (data.toString("ascii", handler.start + 8, handler.start + 12) !== "vide") return false
    const info = children(one(media, "minf"))
    const dinf = children(one(info, "dinf"))
    const dref = one(dinf, "dref")
    minimum(dref, 8)
    const reference = one(boxes(dref.start + 8, dref.end), "url ")
    minimum(reference, 4)
    if (data.readUInt32BE(dref.start + 4) !== 1 || data.readUInt32BE(reference.start) !== 1) return false
    const samples = children(one(info, "stbl"))
    const stsd = one(samples, "stsd")
    minimum(stsd, 8)
    if (data.readUInt32BE(stsd.start + 4) !== 1) return false
    const avc = one(boxes(stsd.start + 8, stsd.end), "avc1")
    minimum(avc, 78)
    if (data.readUInt16BE(avc.start + 24) !== width || data.readUInt16BE(avc.start + 26) !== height) return false
    const avcC = one(boxes(avc.start + 78, avc.end), "avcC")
    minimum(avcC, 7)
    if (data[avcC.start] !== 1) return false
    const stts = one(samples, "stts")
    minimum(stts, 16)
    const entries = data.readUInt32BE(stts.start + 4)
    if (!entries || entries > 240 || stts.end - stts.start !== 8 + entries * 8) return false
    let frames = 0,
      ticks = 0
    for (let at = stts.start + 8; at < stts.end; at += 8) {
      const count = data.readUInt32BE(at),
        delta = data.readUInt32BE(at + 4)
      if (!count || !delta || timing.scale / delta > 30) return false
      frames += count
      ticks += count * delta
    }
    return frames > 0 && frames <= 240 && ticks === timing.ticks
  } catch {
    return false
  }
}
