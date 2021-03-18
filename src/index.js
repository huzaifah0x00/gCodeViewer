import fs from "fs";
import GCodeReader from "./gCodeReader.js";
import { runAnalyze } from "./Worker.js";

const testFilePath = new URL(
  "../tests/test-files/random-sample-1.gcode",
  import.meta.url
);

// const testFilePath = new URL("../tests/AMZ_Part1.gcode", import.meta.url);

const fileText = fs.readFileSync(testFilePath, "utf-8");

const gcodeReader = new GCodeReader();
const model = gcodeReader.loadFile(fileText);

// console.log(`model: ${JSON.stringify(model, null, 2)}`);
const analysis = runAnalyze(model);
console.log(`analysis: ${JSON.stringify(analysis, null, 2)}`);
