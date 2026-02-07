#!/bin/bash
# Resize screenshots for App Store submission
# Source: 1284x2778 (iPhone 14 Pro 6.1")
# iPad source: 2048x2732 (iPad Pro 12.9" - already correct)

SRC="/Users/michaelperkins/Desktop/Project MJ/screenshots"
DST="/Users/michaelperkins/Desktop/Project MJ/fastlane/screenshots/en-US"

mkdir -p "$DST"

echo "=== Resizing iPhone screenshots ==="

# For each iPhone screenshot, create versions for required sizes
# Using sips to resample to exact dimensions
for i in 1 2 3 4 5; do
    src_file="$SRC/screenshot_${i}.png"
    
    if [ ! -f "$src_file" ]; then
        echo "SKIP: $src_file not found"
        continue
    fi
    
    # 6.7" (1290x2796) - Primary required size
    echo "  Creating 6.7\" version of screenshot_${i}..."
    cp "$src_file" "$DST/iphone67_screenshot_${i}.png"
    sips --resampleHeightWidth 2796 1290 "$DST/iphone67_screenshot_${i}.png" --out "$DST/iphone67_screenshot_${i}.png" > /dev/null 2>&1
    
    # 6.5" (1242x2688)
    echo "  Creating 6.5\" version of screenshot_${i}..."
    cp "$src_file" "$DST/iphone65_screenshot_${i}.png"
    sips --resampleHeightWidth 2688 1242 "$DST/iphone65_screenshot_${i}.png" --out "$DST/iphone65_screenshot_${i}.png" > /dev/null 2>&1
    
    # 5.5" (1242x2208)
    echo "  Creating 5.5\" version of screenshot_${i}..."
    cp "$src_file" "$DST/iphone55_screenshot_${i}.png"
    sips --resampleHeightWidth 2208 1242 "$DST/iphone55_screenshot_${i}.png" --out "$DST/iphone55_screenshot_${i}.png" > /dev/null 2>&1
done

echo ""
echo "=== Copying iPad screenshots ==="

# iPad Pro 12.9" (2048x2732) - already correct size
for i in 1 2 3 4 5; do
    src_file="$SRC/ipad/ipad_screenshot_${i}.png"
    
    if [ ! -f "$src_file" ]; then
        echo "SKIP: $src_file not found"
        continue
    fi
    
    echo "  Copying iPad screenshot_${i}..."
    cp "$src_file" "$DST/ipad_pro_129_screenshot_${i}.png"
done

echo ""
echo "=== Verifying dimensions ==="
echo ""
echo "6.7\" screenshots (should be 1290x2796):"
sips -g pixelWidth -g pixelHeight "$DST/iphone67_screenshot_1.png" 2>/dev/null | grep pixel

echo ""
echo "6.5\" screenshots (should be 1242x2688):"
sips -g pixelWidth -g pixelHeight "$DST/iphone65_screenshot_1.png" 2>/dev/null | grep pixel

echo ""
echo "5.5\" screenshots (should be 1242x2208):"
sips -g pixelWidth -g pixelHeight "$DST/iphone55_screenshot_1.png" 2>/dev/null | grep pixel

echo ""
echo "iPad Pro 12.9\" screenshots (should be 2048x2732):"
sips -g pixelWidth -g pixelHeight "$DST/ipad_pro_129_screenshot_1.png" 2>/dev/null | grep pixel

echo ""
echo "=== Total files created ==="
ls -la "$DST/" | wc -l
echo "files in $DST"
ls "$DST/"

echo ""
echo "Done!"