#!/bin/zsh
set -e
folio_root="$(cd "$(dirname "$0")" && pwd)"
open "$folio_root/release/mac-arm64/Folio.app"
