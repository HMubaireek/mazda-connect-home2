# Navigation SD card: what is on it (researched 7 Nov 2026)

Source: `C:\maps-rea\nav-sd\content`, a copy of the car's navigation SD card (`/mnt/sd_nav/content`).
It is byte-identical to `Downloads\Mazda\nav-sd-backup-2026-11-05\content` (that backup also has
`license/`, `label.txt`, `card_md5.txt`). Map release: **HERE 2017 Q4, region GCC**
(`DbVersion.zip/info.ini`: `cpv_nng="HMGCC2017Q4"`, part `BHW6 66 EZ1J`, `device_name="JCIMazda"`).
Read by NNG iGO 9.12 (`/jci/nng/jci-linux_imx6_volans-release`) through
`config/devices/jci_cmu.ini` in the car's `data.zip`:

```
[folders]  content="%SDCARD%/content"   keep_first_loaded_content_file=1
[device]   device_nng_path_primary="%sdcard%/license"
```

Labels: **observed** = checked on the bytes; **inferred** = likely, not proven; **unknown** = open.

## Folders

| Folder | Files | What it is |
|---|---|---|
| `map/` | `<Country>.fbl` / `.fsp` / `.fpa`, `Basemap.fbl` | Roads and areas / speed profiles / address points. Licence-encrypted. |
| `poi/` | `<Country>.poi` | POI database. Licence-encrypted. |
| `building/` | `<Country>.3dc` / `.3dl` | 3D city blocks / 3D landmarks. Licence-encrypted. |
| `phoneme/` | `<Country>.ph`, `<Country>_vr.ph` | Pronunciations of street names for voice guidance and voice recognition. Licence-encrypted. |
| `dem/` | `<Continent>.dem` | Elevation. Header `DEMP`, v1, UTF-16 text "SRTM data V3, 2006"; body compressed. |
| `vr/_KSA` etc. | `info.ini`, `content*.nng`, `signature.nng`, `ARW/city.fcf`, `city_street.fcf`, `street.zip` | Nuance voice-recognition grammars ("Here-Nuance-Jci 17Q4"), Arabic (ARW) acoustic model. `street.zip` = one `.fcf` per city id. Has its own `signature.nng` (256 bytes) instead of `.sgn`. |
| `lang/` | `Lang_<Language>.zip` | UI text for the map. Plain zip: `info.ini` + `i18n/Dictionary.lang` (UTF-16 LE INI, `[words]` key="text"). Arabic: `r2l=1`, `iso_lang="ar-ae"`. |
| `voice/` | `Voice_TTS-nua-<lang>-lua.zip` | Voice-guidance phrase rules for Nuance TTS: Lua (`config/*.lua`) + `i18n/dictionary.voice`. Plain. |
| `global_cfg/` | `global_cfg.zip` | Shared config: POI providers (`config/global_cfg.ini`, has `[poi.kmlpoi] "KML POIs"`, `[poi.userpoi]`), `poi_mapping.ini`, `signpost_colors.csv` (per-country sign colours), `country_info.ini`, `timezones.ini`, TMC tables, and ~3000 BMP icons (`images/da` driver alerts, `provider`, `tmc`, `flags`) at high/mid/low sizes. Plain. |
| (root) | `DbVersion.zip` | Content package id (`info.ini`) + `content.nng`. |

Every data file except the `vr/` metadata has a matching `<file>.sgn`. 140 data files, 280 files in all.

## `.sgn` signature files (observed on all 140)

```
u32 LE  version            = 1
128 B   signature          (inferred: RSA-1024 by NNG over the CRC table; we can't make one)
u32 LE  CRC32 of block 0   (zlib CRC32 of each 4096-byte block; last block may be short)
u32 LE  CRC32 of block 1
...
size = 4 + 128 + 4 * ceil(file size / 4096)
```

The NNG binary has the message `Signature error in file: `. So **any edit to a signed file is
rejected** unless NNG's private key re-signs it. That rules out editing the plain zips in place too
(`lang/`, `voice/`, `global_cfg/`). Check: `py -3.11 -I tools/inspect_nav_sd.py <content folder> [--zips]`
(read-only; exits 1 if any file no longer matches its `.sgn`).

## Encrypted files (observed, stopped on purpose)

`.fbl .fsp .fpa .poi .3dc .3dl .ph` have entropy ~7.96 from byte 0, with no magic number.
- Bytes 0-512 are 90-100% identical between countries of the same type (Bahrain.fbl vs Qatar.fbl).
  Inferred: a fixed keystream over a common header.
- After 4 KiB the files share ~0-5% of their bytes: the bodies differ.

The binary opens each type through a licence decoder (`ILICENSE_DISTRIBUTOR_IGOMAP`, `..._DEM`,
`..._ADDRESSPOINT`, `..._SPEEDPROFILE`, `..._DICTIONARY`, `..._JUNCTIONVIEW`...) and logs
"file open failed due to license error". The licence (`license/device.nng` + `.lyc`) is locked to the
VIN. Decrypting these files would mean defeating NNG's licence protection, so this research stops
there. New map, POI or building data comes only from a Naviextras update.

## What can be changed, and where

1. **Map look (colours, icons, fonts, layout)**: lives in the **car**, not on the card. It is in
   `/jci/nng/data.zip` (`ui_jci_mazda/scheme/day|night/color.ini`, `800_480/`, `fonts/`) and the
   `/jci/nng/ux/*.zip` plug-ins. v1.5.0 already changes `_skin_jci_mazda.zip` this way; see CLAUDE.md
   "v1.5.0 navigation map skin". `color.ini` also has a `[userpoi]` section.
2. **Adding your own data**: the binary has a KML POI provider (`KML_LOADER`, `kmlpoi`,
   `application/vnd.google-earth.kml+xml`), user POIs (`USERPOI_PROVIDER`, `userpoi_has_mypoi`,
   `my.poi`), KML speed-camera import (`T_SPEEDCAM_IMPORT_FACTORY<KML_IMPORT_PROVIDER>`) and KML routes
   (`create_route_fromkml`, `EXPORT_ROUTE_TO_KML`). This is the supported way to add data without
   touching signed files. **Unknown:** which folder it reads KML from (path strings are not plain in
   the binary), and whether the Mazda UI shows the result. Next step: find the folder name (deeper
   binary analysis or `data.zip` Lua), then test in the car with a small KML in **car-side** storage
   (`/data`, `%userdata%`), not on the SD card.
3. **Card text and voice phrases** (`Dictionary.lang`, `voice/*.lua`, `global_cfg` icons): readable,
   but signed. A change would have to come from an unsigned copy loaded before the card's copy
   (`keep_first_loaded_content_file=1` hints that content is layered). **Untested.**
4. **Map, POI and 3D databases**: not changeable (licence-encrypted and signed).

Project rule stays: **never write to the SD card** (signed content + VIN-locked licence; a mistake
can leave navigation unlicensed). Work on the copy in `C:\maps-rea`, and change car-side files only
through `run.sh`, with backups.
