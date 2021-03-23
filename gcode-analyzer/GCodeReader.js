/* eslint-disable prefer-destructuring */
/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:31 AM
 */

const zlib = require("zlib");

const { parseGCode } = require("./tmpnameuntilrefactor.js");

module.exports = class GCodeReader {
  constructor() {
    this.slicer = "unknown";
    this.gCodeOptions = {
      sortLayers: true,
      purgeEmptyLayers: true,
      analyzeModel: false,
      filamentType: "ABS",
      filamentDia: 1.75,
      nozzleDia: 0.4,
    };
  }

  getParamsFromKISSlicer(gcode) {
    const nozzle = gcode.match(/extrusion_width_mm\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      this.gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/fiber_dia_mm\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      this.gCodeOptions.filamentDia = filament[1];
    }
  }

  getParamsFromSlic3r(gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      this.gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
    if (filament) {
      this.gCodeOptions.filamentDia = filament[1];
    }
  }

  getParamsFromSkeinforge(gcode) {
    const nozzle = gcode.match(/nozzle_diameter\s*=\s*(\d*\.\d+)/m);
    if (nozzle) {
      this.gCodeOptions.nozzleDia = nozzle[1];
    }
    const filament = gcode.match(/Filament_Diameter_(mm)\s*:\s*(\d*\.\d+)/m);
    if (filament) {
      this.gCodeOptions.filamentDia = filament[1];
    }
  }

  getParamsFromCura(gcode) {
    //        console.log("cura");
    const profileString = gcode.match(
      /CURA_PROFILE_STRING:((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))/m
    );
    if (profileString) {
      const raw = Buffer.from(profileString[1], "base64").toString();

      const array = new Uint8Array(new ArrayBuffer(raw.length));

      for (let i = 0; i < raw.length; i += 1) {
        array[i] = raw.charCodeAt(i);
      }
      const data = zlib.inflate(array.subarray(2, array.byteLength - 4));
      let msg;
      for (let i = 0; i < data.length; i += 1) {
        msg += String.fromCharCode(data[i]);
      }
      const nozzle = msg.match(/nozzle_size\s*=\s*(\d*\.\d+)/m);
      if (nozzle) {
        this.gCodeOptions.nozzleDia = nozzle[1];
      }
      const filament = msg.match(/filament_diameter\s*=\s*(\d*\.\d+)/m);
      if (filament) {
        this.gCodeOptions.filamentDia = filament[1];
      }
    }
  }

  detectSlicer(gcode) {
    let slicer = "unknown";
    if (gcode.match(/Slic3r/)) {
      slicer = "Slic3r";
      this.getParamsFromSlic3r(gcode);
    } else if (gcode.match(/KISSlicer/)) {
      slicer = "KISSlicer";
      this.getParamsFromKISSlicer(gcode);
    } else if (gcode.match(/skeinforge/)) {
      slicer = "skeinforge";
      this.getParamsFromSkeinforge(gcode);
    } else if (gcode.match(/CURA_PROFILE_STRING/)) {
      slicer = "cura";
      this.getParamsFromCura(gcode);
    } else if (gcode.match(/Miracle/)) {
      slicer = "makerbot";
      this.getParamsFromMiracleGrue(gcode);
    } else if (gcode.match(/ffslicer/)) {
      slicer = "Flash Forge";
    }

    return slicer;
  }

  loadFile(gcodeFileText) {
    this.detectSlicer(gcodeFileText);
    const lines = gcodeFileText.split(/\n/);
    return parseGCode(lines);
  }
};
