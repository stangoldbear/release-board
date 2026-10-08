#!/usr/bin/env bash
# Updates this copy of Release Board to a published version by mirroring the files of the public
# repository over this folder: the files of that version are copied, the files it no longer has
# are removed, and what belongs to this instance alone (see EXCLUDED, and the optional
# .update-ignore file) is left as it is. Nothing is committed: the result is reviewed and
# committed by hand. The guide is docs/ISTANZA-101.md.
# Usage: scripts/update-from-release.sh [--dry-run] [vX.Y.Z]   (default: the latest version)
# Needs git and a working tree without uncommitted changes.
set -euo pipefail

SOURCE_REPO="https://github.com/stangoldbear/release-board.git"
# The temporary clone of the version; removed when the script ends, however it ends.
TMP=""
trap 'rm -rf "$TMP"' EXIT

# What exists only in this instance or only on this computer: never copied over, never removed.
# A pattern matches a path, or anything under it; * also crosses folders. More patterns, one per
# line, go in .update-ignore at the root of the repository.
EXCLUDED=(
  .git
  node_modules
  dist
  '.env*'
  .firebase
  .vite
  .vscode
  .idea
  '*.tsbuildinfo'
  .update-ignore
)

die() {
  echo "$*" >&2
  exit 1
}

# The highest vX.Y.Z tag of the public repository.
latest_version() {
  git ls-remote --tags --refs "$SOURCE_REPO" \
    | sed 's|.*refs/tags/||' \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | sed 's/^v//' \
    | sort -t . -k1,1n -k2,2n -k3,3n \
    | tail -n 1 \
    | sed 's/^/v/'
}

# The version of package.json in a folder, without needing node.
version_in() {
  sed -n 's/^  "version": "\(.*\)",$/\1/p' "$1/package.json" | head -n 1
}

# Whether a path is one of this instance's own, by EXCLUDED and .update-ignore.
excluded() {
  local path="$1" pattern
  for pattern in "${EXCLUDED[@]}"; do
    # shellcheck disable=SC2254
    case "$path" in $pattern | $pattern/*) return 0 ;; esac
  done
  if [ -f .update-ignore ]; then
    while IFS= read -r pattern || [ -n "$pattern" ]; do
      pattern="${pattern%%#*}"
      pattern="${pattern#"${pattern%%[![:space:]]*}"}"
      pattern="${pattern%"${pattern##*[![:space:]]}"}"
      [ -n "$pattern" ] || continue
      # shellcheck disable=SC2254
      case "$path" in $pattern | $pattern/*) return 0 ;; esac
    done < .update-ignore
  fi
  return 1
}

# Whole: the file is parsed before it runs, so that overwriting it during the copy is harmless.
main() {
  local dry_run=0 version=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -n | --dry-run) dry_run=1 ;;
      -h | --help)
        sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      -*) die "Opzione sconosciuta: $1 (vedi --help)" ;;
      *) version="$1" ;;
    esac
    shift
  done

  command -v git > /dev/null 2>&1 || die "Serve git, che qui non c'è."
  local root
  root="$(cd "$(dirname "$0")/.." && pwd)"
  cd "$root"
  [ -d .git ] || die "Questa cartella non è un repository git: la guida docs/ISTANZA-101.md spiega come crearlo."
  [ -f package.json ] || die "In $root non c'è package.json: lancia lo script dalla copia di Release Board."
  if [ -n "$(git status --porcelain)" ]; then
    die "Ci sono modifiche non ancora salvate con un commit, o file nuovi non ancora aggiunti. Salvali (git add -A && git commit) o scartali: così l'aggiornamento resta una modifica a sé, facile da controllare e da annullare."
  fi

  if [ -z "$version" ]; then
    echo "Cerco l'ultima versione pubblicata…"
    version="$(latest_version)"
    [ -n "$version" ] || die "Nessuna versione trovata in $SOURCE_REPO."
  fi
  case "$version" in
    v*) ;;
    *) version="v$version" ;;
  esac

  local current
  current="$(version_in "$root")"
  echo "Questa copia è alla ${current:-versione sconosciuta}; aggiorno alla $version."

  TMP="$(mktemp -d)"
  if ! git clone --quiet --depth 1 --branch "$version" "$SOURCE_REPO" "$TMP/release" 2> /dev/null; then
    die "La versione $version non esiste in $SOURCE_REPO (le versioni sono tag come v0.10.0)."
  fi

  # The files of the version go over this folder; the tracked files it no longer has go away.
  local file copied=0 removed=0 kept=0
  [ "$dry_run" -eq 1 ] && echo "Prova a vuoto: niente viene scritto. + copiato, - tolto, = tenuto perché dell'istanza."
  while IFS= read -r -d '' file; do
    if excluded "$file"; then
      [ "$dry_run" -eq 1 ] && echo "= $file"
      kept=$((kept + 1))
      continue
    fi
    if [ -f "$file" ] && cmp -s "$TMP/release/$file" "$file"; then continue; fi
    if [ "$dry_run" -eq 1 ]; then
      echo "+ $file"
    else
      mkdir -p "$(dirname "$file")"
      cp -p "$TMP/release/$file" "$file"
    fi
    copied=$((copied + 1))
  done < <(git -C "$TMP/release" ls-files -z)
  while IFS= read -r -d '' file; do
    [ -e "$TMP/release/$file" ] && continue
    # A version before 0.10.1 has no script: this one stays, to come back with.
    [ "$file" = "scripts/update-from-release.sh" ] && continue
    if excluded "$file"; then
      [ "$dry_run" -eq 1 ] && echo "= $file"
      kept=$((kept + 1))
      continue
    fi
    if [ "$dry_run" -eq 1 ]; then
      echo "- $file"
    else
      rm -f "$file"
      rmdir -p "$(dirname "$file")" 2> /dev/null || true
    fi
    removed=$((removed + 1))
  done < <(git ls-files -z)

  if [ "$dry_run" -eq 1 ]; then
    echo "Cambierebbero $copied file, $removed verrebbero tolti, $kept restano dell'istanza."
    exit 0
  fi
  if [ "$copied" -eq 0 ] && [ "$removed" -eq 0 ]; then
    echo "Niente da aggiornare: i file sono già quelli della $version."
    exit 0
  fi
  echo
  echo "Copiati i file della $version: $copied file scritti, $removed tolti. Riepilogo (git status --short):"
  git status --short | head -n 40
  local changed
  changed="$(git status --porcelain | wc -l | tr -d ' ')"
  [ "$changed" -gt 40 ] && echo "  … e altri $((changed - 40))."
  echo
  echo "Prossimi passi:"
  if git status --porcelain | grep -q 'package-lock.json'; then
    echo "  1. npm ci                      (le dipendenze sono cambiate)"
  else
    echo "  1. npm ci                      (per sicurezza)"
  fi
  echo "  2. Leggi in CHANGELOG.md le voci tra la ${current:-tua versione} e la $version: se parlano di regole di"
  echo "     Firestore, ripubblica firestore/firestore.rules nella console Firebase."
  echo "  3. git add -A && git commit -m \"chore: aggiorna alla $version\" && git push"
  echo "     Il push fa ripartire il workflow Deploy Pages, che pubblica il sito aggiornato."
}

main "$@"
