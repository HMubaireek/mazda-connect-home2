#!/usr/bin/env python3
"""Read-only inventory and integrity check of an NNG navigation SD card copy.

Usage: py -3.11 -I tools/inspect_nav_sd.py <path to the card's content folder> [--zips]

Never writes anything. For every file it reports the kind (see docs/nav-sd-content.md)
and checks the matching .sgn:
  u32 LE version (=1) | 128-byte signature (NNG's private key; cannot be re-made)
  | u32 LE CRC32 of each 4096-byte block of the file (last block may be short).
A file whose CRCs no longer match its .sgn is rejected by the navigation
("Signature error in file: ..." in the NNG binary).
"""
import os
import struct
import sys
import zipfile
import zlib

BLOCK = 4096
SIG_LEN = 128

KINDS = {
    "fbl": "map: roads/areas (licence-encrypted)",
    "fsp": "map: speed profiles (licence-encrypted)",
    "fpa": "map: address points (licence-encrypted)",
    "poi": "POI database (licence-encrypted)",
    "3dc": "3D city/building blocks (licence-encrypted)",
    "3dl": "3D landmarks (licence-encrypted)",
    "ph": "TTS/VR phonemes (licence-encrypted)",
    "dem": "elevation model, 'DEMP' header (SRTM V3 2006)",
    "fcf": "Nuance ASR grammar (voice recognition)",
    "nng": "NNG id/signature blob",
    "ini": "plain INI",
    "zip": "plain zip",
}


def check_sgn(path):
    """Return (status, detail) for path against path + '.sgn'."""
    sgn = path + ".sgn"
    if not os.path.exists(sgn):
        return "no-sgn", ""
    data = open(path, "rb").read()
    s = open(sgn, "rb").read()
    blocks = max(1, -(-len(data) // BLOCK))
    want = 4 + SIG_LEN + 4 * blocks
    if len(s) != want:
        return "BAD", "sgn is %d bytes, expected %d" % (len(s), want)
    ver = struct.unpack("<I", s[:4])[0]
    crcs = struct.unpack("<%dI" % blocks, s[4 + SIG_LEN:])
    bad = [i for i in range(blocks)
           if zlib.crc32(data[i * BLOCK:(i + 1) * BLOCK]) & 0xFFFFFFFF != crcs[i]]
    if bad:
        return "BAD", "v%d, %d/%d blocks changed (first at byte %d)" % (
            ver, len(bad), blocks, bad[0] * BLOCK)
    return "ok", "v%d, %d blocks" % (ver, blocks)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    root = args[0]
    show_zips = "--zips" in sys.argv
    counts = {}
    for dp, dn, fn in os.walk(root):
        dn.sort()
        for f in sorted(fn):
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, root).replace(os.sep, "/")
            if f.endswith(".sgn"):
                if not os.path.exists(p[:-4]):
                    print("%-6s %-48s orphan signature" % ("BAD", rel))
                continue
            ext = f.rsplit(".", 1)[-1].lower()
            status, detail = check_sgn(p)
            counts[status] = counts.get(status, 0) + 1
            print("%-6s %-48s %10d  %-44s %s" % (
                status, rel, os.path.getsize(p), KINDS.get(ext, "?"), detail))
            if show_zips and ext == "zip":
                with zipfile.ZipFile(p) as z:
                    for i in z.infolist():
                        print("         - %-60s %9d" % (i.filename, i.file_size))
    print("\n" + ", ".join("%s: %d" % kv for kv in sorted(counts.items())))
    if counts.get("BAD"):
        sys.exit(1)


if __name__ == "__main__":
    main()
