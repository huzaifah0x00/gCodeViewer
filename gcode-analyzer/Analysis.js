module.exports = class GCodeAnalysis {
  constructor({
    max,
    min,
    modelSize,
    totalFilament,
    filamentByLayer,
    filamentByExtruder,
    printTime,
    layerHeight,
    layerCnt,
    layerTotal,
    speeds,
    speedsByLayer,
    volSpeeds,
    volSpeedsByLayer,
    printTimeByLayer,
    extrusionSpeeds,
    extrusionSpeedsByLayer,
  }) {
    this.max = max;
    this.min = min;
    this.modelSize = modelSize;
    this.totalFilament = totalFilament;
    this.filamentByLayer = filamentByLayer;
    this.filamentByExtruder = filamentByExtruder;
    this.printTime = printTime;
    this.layerHeight = layerHeight;
    this.layerCnt = layerCnt;
    this.layerTotal = layerTotal;
    this.speeds = speeds;
    this.speedsByLayer = speedsByLayer;
    this.volSpeeds = volSpeeds;
    this.volSpeedsByLayer = volSpeedsByLayer;
    this.printTimeByLayer = printTimeByLayer;
    this.extrusionSpeeds = extrusionSpeeds;
    this.extrusionSpeedsByLayer = extrusionSpeedsByLayer;
  }
};
