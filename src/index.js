import fs from "fs";
import { analyzeModel } from "./Worker";
import GCodeReader from "./GCodeReader";

export default function analyzeGcode(gcodeFilePath) {
  const fileText = fs.readFileSync(gcodeFilePath, "utf-8");

  const gcodeReader = new GCodeReader();
  const model = gcodeReader.loadFile(fileText);

  const analysis = analyzeModel(model);

  return analysis;
}
