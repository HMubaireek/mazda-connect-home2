#!/bin/sh
# Runs installer/run.sh against a fake car file system and checks the results.
# Usage: ./build.sh && sh tests/test_installer.sh
set -u
cd "$(dirname "$0")/.."
REPO=$(pwd)
PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); echo "PASS $1"; }
bad()  { FAIL=$((FAIL + 1)); echo "FAIL $1"; }
check(){ if eval "$2"; then ok "$1"; else bad "$1"; fi; }
md5()  { md5sum "$1" 2>/dev/null | cut -d ' ' -f 1; }

# Build a fresh fake car + USB stick. $1 = firmware version string
setup()
{
    T=$(mktemp -d)
    export HOME2_TEST_ROOT="$T/car"
    CAR="$T/car"
    USB="$T/usb"
    CTRL="$CAR/jci/gui/apps/system/controls/MainMenu"
    mkdir -p "$CTRL/js" "$CTRL/css" "$CTRL/images" "$CAR/jci/fonts/CHN" "$CAR/etc" "$CAR/jci/tools" "$CAR/data_persist" "$T/bin"              "$CAR/jci/gui/common/css" "$CAR/jci/gui/common/images"
    printf '[VersionInfo]\nJCI_SW_VER="MAZ_CMU-150_%s"\nJCI_SW_FLAVOR="cmu150_ADR"\n' "$1" > "$CAR/jci/version.ini"
    echo "/* stock MainMenuCtrl.js stand-in */" > "$CTRL/js/MainMenuCtrl.js"
    echo "/* stock MainMenuCtrl.css stand-in */" > "$CTRL/css/MainMenuCtrl.css"
    ORIG_JS=$(md5 "$CTRL/js/MainMenuCtrl.js")
    ORIG_CSS=$(md5 "$CTRL/css/MainMenuCtrl.css")
    SKIN="$CAR/jci/gui/common/css/common_rtl.css"
    SKIN_MAIN="$CAR/jci/gui/common/css/home2skin.css"
    SKIN_IMG="$CAR/jci/gui/common/images/home2skin"
    cp -r "$REPO/installer" "$USB"
    FONTDIR="$CAR/jci/fonts/CHN"   # what firmware 74's /etc/profile gives the browser
    printf 'OPERA_ROOT="/jci/opera"\nexport FREETYPE_FONT_SET=YES\nexport OPERA_FONTS="/jci/fonts/CHN"\n' > "$CAR/etc/profile"
    touch "$CAR/jci/fonts/Tajawal-Bold.ttf" "$CAR/jci/fonts/Home2Tajawal-Bold.ttf"   # left over from v1.0.0-1.0.2
    # Mazda's navigation skin stand-in: a zip with the same layout (info.ini + ui_jci_mazda/800_480/*.bmp).
    NAV="$CAR/jci/nng/ux/_skin_jci_mazda.zip"
    mkdir -p "$T/navsrc/ui_jci_mazda/800_480" "$CAR/jci/nng/ux"
    echo "[INFO]" > "$T/navsrc/info.ini"
    echo "stock bar button" > "$T/navsrc/ui_jci_mazda/800_480/btn_cockpitmenu_8.bmp"
    echo "stock other image" > "$T/navsrc/ui_jci_mazda/800_480/arrow_straight.bmp"
    ( cd "$T/navsrc" && zip -q -r "$NAV" info.ini ui_jci_mazda )
    ORIG_NAV=$(md5 "$NAV")
    # data.zip stand-in: the files run.sh edits (CRLF like Mazda's), plus one it must not touch.
    DATA="$CAR/jci/nng/data.zip"
    DS="$T/datasrc/ui_jci_mazda"
    mkdir -p "$DS/scheme/day" "$DS/scheme/night" "$DS/fonts" "$DS/common/ui"
    for s in day night; do
        { printf '[INFO]\r\nname="stock %s"\r\n\r\n[color]\r\n' "$s"
          cut -d= -f1 "$USB/home2/nav/data/colors_$s.txt" | while read -r k; do printf '%s=stock\r\n' "$k"; done
          printf '\r\n[track]\r\n5=0,213,255, 0,193,235\r\n'; } > "$DS/scheme/$s/color.ini"
    done
    printf '[fonts]\r\nTipperary="@LatinSet, 60, 1"\r\nAkhbarOTS="@ArabicSet,-1,7"\r\n' > "$DS/fonts/jci.vfont"
    printf '[fonts]\r\nTipperarySemibold="@LatinSet, 60, 1"\r\nAkhbarOTS-Bold="@ArabicSet,-1,7"\r\n' > "$DS/fonts/jci_sb.vfont"
    printf '[fonts]\r\nTipperaryBold="@LatinSet, 60, 1"\r\nAkhbarOTS-Bold="@ArabicSet,-1,7"\r\n' > "$DS/fonts/jci_bd.vfont"
    printf 'LIST2{\r\n\tkeepselectiononscreen: 0;\r\n}\r\n' > "$DS/common/ui/jci_mazda.css"
    printf '<layer/>\r\n' > "$DS/common/ui/other.ui"
    ( cd "$T/datasrc" && zip -q -r "$DATA" ui_jci_mazda )
    ORIG_DATA=$(md5 "$DATA")
    NAVFONTS="$CAR/jci/fonts/navi"
    dmd5() { unzip -p "$DATA" "$1" | md5sum | cut -d ' ' -f 1; }

    # jci-dialog stub: --question answers come from $T/answers (one exit code per line)
    cat > "$CAR/jci/tools/jci-dialog" <<EOF
#!/bin/sh
echo "dialog: \$*" >> "$T/dialogs.log"
case "\$*" in
  *--question*)
    a=\$(head -n 1 "$T/answers"); sed -i '1d' "$T/answers"; exit \${a:-1} ;;
