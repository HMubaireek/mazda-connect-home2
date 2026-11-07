#!/bin/sh
# ---------------------------------------------------------------------------
# Home 2.0 "Ember Glass" launcher for Mazda Connect — install / remove
# Runs on the car (busybox sh). Start it from the CMU terminal:
#     sh /tmp/mnt/sda1/run.sh        (use sdb1 etc. if that is where the stick is)
# Apache License 2.0. Not affiliated with Mazda. Use at your own risk.
# ---------------------------------------------------------------------------

TITLE="Home 2.0"
# Empty on the car. Only the automated tests set it, to run against a fake file system.
R="${HOME2_TEST_ROOT:-}"
DIALOG="${R}/jci/tools/jci-dialog"
MYDIR=$(dirname "$(readlink -f "$0")")
PAYLOAD="${MYDIR}/home2"
CTRL="${R}/jci/gui/apps/system/controls/MainMenu"
OLD_FONTS="${R}/jci/fonts"     # where v1.0.0-1.0.2 put the fonts (Opera does not read it)
BACKUP="${R}/data_persist/home2-backup"
USB_BACKUP="${MYDIR}/backup"
MARKER="Home 2.0 \"Ember Glass\" launcher"
# System skin for Mazda's own screens (top bar, alerts, menus): home2skin.css (every language, added to the
# page by the launcher), common_rtl.css (Arabic mirroring; Mazda does not ship it, but the GUI loads it next to
# common.css for Arabic), plus their images.
SKIN_MAIN="${R}/jci/gui/common/css/home2skin.css"
SKIN_CSS="${R}/jci/gui/common/css/common_rtl.css"
SKIN_IMG="${R}/jci/gui/common/images/home2skin"
SKIN_MARKER="Home 2.0 system skin"
# Navigation map skin (NNG, native, not HTML): our images are added to a copy of Mazda's skin zip on the car
# (Mazda's images are never shipped). The original zip is kept in the backup folders under nav/.
NAV_SKIN="${R}/jci/nng/ux/_skin_jci_mazda.zip"
NAV_MARK="home2_nav.txt"
NAV_STOCK_MD5="d9fa61c112864b2858e4bdc3ac3449a8"   # 74.00.333A ADR
NAV_TMP="${R}/tmp/home2_nav.zip"
# Map colours, Tajawal and right-to-left lists: a few text files inside /jci/nng/data.zip, changed on the car with
# awk/sed (nav/data/). Only the original copies of those files are kept (backup nav/data/); restoring zips them
# back. The stick's backup also gets a full copy of data.zip as a last resort.
NAV_DATA="${R}/jci/nng/data.zip"
NAV_DTMP="${R}/tmp/home2_data.zip"
NAV_WORK="${R}/tmp/home2_navdata"
NAV_FONTDIR="${R}/jci/fonts/navi"        # NNG reads fonts from /jci/fonts and /jci/fonts/navi; Opera does not
NAV_FONTS="Home2Tajawal-Medium.ttf Home2Tajawal-Bold.ttf"

# MD5 of Mazda's original home-menu files this build has been checked against.
# 74.00.333A ADR (4A N)
KNOWN_ORIGINALS="40ccb293b8c6f80960f0b953dd2e173e:84071812f5641ca8c51ae366bd6da674"

dialog_info()
{
    killall -q jci-dialog
    "${DIALOG}" --info --title="${TITLE}" --text="$1" --no-cancel &
}

dialog_wait()
{
    killall -q jci-dialog
    "${DIALOG}" --info --title="${TITLE}" --text="$1" --no-cancel &
    sleep "${2:-8}"
    killall -q jci-dialog
}

md5()
{
    md5sum "$1" 2>/dev/null | cut -d ' ' -f 1
}

# The folder the GUI browser (Opera) loads fonts from: its OPERA_FONTS setting.
# On firmware 74 /etc/profile sets it to /jci/fonts/CHN, not /jci/fonts.
opera_font_dir()
{
    d=""
    if [ -z "${R}" ]; then
        for p in /proc/[0-9]*; do
            case "$(tr '\000' ' ' < "$p/cmdline" 2>/dev/null)" in
                /jci/opera/opera*)
                    d=$(tr '\000' '\n' < "$p/environ" 2>/dev/null | sed -n 's/^OPERA_FONTS=//p' | head -n 1)
                    [ -n "$d" ] && break ;;
            esac
        done
    fi
    [ -z "$d" ] && d=$(sed -n 's/^ *export OPERA_FONTS="\{0,1\}\([^"]*\)"\{0,1\}.*$/\1/p' "${R}/etc/profile" 2>/dev/null | head -n 1)
    [ -z "$d" ] && d="/jci/fonts/CHN"
    [ -d "${R}$d" ] || d="/jci/fonts"
    echo "${R}$d"
}

