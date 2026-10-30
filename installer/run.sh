#!/bin/sh
# ---------------------------------------------------------------------------
# Home 2.0 "Ember Glass" launcher for Mazda Connect — install / remove
# Runs on the car (busybox sh). Start it from the CMU terminal:
#     sh /tmp/mnt/sda1/run.sh        (use sdb1 etc. if that is where the stick is)
# MIT License. Not affiliated with Mazda. Use at your own risk.
# ---------------------------------------------------------------------------

TITLE="Home 2.0"
# Empty on the car. Only the automated tests set it, to run against a fake file system.
R="${HOME2_TEST_ROOT:-}"
DIALOG="${R}/jci/tools/jci-dialog"
MYDIR=$(dirname "$(readlink -f "$0")")
PAYLOAD="${MYDIR}/home2"
CTRL="${R}/jci/gui/apps/system/controls/MainMenu"
FONTS="${R}/jci/fonts"
BACKUP="${R}/data_persist/home2-backup"
USB_BACKUP="${MYDIR}/backup"
MARKER="Home 2.0 \"Ember Glass\" launcher"

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

# Keep the watchdog from rebooting the unit while we work, and make / writable.
echo 1 > "${R}/sys/class/gpio/Watchdog Disable/value" 2>/dev/null
mount -o rw,remount /
mount -o rw,remount "${MYDIR}" 2>/dev/null
mkdir -p "${MYDIR}/logs"

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

    # Copy the new launcher.
    mkdir -p "${CTRL}/images/home2"
    cp "${PAYLOAD}/js/MainMenuCtrl.js" "${CTRL}/js/MainMenuCtrl.js" &&
    cp "${PAYLOAD}/css/MainMenuCtrl.css" "${CTRL}/css/MainMenuCtrl.css" &&
    cp "${PAYLOAD}/css/MainMenuCtrl_rtl.css" "${CTRL}/css/MainMenuCtrl_rtl.css" &&
    cp "${PAYLOAD}"/images/home2/*.png "${CTRL}/images/home2/" &&
    cp "${PAYLOAD}"/fonts/Tajawal-*.ttf "${FONTS}/"
    COPY_OK=$?
    sync

    # Verify what landed on the unit.
    VERIFY_OK=0
    for f in MainMenuCtrl.js; do
        [ "$(md5 "${CTRL}/js/$f")" = "$(md5 "${PAYLOAD}/js/$f")" ] || VERIFY_OK=1
    done
    for f in MainMenuCtrl.css MainMenuCtrl_rtl.css; do
        [ "$(md5 "${CTRL}/css/$f")" = "$(md5 "${PAYLOAD}/css/$f")" ] || VERIFY_OK=1
    done

    if [ ${COPY_OK} -ne 0 ] || [ ${VERIFY_OK} -ne 0 ]; then
        echo "Copy or verify failed: restoring originals."
        restore_originals "${BACKUP}"
        rm -f "${CTRL}/css/MainMenuCtrl_rtl.css"
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
    rm -f "${FONTS}"/Tajawal-*.ttf
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
