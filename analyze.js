import fs from "fs";
import { analyzeModel } from "./gcode-analyzer/tmpnameuntilrefactor";
import GCodeReader from "./gcode-analyzer/GCodeReader";

export default function analyzeGcode(gcodeFilePath) {
  const fileText = fs.readFileSync(gcodeFilePath, "utf-8");

  const gcodeReader = new GCodeReader();
  const model = gcodeReader.loadFile(fileText);

  const analysis = analyzeModel(model);

  return analysis;
}