# Keep the watchdog from rebooting the unit while we work, and make / writable.
echo 1 > "${R}/sys/class/gpio/Watchdog Disable/value" 2>/dev/null
mount -o rw,remount /
mount -o rw,remount "${MYDIR}" 2>/dev/null
mkdir -p "${MYDIR}/logs"
FONTS=$(opera_font_dir)

# --- Firmware must be V74 ----------------------------------------------------
CMU_VER=$(grep "^JCI_SW_VER=" "${R}/jci/version.ini" | sed 's/^.*_\([^_]*\)\"$/\1/')
case "${CMU_VER}" in
    74.*) ;;
    *)
        dialog_wait "This build needs Mazda Connect firmware 74.\nFound: ${CMU_VER}\nNothing was changed." 10
        exit 1
        ;;
esac

# --- Payload on the USB stick must be complete ------------------------------
if ! ( cd "${PAYLOAD}" && md5sum -c checksums.md5 > "${MYDIR}/logs/payload-check.log" 2>&1 ); then
    dialog_wait "The files on the USB stick are incomplete or damaged.\nCopy the installer again.\nNothing was changed." 10
    exit 1
fi

# --- Ask what to do ----------------------------------------------------------
killall -q jci-dialog
"${DIALOG}" --question --title="${TITLE}" \
    --text="Firmware ${CMU_VER}\nWhat would you like to do?" \
    --ok-label="Install" --cancel-label="Remove"
CHOICE=$?

restore_originals()
{
    # $1 = folder holding MainMenuCtrl.js / MainMenuCtrl.css
    cp "$1/MainMenuCtrl.js" "${CTRL}/js/MainMenuCtrl.js" &&
    cp "$1/MainMenuCtrl.css" "${CTRL}/css/MainMenuCtrl.css"
}

remove_skin()
{
    # $1 = backup folder that may hold a common_rtl.css that was there before Home 2.0
    rm -rf "${SKIN_IMG}"
    rm -f "${SKIN_MAIN}"
    if [ -f "$1/common_rtl.css" ]; then
        cp "$1/common_rtl.css" "${SKIN_CSS}"
    else
        rm -f "${SKIN_CSS}"
    fi
}

nav_is_ours()
{
    unzip -l "${NAV_SKIN}" 2>/dev/null | grep -q "${NAV_MARK}"
}

# Put a zip in place of the navigation skin. Write a new file and rename it, so the running navigation keeps
# reading the old one until the restart; if there is no room for two copies, overwrite in place.
put_file()
{
    # $1 = file to put in place, $2 = where
    if cp "$1" "$2.home2new" 2>/dev/null && mv -f "$2.home2new" "$2"; then
        :
    else
        rm -f "$2.home2new"
        cp "$1" "$2" || return 1
    fi
    sync
    [ "$(md5 "$2")" = "$(md5 "$1")" ]
}

put_nav()
{
    put_file "$1" "${NAV_SKIN}"
}

