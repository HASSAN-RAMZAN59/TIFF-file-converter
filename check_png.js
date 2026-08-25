
const fs = require("fs");
const buffer = fs.readFileSync("src/assets/group_1000007532_top.png");
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
console.log(`Width: ${width}, Height: ${height}`);

