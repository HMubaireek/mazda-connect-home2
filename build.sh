#!/bin/sh
# Build the installer payload and the release zip.
#   ./build.sh            -> installer/home2/* + dist/home2-installer-<version>.zip
# Asset generation (needs Python: Pillow numpy cairosvg hijridate mutagen, and ffmpeg):
#   python3 tools/build_assets.py && python3 tools/gen_hijri.py && python3 tools/make_trigger.py
set -e
cd "$(dirname "$0")"
VERSION=$(cat VERSION)
P=installer/home2

# The launcher: Hijri table + control, one file (the framework loads exactly one .js per control).
# Same folder layout as on the car: js/, css/, images/home2/ (CSS uses ../images/home2/...).
rm -f "$P/MainMenuCtrl.js" "$P/MainMenuCtrl.css" "$P/MainMenuCtrl_rtl.css"
mkdir -p "$P/js" "$P/css"
cat src/launcher/MainMenuCtrl.js > "$P/js/MainMenuCtrl.js"
printf '\n' >> "$P/js/MainMenuCtrl.js"
cat src/launcher/hijri.js >> "$P/js/MainMenuCtrl.js"
printf '
' >> "$P/js/MainMenuCtrl.js"
cat src/launcher/icons.generated.js >> "$P/js/MainMenuCtrl.js"
sed -i "s/@VERSION@/${VERSION}/" "$P/js/MainMenuCtrl.js"
cp src/launcher/MainMenuCtrl.css "$P/css/MainMenuCtrl.css"
cp src/launcher/MainMenuCtrl_rtl.css "$P/css/MainMenuCtrl_rtl.css"

# System skin for Mazda's own screens (images come from tools/build_assets.py).
mkdir -p "$P/skin/css" "$P/skin/images/home2skin"
cat src/skin/home2skin.css src/skin/controls.generated.css > "$P/skin/css/home2skin.css"
cp src/skin/common_rtl.css "$P/skin/css/common_rtl.css"

# Checksums the car verifies before installing.
( cd "$P" && find . -type f ! -name checksums.md5 | sed 's|^\./||' | sort | xargs md5sum > checksums.md5 )

# Release zip: the contents of installer/ go to the root of the USB stick.
mkdir -p dist
rm -f "dist/home2-installer-${VERSION}.zip"
( cd installer && zip -qr "../dist/home2-installer-${VERSION}.zip" . -x 'logs/*' 'backup/*' )
echo "built dist/home2-installer-${VERSION}.zip"