install_nav()
{
    [ -d "${PAYLOAD}/nav" ] || return 0
    if [ ! -f "${NAV_SKIN}" ]; then
        echo "No navigation skin on this unit (${NAV_SKIN}): map skin skipped."
        return 0
    fi
    if ! command -v zip > /dev/null 2>&1 || ! command -v unzip > /dev/null 2>&1; then
        echo "zip/unzip not found: map skin skipped."
        return 0
    fi
    echo "Navigation skin md5: $(md5 "${NAV_SKIN}") (stock 74.00.333A: ${NAV_STOCK_MD5})"
    if nav_is_ours; then
        if [ ! -f "${BACKUP}/nav/_skin_jci_mazda.zip" ]; then
            echo "Map skin is installed but its backup is missing: map skin left as it is."
            return 0
        fi
        echo "Map skin already installed: updating it from the backup of the original."
    else
        mkdir -p "${BACKUP}/nav" "${USB_BACKUP}/nav"
        if ! cp "${NAV_SKIN}" "${BACKUP}/nav/_skin_jci_mazda.zip" ||
           [ "$(md5 "${BACKUP}/nav/_skin_jci_mazda.zip")" != "$(md5 "${NAV_SKIN}")" ]; then
            rm -f "${BACKUP}/nav/_skin_jci_mazda.zip"
            echo "Could not back up the navigation skin: map skin skipped."
            return 0
        fi
        cp "${NAV_SKIN}" "${USB_BACKUP}/nav/_skin_jci_mazda.zip" || echo "Note: no copy of the navigation skin on the USB stick."
        echo "Backed up the navigation skin to ${BACKUP}/nav and ${USB_BACKUP}/nav"
    fi
    mkdir -p "$(dirname "${NAV_TMP}")"
    rm -f "${NAV_TMP}"
    if ! cp "${BACKUP}/nav/_skin_jci_mazda.zip" "${NAV_TMP}" ||
       ! ( cd "${PAYLOAD}/nav" && zip -q -X "${NAV_TMP}" "${NAV_MARK}" ui_jci_mazda/800_480/*.bmp ) ||
       ! unzip -tq "${NAV_TMP}" > /dev/null 2>&1; then
        rm -f "${NAV_TMP}"
        echo "Could not build the new navigation skin."
        return 1
    fi
    if ! put_nav "${NAV_TMP}"; then
        rm -f "${NAV_TMP}"
        echo "Could not copy the new navigation skin."
        return 1
    fi
    rm -f "${NAV_TMP}"
    echo "Map skin installed ($(ls "${PAYLOAD}"/nav/ui_jci_mazda/800_480/*.bmp | wc -l) images)."
    return 0
}

restore_nav()
{
    # $1 = backup folder holding nav/_skin_jci_mazda.zip
    # $2 = "force": put the backup back even if the current file is not ours (an install that failed half-way)
    if [ "$2" != "force" ]; then
        [ -f "${NAV_SKIN}" ] && nav_is_ours || return 0
    else
        [ -f "${BACKUP}/nav/_skin_jci_mazda.zip" ] || [ -f "${USB_BACKUP}/nav/_skin_jci_mazda.zip" ] || return 0
        [ "$(md5 "${NAV_SKIN}")" = "$(md5 "${BACKUP}/nav/_skin_jci_mazda.zip")" ] && return 0
    fi
    for b in "$1" "${BACKUP}" "${USB_BACKUP}"; do
        if [ -f "$b/nav/_skin_jci_mazda.zip" ] && ! unzip -l "$b/nav/_skin_jci_mazda.zip" 2>/dev/null | grep -q "${NAV_MARK}"; then
            put_nav "$b/nav/_skin_jci_mazda.zip" && { echo "Navigation skin restored from $b/nav"; return 0; }
        fi
    done
    echo "Could not restore the navigation skin."
    return 1
}

data_is_ours()
{
    unzip -l "${NAV_DATA}" 2>/dev/null | grep -q "${NAV_MARK}"
}

# Replace whole lines of a color.ini [color] section by key (first occurrence only; keeps CRLF endings).
recolor()
{
    # $1 = Mazda's color.ini, $2 = our lines (key=...), $3 = output
    awk -v OVR="$2" '
        BEGIN { while ((getline l < OVR) > 0) { k = l; sub(/=.*/, "", k); o[k] = l } }
        { line = $0; cr = ""; if (line ~ /\r$/) { cr = "\r"; sub(/\r$/, "", line) } }
        line ~ /^\[/ { sec = line }
        { k = line; sub(/=.*/, "", k); gsub(/^[ \t]+|[ \t]+$/, "", k)
          if (sec == "[color]" && (k in o) && !(k in done)) { print o[k] cr; done[k] = 1 } else print $0 }' "$1" > "$3"
}

