#!/bin/sh
# Copy the few Mazda GUI files the skin preview (preview/skin.html) needs, from an extracted firmware
# root file system, into preview/mazda/. These are Mazda's files: they stay local (preview/mazda is ignored by git).
#   sh tools/copy_mazda_preview.sh <path to the extracted jci/gui folder>
set -e
G="$1"
[ -f "$G/common/controls/StatusBar/css/StatusBarCtrl.css" ] || { echo "usage: $0 <extracted jci/gui folder>"; exit 1; }
cd "$(dirname "$0")/.."
D=preview/mazda
rm -rf "$D"
for c in StatusBar Sbn List2 LeftBtn Button Tabs Dialog3 InCall2 Ump3 Tuner4 Wink ScreenSettings2 NowPlaying4 Keyboard DialPad2; do
    mkdir -p "$D/common/controls/$c"
    cp -r "$G/common/controls/$c/css" "$D/common/controls/$c/"
    [ -d "$G/common/controls/$c/images" ] && cp -r "$G/common/controls/$c/images" "$D/common/controls/$c/"
done
mkdir -p "$D/common/css" "$D/common/images/icons" "$D/common/transitions/css" "$D/apps/system/images"
cp "$G/common/css/common.css" "$D/common/css/"
cp "$G/common/images/background.png" "$D/common/images/"
cp "$G"/common/images/icons/IcnSb*.png "$G"/common/images/icons/IcnWink*.png "$G"/common/images/icons/IcnUmp*.png "$G"/common/images/icons/IcnList*.png "$D/common/images/icons/"
mkdir -p "$D/apps/ecoenergy/controls"
cp -r "$G/apps/ecoenergy/controls/FuelConsumption" "$D/apps/ecoenergy/controls/"
cp "$G/common/transitions/css/TransitionsGen.css" "$D/common/transitions/css/"
cp "$G/apps/system/images/Android_Auto_Active.png" "$G/apps/system/images/AppleCP_Active.png" "$D/apps/system/images/"
echo "copied Mazda preview files to $D"