esac
exit 0
EOF
    chmod +x "$CAR/jci/tools/jci-dialog"
    for c in killall mount sleep; do printf '#!/bin/sh\nexit 0\n' > "$T/bin/$c"; chmod +x "$T/bin/$c"; done
    printf '#!/bin/sh\necho rebooted > "%s/rebooted"\n' "$T" > "$T/bin/reboot"; chmod +x "$T/bin/reboot"
    export PATH="$T/bin:$PATH"
    : > "$T/answers"
}

run() { printf '%s\n' "$@" > "$T/answers"; sh "$USB/run.sh" > /dev/null 2>&1; echo $?; }

echo "--- 1. fresh install (unknown originals -> 'Install anyway')"
setup 74.00.333
rc=$(run 0 0)
check "exit 0" '[ "$rc" = 0 ]'
check "launcher installed" 'grep -q "Ember Glass" "$CTRL/js/MainMenuCtrl.js"'
check "css installed" '[ "$(md5 "$CTRL/css/MainMenuCtrl.css")" = "$(md5 "$USB/home2/css/MainMenuCtrl.css")" ]'
check "rtl css installed" '[ -f "$CTRL/css/MainMenuCtrl_rtl.css" ]'
check "images installed" '[ -f "$CTRL/images/home2/bg_rtl.png" ]'
check "fonts installed in the browser's font folder" '[ "$(md5 "$FONTDIR/Home2Tajawal-Light.ttf")" = "$(md5 "$USB/home2/fonts/Home2Tajawal-Light.ttf")" ]'
check "old fonts in /jci/fonts cleaned up" '[ ! -f "$CAR/jci/fonts/Tajawal-Bold.ttf" ] && [ ! -f "$CAR/jci/fonts/Home2Tajawal-Bold.ttf" ]'
check "log names the font folder" 'grep -q "Browser font folder: .*/jci/fonts/CHN" "$USB/logs/install.log"'
check "backup on car" '[ "$(md5 "$CAR/data_persist/home2-backup/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "backup on USB" '[ "$(md5 "$USB/backup/MainMenuCtrl.css")" = "$ORIG_CSS" ]'
check "rebooted" '[ -f "$T/rebooted" ]'
check "log says complete" 'grep -q "install complete" "$USB/logs/install.log"'
check "skin style sheet installed" '[ "$(md5 "$SKIN")" = "$(md5 "$USB/home2/skin/css/common_rtl.css")" ]'
check "skin main sheet installed" '[ "$(md5 "$SKIN_MAIN")" = "$(md5 "$USB/home2/skin/css/home2skin.css")" ]'
check "skin images installed" '[ -f "$SKIN_IMG/list_panel.png" ] && [ -f "$SKIN_IMG/sb_batt_05.png" ]'
check "control images installed" '[ -f "$SKIN_IMG/ctl/Dialog3_Dialog_2Btn.png" ]'
check "icons installed" '[ -f "$SKIN_IMG/icn/IcnUmpPlayPause_Play_En.png" ]'
check "map skin marked as ours" 'unzip -l "$NAV" | grep -q home2_nav.txt'
check "map skin has our bar button" '[ "$(unzip -p "$NAV" ui_jci_mazda/800_480/btn_cockpitmenu_8.bmp | md5sum | cut -d " " -f 1)" = "$(md5 "$USB/home2/nav/ui_jci_mazda/800_480/btn_cockpitmenu_8.bmp")" ]'
check "map skin keeps Mazda's other images" '[ "$(unzip -p "$NAV" ui_jci_mazda/800_480/arrow_straight.bmp)" = "stock other image" ]'
check "map skin zip is valid" 'unzip -tq "$NAV" > /dev/null'
check "map skin backup on car" '[ "$(md5 "$CAR/data_persist/home2-backup/nav/_skin_jci_mazda.zip")" = "$ORIG_NAV" ]'
check "map skin backup on USB" '[ "$(md5 "$USB/backup/nav/_skin_jci_mazda.zip")" = "$ORIG_NAV" ]'
check "no temporary files left" '[ ! -f "$CAR/tmp/home2_nav.zip" ] && [ ! -f "$NAV.home2new" ]'
check "data.zip marked as ours" 'unzip -l "$DATA" | grep -q home2_nav.txt'
check "data.zip is valid" 'unzip -tq "$DATA" > /dev/null'
check "night map colours (CRLF kept)" 'unzip -p "$DATA" ui_jci_mazda/scheme/night/color.ini | grep -q "^0=\"ground\", 11,14,25, 2.\$"'
check "day map colours" 'unzip -p "$DATA" ui_jci_mazda/scheme/day/color.ini | grep -q "^planned_road=\"\", 108,139,255"'
check "every colour line replaced" '[ "$(unzip -p "$DATA" ui_jci_mazda/scheme/night/color.ini | grep -c "=stock")" = 0 ]'
check "[track] section untouched" 'unzip -p "$DATA" ui_jci_mazda/scheme/night/color.ini | grep -q "^5=0,213,255, 0,193,235"'
check "Arabic in Tajawal" 'unzip -p "$DATA" ui_jci_mazda/fonts/jci.vfont | grep -q "^Home2Tajawal-Medium=\"@ArabicSet"'
check "bold Arabic in Tajawal Bold" 'unzip -p "$DATA" ui_jci_mazda/fonts/jci_bd.vfont | grep -q "^Home2Tajawal-Bold="'
check "Latin font kept" 'unzip -p "$DATA" ui_jci_mazda/fonts/jci.vfont | grep -q "^Tipperary="'
check "lists right to left" 'unzip -p "$DATA" ui_jci_mazda/common/ui/jci_mazda.css | grep -q "^LIST2{ R2L:(%regional.current_language.is_r2l);"'
check "other data.zip files untouched" '[ "$(unzip -p "$DATA" ui_jci_mazda/common/ui/other.ui)" = "$(cat "$T/datasrc/ui_jci_mazda/common/ui/other.ui")" ]'
check "Tajawal installed for the map" '[ "$(md5 "$NAVFONTS/Home2Tajawal-Bold.ttf")" = "$(md5 "$USB/home2/fonts/Home2Tajawal-Bold.ttf")" ] && [ -f "$NAVFONTS/Home2Tajawal-Medium.ttf" ]'
check "data.zip originals backed up on car" '[ "$(md5 "$CAR/data_persist/home2-backup/nav/data/ui_jci_mazda/fonts/jci.vfont")" = "$(md5 "$DS/fonts/jci.vfont")" ]'
check "data.zip originals backed up on USB" '[ -f "$USB/backup/nav/data/ui_jci_mazda/scheme/day/color.ini" ] && [ "$(md5 "$USB/backup/nav/data.zip")" = "$ORIG_DATA" ]'
check "no data work files left" '[ ! -d "$CAR/tmp/home2_navdata" ] && [ ! -f "$CAR/tmp/home2_data.zip" ]'

