const fs = require("fs");
const { analyzeModel } = require("./gcode-analyzer/tmpnameuntilrefactor");
const GCodeReader = require("./gcode-analyzer/GCodeReader");

module.exports = function analyzeGcode(gcodeFilePath) {
  const fileText = fs.readFileSync(gcodeFilePath, "utf-8");

  const gcodeReader = new GCodeReader();
  const model = gcodeReader.loadFile(fileText);

  const analysis = analyzeModel(model);
  const lessAnalysis = {
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
  };

  return lessAnalysis;
};
