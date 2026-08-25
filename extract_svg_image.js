
const fs = require("fs");
const svg = fs.readFileSync("src/assets/Group 1000007532.svg", "utf8");
const match = svg.match(/<image[^>]*href="data:image\/png;base64,([^"]+)"[^>]*>/);
if (match) {
  fs.writeFileSync("src/assets/group_1000007532_top.png", Buffer.from(match[1], "base64"));
  console.log("Extracted successfully!");
  // also create SVG without the image
  const newSvg = svg.replace(/<image[^>]*href="data:image\/png;base64,[^"]+"[^>]*>/, "");
  fs.writeFileSync("src/assets/group_1000007532_bottom.svg", newSvg);
  console.log("Created modified SVG.");
} else {
  console.log("No image found.");
}