echo "--- 2. reinstall over itself keeps the original backup"
rm -f "$T/rebooted"
rc=$(run 0)
check "exit 0" '[ "$rc" = 0 ]'
check "backup still original" '[ "$(md5 "$CAR/data_persist/home2-backup/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "map skin backup still original" '[ "$(md5 "$CAR/data_persist/home2-backup/nav/_skin_jci_mazda.zip")" = "$ORIG_NAV" ]'
check "map skin still ours" 'unzip -l "$NAV" | grep -q home2_nav.txt'
check "data.zip backup still original" '[ "$(md5 "$CAR/data_persist/home2-backup/nav/data/ui_jci_mazda/scheme/night/color.ini")" = "$(md5 "$DS/scheme/night/color.ini")" ]'
check "map colours still ours" 'unzip -p "$DATA" ui_jci_mazda/scheme/night/color.ini | grep -q "^0=\"ground\", 11,14,25, 2"'

echo "--- 3. remove restores everything"
rc=$(run 1)
check "exit 0" '[ "$rc" = 0 ]'
check "js restored" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "css restored" '[ "$(md5 "$CTRL/css/MainMenuCtrl.css")" = "$ORIG_CSS" ]'
check "rtl css removed" '[ ! -f "$CTRL/css/MainMenuCtrl_rtl.css" ]'
check "images removed" '[ ! -d "$CTRL/images/home2" ]'
check "fonts removed" '[ ! -f "$FONTDIR/Home2Tajawal-Bold.ttf" ]'
check "stock fonts folder kept" '[ -d "$FONTDIR" ]'
check "skin style sheet removed" '[ ! -f "$SKIN" ]'
check "skin main sheet removed" '[ ! -f "$SKIN_MAIN" ]'
check "skin images removed" '[ ! -d "$SKIN_IMG" ]'
check "stock common css folder kept" '[ -d "$CAR/jci/gui/common/css" ]'
check "map skin restored" '[ "$(md5 "$NAV")" = "$ORIG_NAV" ]'
check "data.zip files restored" '( for f in scheme/day/color.ini scheme/night/color.ini fonts/jci.vfont fonts/jci_sb.vfont fonts/jci_bd.vfont common/ui/jci_mazda.css; do [ "$(dmd5 ui_jci_mazda/$f)" = "$(md5 "$DS/$f")" ] || exit 1; done )'
check "data.zip marker removed" '! unzip -l "$DATA" | grep -q home2_nav.txt'
check "data.zip valid after restore" 'unzip -tq "$DATA" > /dev/null'
check "map fonts removed" '[ ! -f "$NAVFONTS/Home2Tajawal-Bold.ttf" ] && [ ! -f "$NAVFONTS/Home2Tajawal-Medium.ttf" ]'

