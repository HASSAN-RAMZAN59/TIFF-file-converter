
const fs = require("fs");
const svg = fs.readFileSync("src/assets/Group 1000007532.svg", "utf8");
// remove the giant base64 to print the rest of the SVG structure
const cleanSvg = svg.replace(/href="data:image\/png;base64,[^"]+"/g, "href=\"...\"");
console.log(cleanSvg.substring(0, 2000));

