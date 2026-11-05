#!/usr/bin/env python3
"""
Decoder for the navigation's skin bitmaps (NNG "RL" format, Mazda Connect firmware 74, NNG 9.12).
Worked out from Mazda's files; used by tools/extract_nav_table.py and for previews.

Layout (little-endian):
  'RL', u16 version, u16 width, u16 height, u16 colours (n), u16 height again,
  n x u16 RGB565 palette (entry 0 = 0xF81F, the transparent key),
  n x u8 alpha (0 = clear .. 32 = solid),
  row-length table (one u8 per row, or one u16 per row in files with long rows),
  then each row as a stream of:
    0xFF k       k transparent pixels
    0xFE i k     k pixels of colour base+i
    0xFD lo hi   base = hi * 256 + lo (palettes can be larger than 256)
    other b      one pixel of colour base+b
Files that start with 'BM' are ordinary 32-bit Windows bitmaps (BGRA, straight alpha, bottom-up);
the navigation reads both, and Home 2.0 writes BM.

Usage: python3 tools/nng_rl.py <out folder> <file.bmp>...   (writes PNGs)
"""
import io
import os
import struct
import sys

from PIL import Image


def _rows(b, w, h, n, off):
    px = [None] * (w * h)
    p = off
    for y in range(h):
        x = 0
        base = 0
        while x < w:
            c = b[p]
            if c == 0xFF:
                x += b[p + 1]
                p += 2
            elif c == 0xFE:
                i = base + b[p + 1]
                k = b[p + 2]
                p += 3
                if i >= n:
                    raise ValueError("colour index out of range")
                for _ in range(k):
                    if x < w:
                        px[y * w + x] = i
                    x += 1
            elif c == 0xFD:
                base = b[p + 1] | (b[p + 2] << 8)
                p += 3
            else:
                i = base + c
                if i >= n:
                    raise ValueError("colour index out of range")
                px[y * w + x] = i
                x += 1
                p += 1
    if p != len(b):
        raise ValueError("%d bytes left over" % (len(b) - p))
    return px


def decode(b):
    if b[:2] != b"RL":
        raise ValueError("not an RL bitmap")
    _ver, w, h, n, _h2 = struct.unpack("<5H", b[2:12])
    pal = struct.unpack("<%dH" % n, b[12:12 + 2 * n])
    alpha = b[12 + 2 * n:12 + 3 * n]
    err = None
    for row_bytes in (1, 2):
        try:
            idx = _rows(b, w, h, n, 12 + 3 * n + row_bytes * h)
            break
        except (ValueError, IndexError) as e:
            err = e
    else:
        raise ValueError("cannot decode: %s" % err)
    out = bytearray(w * h * 4)
    for k, i in enumerate(idx):
        if i is None:
            continue
        c = pal[i]
        out[4 * k:4 * k + 4] = bytes((((c >> 11) & 31) * 255 // 31, ((c >> 5) & 63) * 255 // 63,
                                      (c & 31) * 255 // 31, min(255, alpha[i] * 255 // 32)))
    return Image.frombytes("RGBA", (w, h), bytes(out))


def load_bytes(b):
    if b[:2] == b"BM":
        return Image.open(io.BytesIO(b)).convert("RGBA")
    return decode(b)


def load(path):
    with open(path, "rb") as f:
        return load_bytes(f.read())


if __name__ == "__main__":
    for path in sys.argv[2:]:
        try:
            load(path).save(os.path.join(sys.argv[1], os.path.splitext(os.path.basename(path))[0] + ".png"))
        except ValueError as e:
            print("FAIL", path, e)
