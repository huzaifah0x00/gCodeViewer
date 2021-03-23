/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/24/12
 * Time: 12:18 PM
 */

const MoveCommand = require("./Command.js");
const Layer = require("./Layer.js");
const Model = require("./Model.js");
const GCodeAnalysis = require("./Analysis.js");

module.exports.parseGCode = function parseGCode(gcodeLines) {
  let numSlice;
  const model = new Model();
  const zHeights = {};

  const linearMoveRegex = new RegExp(/^(?:G0|G1)\s/i);
  let layerNum = 0;

  const prevRetract = {
    e: 0,
    a: 0,
    b: 0,
    c: 0,
  };

  let prevZ = 0;
  let prevX;
  let prevY;
  let lastF = 4000;

  const prevExtrude = {
    a: undefined,
    b: undefined,
    c: undefined,
    e: undefined,
    abs: undefined,
  };

  let extrudeRelative = false;
  let dcExtrude = false;
  let assumeNonDC = false;

  // Loop through Each individual Gcode line
  for (let i = 0; i < gcodeLines.length; i += 1) {
    let volPerMM;
    let retract = 0;

    let isExtrusion = false;
    let extruder = null;
    prevExtrude.abs = 0;
    gcodeLines[i] = gcodeLines[i].split(/[\(;]/)[0];

    const isLinearMove = linearMoveRegex.test(gcodeLines[i]);

    if (isLinearMove) {
      let x;
      let y;
      let z;
      const args = gcodeLines[i].split(" ");
      for (let j = 0; j < args.length; j += 1) {
        const argChar = args[j].charAt(0).toLowerCase();
        switch (argChar) {
          case "x":
            x = args[j].slice(1);
            break;
          case "y":
            y = args[j].slice(1);
            break;
          case "z":
            z = args[j].slice(1);
            z = Number(z);
            if (z === prevZ) break; // continue ?;
            if (zHeights.z) {
              layerNum = zHeights[z];
            } else {
              layerNum = model.layers.length;
              zHeights[z] = layerNum;
            }
            prevZ = z;
            break;
          case "e":
          case "a":
          case "b":
          case "c":
            assumeNonDC = true;
            extruder = argChar;
            numSlice = parseFloat(args[j].slice(1)).toFixed(6);

            if (!extrudeRelative) {
              // absolute extrusion positioning
              prevExtrude.abs =
                parseFloat(numSlice) - parseFloat(prevExtrude[argChar]);
            } else {
              prevExtrude.abs = parseFloat(numSlice);
            }
            isExtrusion = prevExtrude.abs > 0;
            if (prevExtrude.abs < 0) {
              prevRetract[extruder] = -1;
              retract = -1;
            } else if (prevExtrude.abs == 0) {
              retract = 0;
            } else if (prevExtrude.abs > 0 && prevRetract[extruder] < 0) {
              prevRetract[extruder] = 0;
              retract = 1;
            } else {
              retract = 0;
            }
            prevExtrude[argChar] = numSlice;

            break;
          case "f":
            numSlice = args[j].slice(1);
            lastF = numSlice;
            break;
          default:
            break;
        }
      }
      if (dcExtrude && !assumeNonDC) {
        isExtrusion = true;
        prevExtrude.abs = Math.sqrt(
          (prevX - x) * (prevX - x) + (prevY - y) * (prevY - y)
        );
      }
      if (isExtrusion && retract == 0) {
        volPerMM = Number(
          prevExtrude.abs /
            Math.sqrt((prevX - x) * (prevX - x) + (prevY - y) * (prevY - y))
        );
      }

      // this code is repeated below :/
      if (!model.getNthLayer(layerNum)) model.addLayer(new Layer());
      model.getNthLayer(layerNum).addCommand(
        new MoveCommand({
          x: Number(x),
          y: Number(y),
          z: Number(z),
          isExtrusion,
          retract: Number(retract),
          noMove: false,
          extrusion: isExtrusion || retract ? Number(prevExtrude.abs) : 0,
          extruder,
          prevX: Number(prevX),
          prevY: Number(prevY),
          prevZ: Number(prevZ),
          speed: Number(lastF),
          gcodeLine: Number(i),
          volPerMM: volPerMM || -1,
        })
      );
      if (x) prevX = x;
      if (y) prevY = y;
    } else if (gcodeLines[i].match(/^(?:M82)/i)) {
      extrudeRelative = false;
    } else if (gcodeLines[i].match(/^(?:G91)/i)) {
      extrudeRelative = true;
    } else if (gcodeLines[i].match(/^(?:G90)/i)) {
      extrudeRelative = false;
    } else if (gcodeLines[i].match(/^(?:M83)/i)) {
      extrudeRelative = true;
    } else if (gcodeLines[i].match(/^(?:M101)/i)) {
      dcExtrude = true;
    } else if (gcodeLines[i].match(/^(?:M103)/i)) {
      dcExtrude = false;
    } else if (gcodeLines[i].match(/^(?:G92)/i)) {
      const args = gcodeLines[i].split(/\s/);
      let x;
      let y;
      let z;

      for (let j = 0; j < args.length; j += 1) {
        const argChar = args[j].charAt(0).toLowerCase();
        switch (argChar) {
          case "x":
            x = args[j].slice(1);
            break;
          case "y":
            y = args[j].slice(1);
            break;
          case "z":
            z = args[j].slice(1);
            prevZ = z;
            break;
          case "e":
          case "a":
          case "b":
          case "c":
            numSlice = parseFloat(args[j].slice(1)).toFixed(3);
            extruder = argChar;
            if (!extrudeRelative) prevExtrude[argChar] = 0;
            else {
              prevExtrude[argChar] = numSlice;
            }
            break;
          default:
            break;
        }
      }
      if (!model.getNthLayer(layerNum)) model.addLayer(new Layer());
      if (x && y && z) {
        model.getNthLayer(layerNum).addCommand(
          new MoveCommand({
            x: parseFloat(x),
            y: parseFloat(y),
            z: parseFloat(z),
            isExtrusion,
            retract: parseFloat(retract),
            noMove: true,
            extrusion: 0,
            extruder,
            prevX: parseFloat(prevX),
            prevY: parseFloat(prevY),
            prevZ: parseFloat(prevZ),
            speed: parseFloat(lastF),
            gcodeLine: parseFloat(i),
          })
        );
      }
    } else if (gcodeLines[i].match(/^(?:G28)/i)) {
      const args = gcodeLines[i].split(/\s/);
      let x;
      let y;
      let z;
      for (let j = 0; j < args.length; j++) {
        const argChar = args[j].charAt(0).toLowerCase();
        switch (argChar) {
          case "x":
            x = args[j].slice(1);
            break;
          case "y":
            y = args[j].slice(1);
            break;
          case "z":
            z = args[j].slice(1);
            z = Number(z);
            if (z === prevZ) break; // continue?;
            if (zHeights.z) {
              layerNum = zHeights[z];
            } else {
              layerNum = model.layers.length;
              zHeights[z] = layerNum;
            }
            prevZ = z;
            break;
          default:
            break;
        }
      }

      // // G28 with no arguments
      // if (args.length === 1) {
      //   // need to init values to default here
      // }

      // if it's the first layerNum and G28 was without
      if (layerNum === 0 && !z) {
        z = 0;
        if (zHeights.z) {
          layerNum = zHeights[z];
        } else {
          layerNum = model.layers.length;
          zHeights[z] = layerNum;
        }
        prevZ = z;
      }
      if (!model.getNthLayer(layerNum)) model.addLayer(new Layer());
      model.getNthLayer(layerNum).addCommand(
        new MoveCommand({
          x: Number(x),
          y: Number(y),
          z: Number(z),
          isExtrusion,
          retract: Number(retract),
          noMove: false,
          extrusion: isExtrusion || retract ? Number(prevExtrude.abs) : 0,
          extruder,
          prevX: Number(prevX),
          prevY: Number(prevY),
          prevZ: Number(prevZ),
          speed: Number(lastF),
          gcodeLine: Number(i),
        })
      );
    }
  }

  return model;
};

// the default parameter only exists to provide type hints until we move to typescript
module.exports.analyzeModel = function analyzeModel(model = [new Model()]) {
  let x_ok = false;
  let y_ok = false;
  let tmp1 = 0;
  let tmp2 = 0;
  let speedIndex = 0;
  let type;
  let printTimeAdd = 0;

  const max = {
    x: undefined,
    y: undefined,
    z: undefined,
    speed: undefined,
    volSpeed: undefined,
    extrSpeed: undefined,
  };
  const min = {
    x: undefined,
    y: undefined,
    z: undefined,
    speed: undefined,
    volSpeed: undefined,
    extrSpeed: undefined,
  };
  const modelSize = { x: undefined, y: undefined, z: undefined };
  const filamentByLayer = {};
  const filamentByExtruder = {};
  let totalFilament = 0;
  let printTime = 0;
  const printTimeByLayer = {};
  let layerHeight = 0;
  const layerCnt = 0;
  const speeds = { extrude: [], retract: [], move: [] };
  const speedsByLayer = { extrude: {}, retract: {}, move: {} };

  const volSpeeds = [];
  const volSpeedsByLayer = {};
  const extrusionSpeeds = [];
  const extrusionSpeedsByLayer = {};

  for (let i = 0; i < model.layers.length; i++) {
    const cmds = model.getNthLayer(i).commandsList;
    if (!cmds) continue;
    for (let j = 0; j < cmds.length; j += 1) {
      x_ok = false; // WTF are these?
      y_ok = false; // WTF are these?

      if (cmds[j].isExtrusion && !Number.isNaN(cmds[j].x)) {
        max.x =
          parseFloat(max.x) > parseFloat(cmds[j].x)
            ? parseFloat(max.x)
            : parseFloat(cmds[j].x);
        max.x =
          parseFloat(max.x) > parseFloat(cmds[j].prevX)
            ? parseFloat(max.x)
            : parseFloat(cmds[j].prevX);
        min.x =
          parseFloat(min.x) < parseFloat(cmds[j].x)
            ? parseFloat(min.x)
            : parseFloat(cmds[j].x);
        min.x =
          parseFloat(min.x) < parseFloat(cmds[j].prevX)
            ? parseFloat(min.x)
            : parseFloat(cmds[j].prevX);
        x_ok = true;
      }

      if (cmds[j].isExtrusion && !Number.isNaN(cmds[j].y)) {
        max.y =
          parseFloat(max.y) > parseFloat(cmds[j].y)
            ? parseFloat(max.y)
            : parseFloat(cmds[j].y);
        max.y =
          parseFloat(max.y) > parseFloat(cmds[j].prevY)
            ? parseFloat(max.y)
            : parseFloat(cmds[j].prevY);
        min.y =
          parseFloat(min.y) < parseFloat(cmds[j].y)
            ? parseFloat(min.y)
            : parseFloat(cmds[j].y);
        min.y =
          parseFloat(min.y) < parseFloat(cmds[j].prevY)
            ? parseFloat(min.y)
            : parseFloat(cmds[j].prevY);
        y_ok = true;
      }

      if (cmds[j].isExtrusion && !Number.isNaN(cmds[j].prevZ)) {
        max.z =
          parseFloat(max.z) > parseFloat(cmds[j].prevZ)
            ? parseFloat(max.z)
            : parseFloat(cmds[j].prevZ);
        min.z =
          parseFloat(min.z) < parseFloat(cmds[j].prevZ)
            ? parseFloat(min.z)
            : parseFloat(cmds[j].prevZ);

        // WTF... no z_ok?
      }

      if (cmds[j].isExtrusion === true || cmds[j].retract !== 0) {
        totalFilament += cmds[j].extrusion;
        if (!filamentByLayer[cmds[j].prevZ]) filamentByLayer[cmds[j].prevZ] = 0;
        filamentByLayer[cmds[j].prevZ] += cmds[j].extrusion;
        if (cmds[j].extruder != null) {
          if (!filamentByExtruder[cmds[j].extruder])
            filamentByExtruder[cmds[j].extruder] = 0;
          filamentByExtruder[cmds[j].extruder] += cmds[j].extrusion;
        }
      }

      if (x_ok && y_ok) {
        printTimeAdd =
          Math.sqrt(
            Math.pow(parseFloat(cmds[j].x) - parseFloat(cmds[j].prevX), 2) +
              Math.pow(parseFloat(cmds[j].y) - parseFloat(cmds[j].prevY), 2)
          ) /
          (cmds[j].speed / 60);
      } else if (cmds[j].retract === 0 && cmds[j].extrusion !== 0) {
        tmp1 =
          Math.sqrt(
            Math.pow(parseFloat(cmds[j].x) - parseFloat(cmds[j].prevX), 2) +
              Math.pow(parseFloat(cmds[j].y) - parseFloat(cmds[j].prevY), 2)
          ) /
          (cmds[j].speed / 60);
        tmp2 = Math.abs(parseFloat(cmds[j].extrusion) / (cmds[j].speed / 60));
        printTimeAdd = tmp1 >= tmp2 ? tmp1 : tmp2;
      } else if (cmds[j].retract !== 0) {
        printTimeAdd = Math.abs(
          parseFloat(cmds[j].extrusion) / (cmds[j].speed / 60)
        );
      }

      printTime += printTimeAdd;
      if (!printTimeByLayer[cmds[j].prevZ]) {
        printTimeByLayer[cmds[j].prevZ] = 0;
      }
      printTimeByLayer[cmds[j].prevZ] += printTimeAdd;

      if (cmds[j].isExtrusion && cmds[j].retract === 0) {
        type = "extrude";
      } else if (cmds[j].retract !== 0) {
        type = "retract";
      } else if (!cmds[j].isExtrusion && cmds[j].retract === 0) {
        type = "move";
      } else {
        self.postMessage({ cmd: "unknown type of move" });
        type = "unknown";
      }
      speedIndex = speeds[type].indexOf(cmds[j].speed);
      if (speedIndex === -1) {
        speeds[type].push(cmds[j].speed);
        speedIndex = speeds[type].indexOf(cmds[j].speed);
      }
      if (!speedsByLayer[type][cmds[j].prevZ]) {
        speedsByLayer[type][cmds[j].prevZ] = [];
      }
      if (speedsByLayer[type][cmds[j].prevZ].indexOf(cmds[j].speed) === -1) {
        speedsByLayer[type][cmds[j].prevZ][speedIndex] = cmds[j].speed;
      }

      if (cmds[j].isExtrusion && cmds[j].retract === 0 && x_ok && y_ok) {
        // we are extruding
        max.speed =
          parseFloat(max.speed) > parseFloat(cmds[j].speed)
            ? parseFloat(max.speed)
            : parseFloat(cmds[j].speed);
        min.speed =
          parseFloat(min.speed) < parseFloat(cmds[j].speed)
            ? parseFloat(min.speed)
            : parseFloat(cmds[j].speed);

        let volPerMM = parseFloat(cmds[j].volPerMM);
        max.volSpeed =
          parseFloat(max.volSpeed) > volPerMM
            ? parseFloat(max.volSpeed)
            : volPerMM;
        min.volSpeed =
          parseFloat(min.volSpeed) < volPerMM
            ? parseFloat(min.volSpeed)
            : volPerMM;
        volPerMM = volPerMM.toFixed(3);

        var volIndex = volSpeeds.indexOf(volPerMM);
        if (volIndex === -1) {
          volSpeeds.push(volPerMM);
          volIndex = volSpeeds.indexOf(volPerMM);
        }
        if (!volSpeedsByLayer[cmds[j].prevZ]) {
          volSpeedsByLayer[cmds[j].prevZ] = [];
        }
        if (volSpeedsByLayer[cmds[j].prevZ].indexOf(volPerMM) === -1) {
          volSpeedsByLayer[cmds[j].prevZ][volIndex] = volPerMM;
        }

        let extrusionSpeed = cmds[j].volPerMM * (cmds[j].speed / 60);
        extrusionSpeed = parseFloat(extrusionSpeed);
        max.extrSpeed =
          parseFloat(max.extrSpeed) > extrusionSpeed
            ? parseFloat(max.extrSpeed)
            : extrusionSpeed;
        min.extrSpeed =
          parseFloat(min.extrSpeed) < extrusionSpeed
            ? parseFloat(min.extrSpeed)
            : extrusionSpeed;
        extrusionSpeed = extrusionSpeed.toFixed(3);
        var volIndex = extrusionSpeeds.indexOf(extrusionSpeed);
        if (volIndex === -1) {
          extrusionSpeeds.push(extrusionSpeed);
          volIndex = extrusionSpeeds.indexOf(extrusionSpeed);
        }
        if (!extrusionSpeedsByLayer[cmds[j].prevZ]) {
          extrusionSpeedsByLayer[cmds[j].prevZ] = [];
        }
        if (
          extrusionSpeedsByLayer[cmds[j].prevZ].indexOf(extrusionSpeed) === -1
        ) {
          extrusionSpeedsByLayer[cmds[j].prevZ][volIndex] = extrusionSpeed;
        }
      }
    }
  }

  modelSize.x = Math.abs(max.x - min.x);
  modelSize.y = Math.abs(max.y - min.y);
  modelSize.z = Math.abs(max.z - min.z);
  layerHeight = (max.z - min.z) / (layerCnt - 1);

  if (max.speed == min.speed) {
    max.speed = min.speed + 1.0;
  }
  if (max.volSpeed == min.volSpeed) {
    max.volSpeed = min.volSpeed + 1.0;
  }
  if (max.extrSpeed == min.extrSpeed) {
    max.extrSpeed = min.extrSpeed + 1.0;
  }

  return new GCodeAnalysis({
    max,
    min,
    modelSize,
    totalFilament,
    filamentByLayer,
    filamentByExtruder,
    printTime,
    layerHeight,
    layerCnt,
    layerTotal: model.layers.length,
    speeds,
    speedsByLayer,
    volSpeeds,
    volSpeedsByLayer,
    printTimeByLayer,
    extrusionSpeeds,
    extrusionSpeedsByLayer,
  });
};