install_nav_data()
{
    D="${PAYLOAD}/nav/data"
    [ -f "$D/files.txt" ] || return 0
    if [ ! -f "${NAV_DATA}" ]; then
        echo "No ${NAV_DATA}: map colours and fonts skipped."
        return 0
    fi
    command -v zip > /dev/null 2>&1 && command -v unzip > /dev/null 2>&1 || return 0
    FILES=$(cat "$D/files.txt")
    if data_is_ours; then
        for f in ${FILES}; do
            if [ ! -f "${BACKUP}/nav/data/$f" ]; then
                echo "Map colours are installed but the backup of $f is missing: left as they are."
                return 0
            fi
        done
    else
        rm -rf "${BACKUP}/nav/data"
        mkdir -p "${BACKUP}/nav/data" "${USB_BACKUP}/nav"
        if ! unzip -o -q "${NAV_DATA}" ${FILES} -d "${BACKUP}/nav/data"; then
            rm -rf "${BACKUP}/nav/data"
            echo "Could not back up the files in data.zip: map colours and fonts skipped."
            return 0
        fi
        rm -rf "${USB_BACKUP}/nav/data"
        cp -r "${BACKUP}/nav/data" "${USB_BACKUP}/nav/" || echo "Note: no copy of the data.zip files on the USB stick."
        cp "${NAV_DATA}" "${USB_BACKUP}/nav/data.zip" || echo "Note: no full copy of data.zip on the USB stick."
        echo "Backed up ${FILES} from data.zip"
    fi
    # Our versions of Mazda's files, made from the originals.
    rm -rf "${NAV_WORK}"
    for f in ${FILES}; do
        mkdir -p "${NAV_WORK}/$(dirname "$f")" && cp "${BACKUP}/nav/data/$f" "${NAV_WORK}/$f" || return 1
    done
    W="${NAV_WORK}/ui_jci_mazda"
    for s in day night; do
        recolor "${BACKUP}/nav/data/ui_jci_mazda/scheme/$s/color.ini" "$D/colors_$s.txt" "$W/scheme/$s/color.ini" || return 1
        want=$(grep -c . "$D/colors_$s.txt")
        got=$(grep -c -F -f "$D/colors_$s.txt" "$W/scheme/$s/color.ini")
        if [ "${got}" -lt "${want}" ]; then
            echo "Map colours ($s): only ${got} of ${want} lines found."
            return 1
        fi
    done
    for v in jci jci_sb jci_bd; do
        sed -f "$D/fonts.sed" "${BACKUP}/nav/data/ui_jci_mazda/fonts/$v.vfont" > "$W/fonts/$v.vfont" || return 1
        grep -q "^Home2Tajawal-" "$W/fonts/$v.vfont" || { echo "Font edit did not apply to $v.vfont."; return 1; }
    done
    sed -f "$D/css.sed" "${BACKUP}/nav/data/ui_jci_mazda/common/ui/jci_mazda.css" > "$W/common/ui/jci_mazda.css" || return 1
    grep -q "R2L:(%regional.current_language.is_r2l);" "$W/common/ui/jci_mazda.css" ||
        { echo "Right-to-left edit did not apply to jci_mazda.css."; return 1; }
    cp "${PAYLOAD}/nav/${NAV_MARK}" "${NAV_WORK}/" || return 1
    # Tajawal for the map.
    mkdir -p "${NAV_FONTDIR}"
    for t in ${NAV_FONTS}; do
        cp "${PAYLOAD}/fonts/$t" "${NAV_FONTDIR}/$t" && [ "$(md5 "${NAV_FONTDIR}/$t")" = "$(md5 "${PAYLOAD}/fonts/$t")" ] ||
            { echo "Could not copy $t."; return 1; }
    done
    # data.zip with our files in it.
    mkdir -p "$(dirname "${NAV_DTMP}")"
    rm -f "${NAV_DTMP}"
    if ! cp "${NAV_DATA}" "${NAV_DTMP}" ||
       ! ( cd "${NAV_WORK}" && zip -q -X "${NAV_DTMP}" ${FILES} "${NAV_MARK}" ) ||
       ! unzip -tq "${NAV_DTMP}" > /dev/null 2>&1; then
        rm -f "${NAV_DTMP}"
        echo "Could not build the new data.zip."
        return 1
    fi
    if ! put_file "${NAV_DTMP}" "${NAV_DATA}"; then
        rm -f "${NAV_DTMP}"
        echo "Could not copy the new data.zip."
        return 1
    fi
    rm -f "${NAV_DTMP}"
    for f in ${FILES}; do
        [ "$(unzip -p "${NAV_DATA}" "$f" | md5sum | cut -d ' ' -f 1)" = "$(md5 "${NAV_WORK}/$f")" ] ||
            { echo "data.zip check failed for $f."; return 1; }
    done
    rm -rf "${NAV_WORK}"
    echo "Map colours, Tajawal and right-to-left lists installed."
    return 0
}

