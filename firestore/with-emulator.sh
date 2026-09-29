#!/usr/bin/env bash
# Runs a command against a local Firestore emulator, then stops it.
#
#   firestore/with-emulator.sh npm run test:emulator
#
# The emulator is the JAR that the Firebase CLI would download, taken from the same place and
# checked against its published SHA-256, so no npm package is needed. It requires Java 21 and curl.
# The JAR is cached in FIREBASE_EMULATORS_PATH (default ~/.cache/firebase/emulators, shared with
# the Firebase CLI). The command receives FIRESTORE_EMULATOR_HOST.
set -euo pipefail

VERSION=1.22.0
SHA256=9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c
URL="https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v$VERSION.jar"
CACHE_DIR="${FIREBASE_EMULATORS_PATH:-$HOME/.cache/firebase/emulators}"
JAR="$CACHE_DIR/cloud-firestore-emulator-v$VERSION.jar"
HOST=127.0.0.1
PORT="${FIRESTORE_EMULATOR_PORT:-8180}"

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command...>" >&2
  exit 2
fi

checksum() {
  sha256sum "$1" | cut -d' ' -f1
}

if [ ! -f "$JAR" ] || [ "$(checksum "$JAR")" != "$SHA256" ]; then
  echo "Downloading the Firestore emulator v$VERSION..." >&2
  mkdir -p "$CACHE_DIR"
  curl --fail --silent --show-error --location --output "$JAR.part" "$URL"
  if [ "$(checksum "$JAR.part")" != "$SHA256" ]; then
    rm -f "$JAR.part"
    echo "The downloaded emulator does not match the expected SHA-256." >&2
    exit 1
  fi
  mv "$JAR.part" "$JAR"
fi

LOG="$(mktemp)"
java -Duser.language=en -jar "$JAR" --host="$HOST" --port="$PORT" >"$LOG" 2>&1 &
EMULATOR_PID=$!
cleanup() {
  kill "$EMULATOR_PID" 2>/dev/null || true
  wait "$EMULATOR_PID" 2>/dev/null || true
  rm -f "$LOG"
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl --silent --output /dev/null "http://$HOST:$PORT/"; then
    break
  fi
  if ! kill -0 "$EMULATOR_PID" 2>/dev/null; then
    echo "The emulator stopped while starting:" >&2
    cat "$LOG" >&2
    exit 1
  fi
  sleep 0.5
done

if ! curl --silent --output /dev/null "http://$HOST:$PORT/"; then
  echo "The emulator did not answer on $HOST:$PORT in time:" >&2
  cat "$LOG" >&2
  exit 1
fi

set +e
FIRESTORE_EMULATOR_HOST="$HOST:$PORT" "$@"
exit $?
