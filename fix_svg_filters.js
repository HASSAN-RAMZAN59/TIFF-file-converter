const fs = require('fs');

const path = 'src/assets/Group 1000007536.svg';
let content = fs.readFileSync(path, 'utf8');

// Replace complex Figma drop shadow filters with a single feDropShadow
const regex = /<filter id="(filter\d+_d_\d+_\d+)"[^>]*>[\s\S]*?<\/filter>/g;

content = content.replace(regex, (match, id) => {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
  <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#2780FB" flood-opacity="0.25" />
</filter>`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed SVG filters for drop shadows.');
