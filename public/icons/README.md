# PWA Icons Guide

To complete the PWA setup, you need to create the following icon files in the `public/icons/` directory:

## Required Icon Sizes:
- icon-72x72.png (72x72 pixels)
- icon-96x96.png (96x96 pixels)
- icon-128x128.png (128x128 pixels)
- icon-144x144.png (144x144 pixels)
- icon-152x152.png (152x152 pixels)
- icon-192x192.png (192x192 pixels) - Recommended
- icon-384x384.png (384x384 pixels) - Recommended
- icon-512x512.png (512x512 pixels) - Required for maskable icons

## How to create the icons:

### Option 1: Using an online icon generator
1. Go to https://www.favicon-generator.org/
2. Upload a square image (at least 512x512 pixels recommended)
3. Download the generated favicon package
4. Extract the PNG files to the `public/icons/` directory

### Option 2: Using ImageMagick (if installed)
```bash
# Create a base icon (replace 'source-icon.png' with your source image)
convert source-icon.png -resize 512x512 public/icons/icon-512x512.png
convert source-icon.png -resize 384x384 public/icons/icon-384x384.png
convert source-icon.png -resize 192x192 public/icons/icon-192x192.png
convert source-icon.png -resize 152x152 public/icons/icon-152x152.png
convert source-icon.png -resize 144x144 public/icons/icon-144x144.png
convert source-icon.png -resize 128x128 public/icons/icon-128x128.png
convert source-icon.png -resize 96x96 public/icons/icon-96x96.png
convert source-icon.png -resize 72x72 public/icons/icon-72x72.png
```

### Option 3: Using online converters
- https://favicon.io/favicon-converter/
- https://convertio.co/png-converter/

## Icon Requirements:
- Format: PNG
- Background: Transparent or solid color
- Shape: Square
- Minimum size: 192x192 pixels (for best results use 512x512)
- For maskable icons: Include extra padding around the main subject

## Testing your PWA:
After adding the icons, test your PWA using:
1. Chrome DevTools Application tab
2. Lighthouse audit
3. Web App Manifest validator: https://manifest-validator.appspot.com/