echo "--- 4. remove when not installed changes nothing"
rc=$(run 1)
check "exit 0" '[ "$rc" = 0 ]'
check "js untouched" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'

echo "--- 5. wrong firmware is refused"
setup 70.00.100
rc=$(run 0 0)
check "exit 1" '[ "$rc" = 1 ]'
check "js untouched" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'

echo "--- 6. damaged USB copy is refused"
setup 74.00.333
echo "garbage" >> "$USB/home2/css/MainMenuCtrl.css"
rc=$(run 0 0)
check "exit 1" '[ "$rc" = 1 ]'
check "js untouched" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'

echo "--- 7. cancelling at 'Install anyway' changes nothing"
setup 74.00.324
rc=$(run 0 1)
check "exit 0" '[ "$rc" = 0 ]'
check "js untouched" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "no rtl css" '[ ! -f "$CTRL/css/MainMenuCtrl_rtl.css" ]'

echo "--- 8. no OPERA_FONTS in /etc/profile -> /jci/fonts/CHN is used"
setup 74.00.333
: > "$CAR/etc/profile"
rc=$(run 0 0)
check "exit 0" '[ "$rc" = 0 ]'
check "fonts in CHN" '[ -f "$FONTDIR/Home2Tajawal-Bold.ttf" ]'

