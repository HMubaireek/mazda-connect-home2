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
    mkdir -p "$CTRL/js" "$CTRL/css" "$CTRL/images" "$CAR/jci/fonts/CHN" "$CAR/etc" "$CAR/jci/tools" "$CAR/data_persist" "$T/bin"
    printf '[VersionInfo]\nJCI_SW_VER="MAZ_CMU-150_%s"\nJCI_SW_FLAVOR="cmu150_ADR"\n' "$1" > "$CAR/jci/version.ini"
    echo "/* stock MainMenuCtrl.js stand-in */" > "$CTRL/js/MainMenuCtrl.js"
    echo "/* stock MainMenuCtrl.css stand-in */" > "$CTRL/css/MainMenuCtrl.css"
    ORIG_JS=$(md5 "$CTRL/js/MainMenuCtrl.js")
    ORIG_CSS=$(md5 "$CTRL/css/MainMenuCtrl.css")
    cp -r "$REPO/installer" "$USB"
    FONTDIR="$CAR/jci/fonts/CHN"   # what firmware 74's /etc/profile gives the browser
    printf 'OPERA_ROOT="/jci/opera"\nexport FREETYPE_FONT_SET=YES\nexport OPERA_FONTS="/jci/fonts/CHN"\n' > "$CAR/etc/profile"
    touch "$CAR/jci/fonts/Tajawal-Bold.ttf" "$CAR/jci/fonts/Home2Tajawal-Bold.ttf"   # left over from v1.0.0-1.0.2

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

echo "--- 2. reinstall over itself keeps the original backup"
rm -f "$T/rebooted"
rc=$(run 0)
check "exit 0" '[ "$rc" = 0 ]'
check "backup still original" '[ "$(md5 "$CAR/data_persist/home2-backup/MainMenuCtrl.js")" = "$ORIG_JS" ]'

echo "--- 3. remove restores everything"
rc=$(run 1)
check "exit 0" '[ "$rc" = 0 ]'
check "js restored" '[ "$(md5 "$CTRL/js/MainMenuCtrl.js")" = "$ORIG_JS" ]'
check "css restored" '[ "$(md5 "$CTRL/css/MainMenuCtrl.css")" = "$ORIG_CSS" ]'
check "rtl css removed" '[ ! -f "$CTRL/css/MainMenuCtrl_rtl.css" ]'
check "images removed" '[ ! -d "$CTRL/images/home2" ]'
check "fonts removed" '[ ! -f "$FONTDIR/Home2Tajawal-Bold.ttf" ]'
check "stock fonts folder kept" '[ -d "$FONTDIR" ]'

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

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
