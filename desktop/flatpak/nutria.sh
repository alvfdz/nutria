#!/bin/sh
# Starts Nutria inside the Flatpak. Chromium keeps its single-instance socket
# in TMPDIR, which has to be a folder every run of the app shares.
export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
exec zypak-wrapper /app/nutria/nutria "$@"
