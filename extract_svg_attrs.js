
const fs = require("fs");
const svg = fs.readFileSync("src/assets/Group 1000007532.svg", "utf8");
const match = svg.match(/<image([^>]+)href="data:image\/png;base64,[^"]+"([^>]*)>/);
if (match) {
  console.log("Attributes before href: ", match[1].trim());
  console.log("Attributes after href: ", match[2].trim());
}

