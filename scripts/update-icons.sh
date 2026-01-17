#!/bin/bash

if ! command -v convert &> /dev/null; then
  echo "Error: ImageMagick is required but not installed."
  echo ""
  echo "Install with:"
  echo "  Ubuntu/Debian: sudo apt install imagemagick"
  echo "  macOS:         brew install imagemagick"
  echo "  Arch:          sudo pacman -S imagemagick"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$ROOT_DIR/resources"

ICON_COLOR="#3B82F6"

SOURCE_SVG="$RESOURCES_DIR/icon.svg"
COLORED_SVG="$RESOURCES_DIR/icon-colored.svg"
COLORED_PNG="$RESOURCES_DIR/icon-colored.png"

if [ ! -f "$SOURCE_SVG" ]; then
  echo "Error: $SOURCE_SVG not found"
  exit 1
fi

echo "Generating icon-colored.svg..."
sed "s/currentColor/$ICON_COLOR/g" "$SOURCE_SVG" > "$COLORED_SVG"

echo "Generating icon-colored.png..."
convert -background transparent -density 512 -resize 128x128 "$COLORED_SVG" "$COLORED_PNG"

echo "Done:"
ls -la "$RESOURCES_DIR"/icon*
