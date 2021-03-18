/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:31 AM
 */

import { parseGCode } from "./Worker.js";

export default class GCodeReader {
  slicer = "unknown";
  gCodeOptions = {
    sortLayers: true,
    purgeEmptyLayers: true,
    analyzeModel: false,
    filamentType: "ABS",
    filamentDia: 1.75,
    nozzleDia: 0.4,
  };

  getParamsFromKISSlicer = function (gcode) {
    const nozzle = gcode.match(/extrusion_width_mm\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/fiber_dia_mm\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  getParamsFromSlic3r = function (gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  getParamsFromSkeinforge = function (gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/Filament_Diameter_(mm)\s*:\s*(\d*\.\d+)/m);
    if (filament) {
      gCodeOptions.filamentDia = filament[1];
    }
  };

  getParamsFromMiracleGrue = function (gcode) {};

  getParamsFromCura = function (gcode) {
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

  detectSlicer = function (gcode) {
    let slicer = "unknown";
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

    return slicer;
  };

  loadFile(gcodeFileText) {
    this.detectSlicer(gcodeFileText);
    let lines = gcodeFileText.split(/\n/);
    return parseGCode(lines);
  }
}