echo "--- 9. copy failure rolls back"
setup 74.00.333
chmod 000 "$FONTDIR"
rc=$(run 0 0)
chmod 755 "$FONTDIR"
if [ "$(id -u)" = 0 ]; then
    echo "SKIP running as root, permission failure cannot be simulated"
else
    check "exit 1" '[ "$rc" = 1 ]'
    check "js rolled back" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
fi

echo "--- 10. an existing common_rtl.css is kept and restored on remove"
setup 74.00.333
echo "/* someone else's common_rtl.css */" > "$SKIN"
OTHER=$(md5 "$SKIN")
rc=$(run 0 0)
check "exit 0" '[ "$rc" = 0 ]'
check "existing sheet backed up" '[ "$(md5 "$CAR/data_persist/home2-backup/common_rtl.css")" = "$OTHER" ]'
check "skin installed over it" 'grep -q "Home 2.0 system skin" "$SKIN"'
rc=$(run 1)
check "remove restores the earlier sheet" '[ "$(md5 "$SKIN")" = "$OTHER" ]'

echo "--- 11. a unit without navigation installs without the map skin"
setup 74.00.333
rm -f "$NAV"
rc=$(run 0 0)
check "exit 0" '[ "$rc" = 0 ]'
check "launcher installed" 'grep -q "Ember Glass" "$CTRL/js/MainMenuCtrl.js"'
check "no navigation skin created" '[ ! -f "$NAV" ]'
check "log says skipped" 'grep -q "map skin skipped" "$USB/logs/install.log"'

echo "--- 12. a failure while building the map skin rolls everything back"
setup 74.00.333
printf '#!/bin/sh\nexit 12\n' > "$T/bin/zip"; chmod +x "$T/bin/zip"
rc=$(run 0 0)
rm -f "$T/bin/zip"
check "exit 1" '[ "$rc" = 1 ]'
check "js rolled back" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "map skin untouched" '[ "$(md5 "$NAV")" = "$ORIG_NAV" ]'
check "skin style sheet removed" '[ ! -f "$SKIN" ]'
check "data.zip untouched" '[ "$(md5 "$DATA")" = "$ORIG_DATA" ]'

echo "--- 13. a data.zip edit that does not apply rolls everything back"
setup 74.00.333
printf 'LIST3{\r\n}\r\n' > "$DS/common/ui/jci_mazda.css"
rm -f "$DATA"; ( cd "$T/datasrc" && zip -q -r "$DATA" ui_jci_mazda ); ORIG_DATA=$(md5 "$DATA")
rc=$(run 0 0)
check "exit 1" '[ "$rc" = 1 ]'
check "js rolled back" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "map skin restored" '[ "$(md5 "$NAV")" = "$ORIG_NAV" ]'
check "data.zip untouched" '[ "$(md5 "$DATA")" = "$ORIG_DATA" ]'
check "map fonts removed" '[ ! -f "$NAVFONTS/Home2Tajawal-Medium.ttf" ]'
check "log names the edit" 'grep -q "Right-to-left edit did not apply" "$USB/logs/install.log"'

echo "--- 14. a unit without data.zip still gets the map images"
setup 74.00.333
rm -f "$DATA"
rc=$(run 0 0)
check "exit 0" '[ "$rc" = 0 ]'
check "map skin installed" 'unzip -l "$NAV" | grep -q home2_nav.txt'
check "no data.zip created" '[ ! -f "$DATA" ]'

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
