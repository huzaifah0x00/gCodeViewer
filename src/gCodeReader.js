/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:31 AM
 */

export default function gCodeReader() {
  // ***** PRIVATE ******
  let gcode;
  let lines;
  let z_heights = {};
  let model = [];
  let max = {
    x: undefined,
    y: undefined,
    z: undefined,
    speed: undefined,
    volSpeed: undefined,
    extrSpeed: undefined,
  };
  let min = {
    x: undefined,
    y: undefined,
    z: undefined,
    speed: undefined,
    volSpeed: undefined,
    extrSpeed: undefined,
  };
  let modelSize = { x: undefined, y: undefined, z: undefined };
  let filamentByLayer = {};
  let filamentByExtruder = {};
  let printTimeByLayer;
  let totalFilament = 0;
  let printTime = 0;
  let totalWeight = 0;
  let layerHeight = 0;
  let layerCnt = 0;
  let layerTotal = 0;
  let speeds = {};
  let slicer = "unknown";
  let speedsByLayer = {};
  let volSpeeds = {};
  let volSpeedsByLayer = {};
  let extrusionSpeeds = {};
  let extrusionSpeedsByLayer = {};
  const gCodeOptions = {
    sortLayers: false,
    purgeEmptyLayers: true,
    analyzeModel: false,
    filamentType: "ABS",
    filamentDia: 1.75,
    nozzleDia: 0.4,
  };

  const prepareGCode = function () {
    if (!lines) return;
    gcode = [];
    let i;
    for (i = 0; i < lines.length; i++) {
      if (lines[i].match(/^(G0|G1|G90|G91|G92|M82|M83|G28)/i))
        gcode.push(lines[i]);
    }
    lines = [];
    //        console.log("GCode prepared");
  };

  const sortLayers = function () {
    const sortedZ = [];
    const tmpModel = [];
    //        var cnt = 0;
    //        console.log(z_heights);
    for (const layer in z_heights) {
      sortedZ[z_heights[layer]] = layer;
      //            cnt++;
    }
    //        console.log("cnt is " + cnt);
    sortedZ.sort((a, b) => a - b);
    //        console.log(sortedZ);
    //        console.log(model.length);
    for (let i = 0; i < sortedZ.length; i++) {
      //            console.log("i is " + i +" and sortedZ[i] is " + sortedZ[i] + "and z_heights[] is " + z_heights[sortedZ[i]] );
      if (typeof z_heights[sortedZ[i]] === "undefined") continue;
      tmpModel[i] = model[z_heights[sortedZ[i]]];
    }
    model = tmpModel;
    //        console.log(model.length);
    // delete tmpModel;
  };

  const purgeLayers = function () {
    let purge = true;
    if (!model) {
      console.log("Something terribly wrong just happened.");
      return;
    }
    for (let i = 0; i < model.length; i++) {
      purge = true;
      if (typeof model[i] === "undefined") purge = true;
      else {
        for (let j = 0; j < model[i].length; j++) {
          if (model[i][j].extrude) purge = false;
        }
      }
      if (purge) {
        model.splice(i, 1);
        i--;
      }
    }
  };

  const getParamsFromKISSlicer = function (gcode) {
    const nozzle = gcode.match(/extrusion_width_mm\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/fiber_dia_mm\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  const getParamsFromSlic3r = function (gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  const getParamsFromSkeinforge = function (gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/Filament_Diameter_(mm)\s*:\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  const getParamsFromMiracleGrue = function (gcode) {};

  const getParamsFromCura = function (gcode) {
    //        console.log("cura");
    const profileString = gcode.match(
      /CURA_PROFILE_STRING:((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))/m
    );
    if (profileString) {
      const raw = window.atob(profileString[1]);
      const array = new Uint8Array(new ArrayBuffer(raw.length));

      for (i = 0; i < raw.length; i++) {
        array[i] = raw.charCodeAt(i);
      }
      const data = new Zlib.inflate(array.subarray(2, array.byteLength - 4));
      let msg;
      for (i = 0; i < data.length; i += 1) {
        msg += String.fromCharCode(data[i]);
      }
      const nozzle = msg.match(/nozzle_size\s*=\s*(\d*\.\d+)/m);
      if (nozzle) {
        gCodeOptions.nozzleDia = nozzle[1];
      }
      const filament = msg.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
      if (filament) {
        gCodeOptions.filamentDia = filament[1];
      }
    }
  };

  const detectSlicer = function (gcode) {
    if (gcode.match(/Slic3r/)) {
      slicer = "Slic3r";
      getParamsFromSlic3r(gcode);
    } else if (gcode.match(/KISSlicer/)) {
      slicer = "KISSlicer";
      getParamsFromKISSlicer(gcode);
    } else if (gcode.match(/skeinforge/)) {
      slicer = "skeinforge";
      getParamsFromSkeinforge(gcode);
    } else if (gcode.match(/CURA_PROFILE_STRING/)) {
      slicer = "cura";
      getParamsFromCura(gcode);
    } else if (gcode.match(/Miracle/)) {
      slicer = "makerbot";
      getParamsFromMiracleGrue(gcode);
    } else if (gcode.match(/ffslicer/)) {
      slicer = "Flash Forge";
    }
  };

  // ***** PUBLIC *******
  return {
    loadFile(reader) {
      //            console.log("loadFile");
      model = [];
      z_heights = [];
      detectSlicer(reader.target.result);
      lines = reader.target.result.split(/\n/);
      reader.target.result = null;
      //            prepareGCode();

      GCODE.ui.worker.postMessage({
        cmd: "parseGCode",
        msg: {
          gcode: lines,
          options: {
            firstReport: 5,
          },
        },
      });
      // delete lines;
    },
    setOption(options) {
      for (const opt in options) {
        gCodeOptions[opt] = options[opt];
      }
    },
    passDataToRenderer() {
      //                        console.log(model);
      if (gCodeOptions.sortLayers) sortLayers();
      //            console.log(model);
      if (gCodeOptions.purgeEmptyLayers) purgeLayers();
      //            console.log(model);
      GCODE.renderer.doRender(model, 0);
      GCODE.renderer3d.setModel(model);
    },
    processLayerFromWorker(msg) {
      //            var cmds = msg.cmds;
      //            var layerNum = msg.layerNum;
      //            var zHeightObject = msg.zHeightObject;
      //            var isEmpty = msg.isEmpty;
      //            console.log(zHeightObject);
      model[msg.layerNum] = msg.cmds;
      z_heights[msg.zHeightObject.zValue] = msg.zHeightObject.layer;
      //            GCODE.renderer.doRender(model, msg.layerNum);
    },
    processMultiLayerFromWorker(msg) {
      for (let i = 0; i < msg.layerNum.length; i++) {
        model[msg.layerNum[i]] = msg.model[msg.layerNum[i]];
        z_heights[msg.zHeightObject.zValue[i]] = msg.layerNum[i];
      }
      //            console.log(model);
    },
    processAnalyzeModelDone(msg) {
      min = msg.min;
      max = msg.max;
      modelSize = msg.modelSize;
      totalFilament = msg.totalFilament;
      filamentByLayer = msg.filamentByLayer;
      filamentByExtruder = msg.filamentByExtruder;
      speeds = msg.speeds;
      speedsByLayer = msg.speedsByLayer;
      printTime = msg.printTime;
      printTimeByLayer = msg.printTimeByLayer;
      layerHeight = msg.layerHeight;
      layerCnt = msg.layerCnt;
      layerTotal = msg.layerTotal;
      volSpeeds = msg.volSpeeds;
      volSpeedsByLayer = msg.volSpeedsByLayer;
      extrusionSpeeds = msg.extrusionSpeeds;
      extrusionSpeedsByLayer = msg.extrusionSpeedsByLayer;

      let density = 1;
      if (gCodeOptions.filamentType === "ABS") {
        density = 1.04;
      } else if (gCodeOptions.filamentType === "PLA") {
        density = 1.24;
      }
      totalWeight =
        (((((density * 3.141 * gCodeOptions.filamentDia) / 10) *
          gCodeOptions.filamentDia) /
          10 /
          4) *
          totalFilament) /
        10;

      gCodeOptions.wh =
        parseFloat(gCodeOptions.nozzleDia) / parseFloat(layerHeight);
      if (slicer === "Slic3r" || slicer === "cura") {
        // slic3r stores actual nozzle diameter, but extrusion is usually slightly thicker, here we compensate for that
        // kissslicer stores actual extrusion width - so no need for that.
        gCodeOptions.wh *= 1.1;
      }
    },
    getLayerFilament(z) {
      return filamentByLayer[z];
    },
    getLayerSpeeds(z) {
      return speedsByLayer[z] ? speedsByLayer[z] : {};
    },
    getModelInfo() {
      return {
        min,
        max,
        modelSize,
        totalFilament,
        filamentByExtruder,
        speeds,
        speedsByLayer,
        printTime,
        printTimeByLayer,
        totalWeight,
        layerHeight,
        layerCnt,
        layerTotal,
        volSpeeds,
        volSpeedsByLayer,
        extrusionSpeeds,
        extrusionSpeedsByLayer,
      };
    },
    getGCodeLines(layer, fromSegments, toSegments) {
      const i = 0;
      const result = {
        first: model[layer][fromSegments].gcodeLine,
        last: model[layer][toSegments].gcodeLine,
      };
      return result;
    },
    getOptions() {
      return gCodeOptions;
    },
  };
}
