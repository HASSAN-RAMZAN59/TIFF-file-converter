
const fs = require("fs");
const svg = fs.readFileSync("src/assets/Group 1000007532.svg", "utf8");
const match = svg.match(/<[^>]+fill="url\(#pattern0[^"]*\)"[^>]*>/);
if (match) {
  console.log("Shape using pattern:", match[0]);
} else {
  console.log("No shape using pattern found.");
}

