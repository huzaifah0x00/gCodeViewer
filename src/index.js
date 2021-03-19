import fs from "fs";
import GCodeReader from "./gCodeReader.js";
import { analyzeModel } from "./Worker.js";

const testFilePath = new URL(
  "../tests/test-files/random-sample-1.gcode",
  import.meta.url
);

// const testFilePath = new URL("../tests/AMZ_Part1.gcode", import.meta.url);

const fileText = fs.readFileSync(testFilePath, "utf-8");

const gcodeReader = new GCodeReader();
const model = gcodeReader.loadFile(fileText);

// console.log(`model: ${JSON.stringify(model, null, 2)}`);
const analysis = analyzeModel(model);
console.log(
  `analysis: ${JSON.stringify(
    {
      max: analysis.max,
      min: analysis.min,
      modelSize: analysis.modelSize,
      totalFilament: analysis.totalFilament,
      // filamentByLayer: analysis.filamentByLayer,
      filamentByExtruder: analysis.filamentByExtruder,
      printTime: analysis.printTime,
      layerHeight: analysis.layerHeight,
      layerCnt: analysis.layerCnt,
      layerTotal: analysis.layerTotal,
      // speeds: analysis.speeds,
      // speedsByLayer: analysis.speedsByLayer,
      // volSpeeds: analysis.volSpeeds,
      // volSpeedsByLayer: analysis.volSpeedsByLayer,
      // printTimeByLayer: analysis.printTimeByLayer,
      // extrusionSpeeds: analysis.extrusionSpeeds,
      // extrusionSpeedsByLayer: analysis.extrusionSpeedsByLayer,
    },
    null,
    2
  )}`
);