restore_nav_data()
{
    # $1 = "force": also repair a data.zip an install left broken half-way
    rm -f "${NAV_FONTDIR}"/Home2Tajawal-*.ttf
    [ -f "${NAV_DATA}" ] || return 0
    if ! data_is_ours; then
        [ "$1" = "force" ] || return 0
        unzip -tq "${NAV_DATA}" > /dev/null 2>&1 && return 0      # untouched
        if [ -f "${USB_BACKUP}/nav/data.zip" ] && put_file "${USB_BACKUP}/nav/data.zip" "${NAV_DATA}"; then
            echo "data.zip restored from the full copy on the USB stick"
            return 0
        fi
        echo "data.zip is damaged and no full copy was found."
        return 1
    fi
    FILES=$(cat "${PAYLOAD}/nav/data/files.txt" 2>/dev/null)
    for b in "${BACKUP}" "${USB_BACKUP}"; do
        ok=1
        for f in ${FILES}; do [ -f "$b/nav/data/$f" ] || ok=0; done
        [ -n "${FILES}" ] && [ ${ok} -eq 1 ] || continue
        rm -f "${NAV_DTMP}"
        if cp "${NAV_DATA}" "${NAV_DTMP}" &&
           ( cd "$b/nav/data" && zip -q -X "${NAV_DTMP}" ${FILES} ) &&
           zip -q -d "${NAV_DTMP}" "${NAV_MARK}" > /dev/null &&
           unzip -tq "${NAV_DTMP}" > /dev/null 2>&1 &&
           put_file "${NAV_DTMP}" "${NAV_DATA}"; then
            rm -f "${NAV_DTMP}"
            echo "Mazda's files in data.zip restored from $b/nav/data"
            return 0
        fi
        rm -f "${NAV_DTMP}"
    done
    if [ -f "${USB_BACKUP}/nav/data.zip" ] && put_file "${USB_BACKUP}/nav/data.zip" "${NAV_DATA}"; then
        echo "data.zip restored from the full copy on the USB stick"
        return 0
    fi
    echo "Could not restore data.zip."
    return 1
}

