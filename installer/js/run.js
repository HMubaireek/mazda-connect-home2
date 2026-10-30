/*
 * Home 2.0 installer trigger.
 * Loaded by the GUI when one of the USB "trigger" MP3s plays.
 * Opens Diagnostics > JCI test, which shows the terminal where run.sh is started
 * (see README: "Install").
 */
(function () {
    framework.sendEventToMmui("syssettings", "SelectDiagnostics");
    setTimeout(function () {
        framework.sendEventToMmui("diag", "ActivateJCITest");
        setTimeout(function () {
            framework.sendEventToMmui("diag", "ReadDTC", { "payload" : { "testId" : 11 } });
        }, 7000);
    }, 7000);
})();
