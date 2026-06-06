const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'tinyroommate-logo.svg');
const iconsDir = path.join(root, 'src-tauri', 'icons');
const iconsetDir = path.join(iconsDir, 'icon.iconset');

const pngTargets = [
  ['32x32.png', 32],
  ['128x128.png', 128],
  ['128x128@2x.png', 256],
  ['Square30x30Logo.png', 30],
  ['Square44x44Logo.png', 44],
  ['Square71x71Logo.png', 71],
  ['Square89x89Logo.png', 89],
  ['Square107x107Logo.png', 107],
  ['Square142x142Logo.png', 142],
  ['Square150x150Logo.png', 150],
  ['Square284x284Logo.png', 284],
  ['Square310x310Logo.png', 310],
  ['StoreLogo.png', 50],
  ['icon.png', 512],
];

const iconsetTargets = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
];

async function renderPng(fileName, size) {
  const outputPath = path.join(iconsDir, fileName);
  await sharp(svgPath, { density: 288 })
    .resize(size, size)
    .png()
    .toFile(outputPath);
}

async function renderIconsetPng(fileName, size) {
  const outputPath = path.join(iconsetDir, fileName);
  await sharp(svgPath, { density: 288 })
    .resize(size, size)
    .png()
    .toFile(outputPath);
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  for (const [fileName, size] of pngTargets) {
    await renderPng(fileName, size);
  }

  for (const [fileName, size] of iconsetTargets) {
    await renderIconsetPng(fileName, size);
  }

  console.log('Rendered TinyRoommate PNG icon assets.');
  console.log('Run `iconutil -c icns src-tauri/icons/icon.iconset -o src-tauri/icons/icon.icns` to refresh the macOS icon.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
