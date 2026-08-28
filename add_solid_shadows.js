const fs = require('fs');
const path = 'src/assets/Group 1000007536.svg';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the radial gradient circles we added previously
content = content.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="50" fill="url\(#cardShadow\)"\/>\n/g, '');

// 2. We will find each card's white background path and prepend 3 identical paths shifted downwards
// to create a beautiful, accurate bottom drop shadow effect.
// Card background paths always have fill="#FDFDFE" in this SVG.

content = content.replace(/<path d="([^"]+)" fill="#FDFDFE"\/>/g, (match, d) => {
  return `
<!-- Soft drop shadow layers -->
<path d="${d}" transform="translate(0, 8)" fill="#2780FB" opacity="0.04"/>
<path d="${d}" transform="translate(0, 6)" fill="#2780FB" opacity="0.08"/>
<path d="${d}" transform="translate(0, 4)" fill="#2780FB" opacity="0.12"/>
<!-- Original card background -->
<path d="${d}" fill="#FDFDFE"/>`.trim();
});

fs.writeFileSync(path, content, 'utf8');
console.log('Applied solid bottom drop shadows!');
