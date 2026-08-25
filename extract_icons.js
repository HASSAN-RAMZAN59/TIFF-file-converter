const fs = require('fs');

const svg = fs.readFileSync('src/assets/Hero Illustration Area.svg', 'utf8');

function extractImage(id, outName) {
  const marker = '<image id="' + id + '"';
  const idx = svg.indexOf(marker);
  if (idx === -1) {
    console.log('Not found:', id);
    return;
  }
  const hrefMarker = 'xlink:href="data:image/png;base64,';
  const hrefIdx = svg.indexOf(hrefMarker, idx);
  if (hrefIdx === -1) {
    console.log('Href not found for:', id);
    return;
  }
  const start = hrefIdx + hrefMarker.length;
  const end = svg.indexOf('"', start);
  const base64Data = svg.substring(start, end);
  fs.writeFileSync('src/assets/' + outName, Buffer.from(base64Data, 'base64'));
  console.log('Saved src/assets/' + outName, 'bytes:', base64Data.length);
}

extractImage('image0_448_1194', 'hero_jpg.png');
extractImage('image1_448_1194', 'hero_pdf.png');
extractImage('image2_448_1194', 'hero_png.png');
extractImage('image3_448_1194', 'hero_webp.png');
extractImage('image4_448_1194', 'hero_tiff.png');