if [ ${CHOICE} -eq 0 ]
then
    # ======================================================================
    # INSTALL
    # ======================================================================
    exec > "${MYDIR}/logs/install.log" 2>&1
    echo "=== Home 2.0 install start: firmware ${CMU_VER} ==="
    dialog_info "Installing Home 2.0...\nDo not remove the USB stick."

    CUR_JS=$(md5 "${CTRL}/js/MainMenuCtrl.js")
    CUR_CSS=$(md5 "${CTRL}/css/MainMenuCtrl.css")
    echo "Current MainMenuCtrl.js  md5: ${CUR_JS}"
    echo "Current MainMenuCtrl.css md5: ${CUR_CSS}"
    echo "Browser font folder: ${FONTS}"

    if grep -q "${MARKER}" "${CTRL}/js/MainMenuCtrl.js"; then
        echo "Home 2.0 is already installed: updating it, keeping the existing backup."
        if [ ! -f "${BACKUP}/MainMenuCtrl.js" ]; then
            dialog_wait "Home 2.0 is installed but its backup is missing.\nInstall aborted to stay safe." 10
            exit 1
        fi
    else
        case ":${KNOWN_ORIGINALS}:" in
            *":${CUR_JS}:${CUR_CSS}:"*) echo "Original files recognised." ;;
            *)
                echo "Original files not in the known list."
                killall -q jci-dialog
                "${DIALOG}" --question --title="${TITLE}" \
                    --text="Your home-menu files are not the version this build was tested with.\nThey will still be backed up first.\nInstall anyway?" \
                    --ok-label="Install anyway" --cancel-label="Cancel"
                if [ $? -ne 0 ]; then
                    echo "Cancelled by user."
                    dialog_wait "Cancelled. Nothing was changed." 5
                    exit 0
                fi
                dialog_info "Installing Home 2.0...\nDo not remove the USB stick."
                ;;
        esac
        # Back up the originals in two places.
        mkdir -p "${BACKUP}" "${USB_BACKUP}"
        cp "${CTRL}/js/MainMenuCtrl.js" "${CTRL}/css/MainMenuCtrl.css" "${BACKUP}/" &&
        cp "${CTRL}/js/MainMenuCtrl.js" "${CTRL}/css/MainMenuCtrl.css" "${USB_BACKUP}/"
        if [ $? -ne 0 ] || [ "$(md5 "${BACKUP}/MainMenuCtrl.js")" != "${CUR_JS}" ]; then
            dialog_wait "Could not back up the original files.\nNothing was changed." 10
            exit 1
        fi
        echo "Backed up originals to ${BACKUP} and ${USB_BACKUP}"
    fi

    # Mazda does not ship common_rtl.css. If one is there and it is not ours, keep a copy.
    if [ -f "${SKIN_CSS}" ] && ! grep -q "${SKIN_MARKER}" "${SKIN_CSS}"; then
        mkdir -p "${BACKUP}" "${USB_BACKUP}"
        if [ ! -f "${BACKUP}/common_rtl.css" ]; then
            cp "${SKIN_CSS}" "${BACKUP}/" && cp "${SKIN_CSS}" "${USB_BACKUP}/"
            echo "Backed up an existing common_rtl.css"
        fi
    fi

    # Copy the new launcher.
    mkdir -p "${CTRL}/images/home2"
    cp "${PAYLOAD}/js/MainMenuCtrl.js" "${CTRL}/js/MainMenuCtrl.js" &&
    cp "${PAYLOAD}/css/MainMenuCtrl.css" "${CTRL}/css/MainMenuCtrl.css" &&
    cp "${PAYLOAD}/css/MainMenuCtrl_rtl.css" "${CTRL}/css/MainMenuCtrl_rtl.css" &&
    cp "${PAYLOAD}"/images/home2/*.png "${CTRL}/images/home2/" &&
    cp "${PAYLOAD}"/fonts/Home2Tajawal-*.ttf "${FONTS}/" &&
    mkdir -p "${SKIN_IMG}/ctl" "${SKIN_IMG}/icn" &&
    cp "${PAYLOAD}"/skin/images/home2skin/*.png "${SKIN_IMG}/" &&
    cp "${PAYLOAD}"/skin/images/home2skin/ctl/*.png "${SKIN_IMG}/ctl/" &&
    cp "${PAYLOAD}"/skin/images/home2skin/icn/*.png "${SKIN_IMG}/icn/" &&
    cp "${PAYLOAD}/skin/css/home2skin.css" "${SKIN_MAIN}" &&
    cp "${PAYLOAD}/skin/css/common_rtl.css" "${SKIN_CSS}"
    COPY_OK=$?
    # Clean up fonts from earlier versions (plain Tajawal names, or put in /jci/fonts).
    rm -f "${FONTS}"/Tajawal-*.ttf "${OLD_FONTS}"/Tajawal-*.ttf
    [ "${FONTS}" != "${OLD_FONTS}" ] && rm -f "${OLD_FONTS}"/Home2Tajawal-*.ttf
    sync

    # Verify what landed on the unit.
    VERIFY_OK=0
    for f in MainMenuCtrl.js; do
        [ "$(md5 "${CTRL}/js/$f")" = "$(md5 "${PAYLOAD}/js/$f")" ] || VERIFY_OK=1
    done
    for f in MainMenuCtrl.css MainMenuCtrl_rtl.css; do
        [ "$(md5 "${CTRL}/css/$f")" = "$(md5 "${PAYLOAD}/css/$f")" ] || VERIFY_OK=1
    done
    for f in Home2Tajawal-Light.ttf Home2Tajawal-Medium.ttf Home2Tajawal-Bold.ttf; do
        [ "$(md5 "${FONTS}/$f")" = "$(md5 "${PAYLOAD}/fonts/$f")" ] || VERIFY_OK=1
    done
    [ "$(md5 "${SKIN_CSS}")" = "$(md5 "${PAYLOAD}/skin/css/common_rtl.css")" ] || VERIFY_OK=1
    [ "$(md5 "${SKIN_MAIN}")" = "$(md5 "${PAYLOAD}/skin/css/home2skin.css")" ] || VERIFY_OK=1
    for p in "${PAYLOAD}"/skin/images/home2skin/*.png; do
        [ "$(md5 "${SKIN_IMG}/$(basename "$p")")" = "$(md5 "$p")" ] || VERIFY_OK=1
    done
    for p in "${PAYLOAD}"/skin/images/home2skin/ctl/*.png; do
        [ "$(md5 "${SKIN_IMG}/ctl/$(basename "$p")")" = "$(md5 "$p")" ] || VERIFY_OK=1
    done
    for p in "${PAYLOAD}"/skin/images/home2skin/icn/*.png; do
        [ "$(md5 "${SKIN_IMG}/icn/$(basename "$p")")" = "$(md5 "$p")" ] || VERIFY_OK=1
    done

    # Navigation map skin (only once everything else is in place).
    NAV_OK=0
    if [ ${COPY_OK} -eq 0 ] && [ ${VERIFY_OK} -eq 0 ]; then
        install_nav && install_nav_data
        NAV_OK=$?
    fi

    if [ ${COPY_OK} -ne 0 ] || [ ${VERIFY_OK} -ne 0 ] || [ ${NAV_OK} -ne 0 ]; then
        echo "Copy or verify failed: restoring originals."
        restore_originals "${BACKUP}"
        rm -f "${CTRL}/css/MainMenuCtrl_rtl.css" "${FONTS}"/Home2Tajawal-*.ttf
        remove_skin "${BACKUP}"
        if [ ${NAV_OK} -ne 0 ]; then
            restore_nav "${BACKUP}" force; restore_nav_data force
        else
            restore_nav "${BACKUP}"; restore_nav_data
        fi
        rm -rf "${NAV_WORK}"
        sync
        dialog_wait "Install failed while copying.\nThe original home screen was restored.\nSee logs/install.log on the USB stick." 12
        exit 1
    fi

    echo "=== Home 2.0 install complete ==="
    dialog_wait "Home 2.0 installed!\nYou can remove the USB stick.\nRestarting in 5 seconds..." 5
else
    # ======================================================================
    # REMOVE
    # ======================================================================
    exec > "${MYDIR}/logs/remove.log" 2>&1
    echo "=== Home 2.0 remove start: firmware ${CMU_VER} ==="
    dialog_info "Removing Home 2.0...\nDo not remove the USB stick."

    if [ -f "${BACKUP}/MainMenuCtrl.js" ] && [ -f "${BACKUP}/MainMenuCtrl.css" ]; then
        SRC="${BACKUP}"
    elif [ -f "${USB_BACKUP}/MainMenuCtrl.js" ] && [ -f "${USB_BACKUP}/MainMenuCtrl.css" ]; then
        SRC="${USB_BACKUP}"
    else
        SRC=""
    fi

    if ! grep -q "${MARKER}" "${CTRL}/js/MainMenuCtrl.js"; then
        echo "Home 2.0 is not installed on this unit."
        dialog_wait "Home 2.0 is not installed.\nNothing to remove." 6
        exit 0
    fi

    if [ -z "${SRC}" ]; then
        echo "No backup found."
        dialog_wait "No backup of the original files was found.\nNothing was changed." 10
        exit 1
    fi

    restore_originals "${SRC}"
    RESTORE_OK=$?
    rm -f "${CTRL}/css/MainMenuCtrl_rtl.css"
    rm -rf "${CTRL}/images/home2"
    rm -f "${FONTS}"/Tajawal-*.ttf "${FONTS}"/Home2Tajawal-*.ttf
    rm -f "${OLD_FONTS}"/Tajawal-*.ttf "${OLD_FONTS}"/Home2Tajawal-*.ttf
    remove_skin "${SRC}"
    restore_nav "${SRC}" || RESTORE_OK=1
    restore_nav_data || RESTORE_OK=1
    sync

    if [ ${RESTORE_OK} -ne 0 ]; then
        dialog_wait "Could not restore the original files.\nSee logs/remove.log on the USB stick." 12
        exit 1
    fi
    echo "Restored originals from ${SRC}"
    echo "=== Home 2.0 remove complete ==="
    dialog_wait "Home 2.0 removed. Original home screen restored.\nRestarting in 5 seconds..." 5
fi

killall -q jci-dialog
reboot
