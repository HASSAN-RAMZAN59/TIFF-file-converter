const fs = require('fs');

// Read the tightly-trimmed PNG files and convert to base64
const jpgBase64 = fs.readFileSync('src/assets/hero_jpg_trimmed.png').toString('base64');
const pdfBase64 = fs.readFileSync('src/assets/hero_pdf_trimmed.png').toString('base64');
const pngBase64 = fs.readFileSync('src/assets/hero_png_trimmed.png').toString('base64');
const webpBase64 = fs.readFileSync('src/assets/hero_webp_trimmed.png').toString('base64');
const tiffBase64 = fs.readFileSync('src/assets/hero_tiff_trimmed.png').toString('base64');

// All 4 outer icons rendered at exact identical visual height (90px) and proportional width
const cleanSvg = `<svg width="412" height="548" viewBox="0 0 412 548" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Rich soft radial blue glow - solid up to icons, then feathered -->
    <radialGradient id="softAura" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#D7E7FA" stop-opacity="1.0"/>
      <stop offset="72%" stop-color="#D7E7FA" stop-opacity="1.0"/>
      <stop offset="88%" stop-color="#E9F2FC" stop-opacity="0.50"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </radialGradient>
  </defs>

  <!-- Noticeable soft aura with smooth faded boundaries -->
  <circle cx="206" cy="274" r="215" fill="url(#softAura)"/>

  <!-- Clean dotted ray lines -->
  <g opacity="0.45">
    <path d="M206 274C147.667 215.667 106.833 174.833 83.5 151.5" stroke="#118736" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M206 274C147.667 332.333 112.667 367.333 101 379" stroke="#2273D4" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M206 274C264.333 215.667 305.167 186.5 328.5 186.5" stroke="#D63230" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M206 274C264.333 332.333 299.333 373.167 311 396.5" stroke="#8579E2" stroke-width="2" stroke-dasharray="6 6"/>
  </g>

  <!-- 1. Top-Left: JPG Icon -->
  <g transform="translate(35, 115) rotate(-14 48 48)">
    <image x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${jpgBase64}"/>
  </g>

  <!-- 2. Top-Right: PDF Icon -->
  <g transform="translate(295, 105) rotate(11 48 48)">
    <image x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${pdfBase64}"/>
  </g>

  <!-- 3. Bottom-Left: PNG Icon -->
  <g transform="translate(32, 345) rotate(-8 48 48)">
    <image x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${pngBase64}"/>
  </g>

  <!-- 4. Bottom-Right: WEBP Icon -->
  <g transform="translate(295, 335) rotate(6 48 48)">
    <image x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${webpBase64}"/>
  </g>

  <!-- 5. Center: TIFF Main Icon -->
  <g transform="translate(142, 210)">
    <image x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${tiffBase64}"/>
  </g>
</svg>
`;

fs.writeFileSync('src/assets/Hero Illustration Area.svg', cleanSvg, 'utf8');
console.log('Updated SVG with perfectly equalized visual dimensions for all 4 icons!');
