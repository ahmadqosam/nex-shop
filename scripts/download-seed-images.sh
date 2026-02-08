#!/bin/bash
set -e

# Downloads placeholder product images for local development.
# Uses picsum.photos with unique seeds so each image looks different.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DIR="$ROOT_DIR/apps/api/product-api/public/images/products"

mkdir -p "$DIR"

download() {
  local filename="$1"
  local seed="$2"
  local filepath="$DIR/$filename"

  if [ -f "$filepath" ]; then
    echo -e "  ${YELLOW}Skip${NC}  $filename (already exists)"
  else
    echo -n "  Downloading $filename..."
    curl -sL -o "$filepath" "https://picsum.photos/seed/${seed}/800/800"
    echo -e " ${GREEN}done${NC}"
  fi
}

echo ""
echo -e "  ${GREEN}Downloading seed product images...${NC}"
echo ""

download "nex-ace-1.jpg"    "headphones1"
download "nex-ace-2.jpg"    "headphones2"
download "nex-ace-3.jpg"    "headphones3"
download "beam-gen2-1.jpg"  "soundbar1"
download "beam-gen2-2.jpg"  "soundbar2"
download "roam-2-1.jpg"     "speaker1"
download "roam-2-2.jpg"     "speaker2"
download "move-2-1.jpg"     "speaker3"
download "move-2-2.jpg"     "speaker4"

echo ""
echo -e "  ${GREEN}All seed images downloaded to apps/api/product-api/public/images/products/${NC}"
echo ""
