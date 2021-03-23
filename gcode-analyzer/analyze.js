const { program } = require("commander");
const fs = require("fs");
const path = require("path");
const GCodeReader = require("./GCodeReader.js");
const { analyzeModel } = require("./tmpnameuntilrefactor.js");

program
  .requiredOption("-f, --file <path>", "input gcode file")
  .option("-o, --output", "file to write analysis output (default stdout)");

program.parse(process.argv);
const options = program.opts();

const inputFilePath = path.resolve(options.file);

const fileText = fs.readFileSync(inputFilePath, "utf-8");

const gcodeReader = new GCodeReader();
const model = gcodeReader.loadFile(fileText);

// console.log(`model: ${JSON.stringify(model, null, 2)}`);
const analysis = analyzeModel(model);
const analysisString = JSON.stringify(
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
);

console.log(`analysis: ${analysisString}`);
