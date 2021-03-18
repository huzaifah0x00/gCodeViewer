/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/20/12
 * Time: 1:36 PM
 * To change this template use File | Settings | File Templates.
 */

GCODE.renderer = (function () {
  // ***** PRIVATE ******
  let canvas;
  let ctx;
  const zoomFactor = 3;
  const zoomFactorDelta = 0.4;
  const gridSizeX = 200;
  const gridSizeY = 200;
  const gridStep = 10;
  let ctxHeight; let
    ctxWidth;
  let prevX = 0;
  let prevY = 0;

  //    var colorGrid="#bbbbbb", colorLine="#000000";
  let sliderHor; let
    sliderVer;
  let layerNumStore;
  let progressStore = { from: 0, to: -1 };
  let lastX; let
    lastY;
  let dragStart; let
    dragged;
  const scaleFactor = 1.1;
  let model;
  let initialized = false;
  const displayType = { speed: 1, expermm: 2, volpersec: 3 };
  const renderOptions = {
    showMoves: true,
    showRetracts: true,
    colorGrid: '#bbbbbb',
    extrusionWidth: 1,
    //        colorLine: ["#000000", "#aabb88",  "#ffe7a0", "#6e7700", "#331a00", "#44ba97", "#08262f", "#db0e00", "#ff9977"],
    colorLine: [
      '#000000',
      '#45c7ba',
      '#a9533a',
      '#ff44cc',
      '#dd1177',
      '#eeee22',
      '#ffbb55',
      '#ff5511',
      '#777788',
      '#ff0000',
      '#ffff00',
    ],
    colorLineLen: 9,
    gradientColors: [
      [110, 64, 110],
      [0, 0, 255],
      [0, 255, 255],
      [0, 170, 0],
      [232, 232, 0],
      [170, 0, 0],
      [255, 0, 255],
    ],
    colorMove: '#00ff00',
    colorRetract: '#ff0000',
    colorRestart: '#0000ff',
    sizeRetractSpot: 2,
    modelCenter: { x: 0, y: 0 },
    moveModel: true,
    differentiateColors: true,
    showNextLayer: false,
    alpha: false,
    actualWidth: false,
    renderErrors: false,
    renderAnalysis: false,
    speedDisplayType: displayType.speed,
  };

  let offsetModelX = 0;
  let offsetModelY = 0;
  let speeds = [];
  let speedsByLayer = {};
  let volSpeeds = [];
  let volSpeedsByLayer = {};
  let extrusionSpeeds = [];
  let extrusionSpeedsByLayer = {};
  let max = {};
  let min = {};

  const rgbToColor = function (r, g, b) {
    let rString = Math.round(r).toString(16);
    let gString = Math.round(g).toString(16);
    let bString = Math.round(b).toString(16);
    if (rString.length < 2) {
      rString = `0${rString}`;
    }
    if (gString.length < 2) {
      gString = `0${gString}`;
    }
    if (bString.length < 2) {
      bString = `0${bString}`;
    }
    return `#${rString}${gString}${bString}`;
  };

  const gradientColor = function (scale) {
    // There's still a rounding error somewhere, hence the .1.
    // I leave it to some diligent programmer to find and fix this.
    if (scale < -0.1 || scale > 1.1) {
      return '#000000';
    }
    if (scale > 1) {
      scale = 1;
    } else if (scale < 0) {
      scale = 0;
    }
    const numSegments = renderOptions.gradientColors.length;
    const leftIndex = Math.floor(scale * (numSegments - 1));
    const mix = scale * (numSegments - 1) - leftIndex;
    const leftColor = renderOptions.gradientColors[leftIndex];
    const rightColor = renderOptions.gradientColors[Math.ceil(scale * (numSegments - 1))];
    return rgbToColor(
      leftColor[0] * (1.0 - mix) + rightColor[0] * mix,
      leftColor[1] * (1.0 - mix) + rightColor[1] * mix,
      leftColor[2] * (1.0 - mix) + rightColor[2] * mix,
    );
  };

  const reRender = function () {
    const gCodeOpts = GCODE.gCodeReader.getOptions();
    const p1 = ctx.transformedPoint(0, 0);
    const p2 = ctx.transformedPoint(canvas.width, canvas.height);
    ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    drawGrid();
    if (renderOptions.alpha) {
      ctx.globalAlpha = 0.6;
    } else {
      ctx.globalAlpha = 1;
    }
    if (renderOptions.actualWidth) {
      renderOptions.extrusionWidth = (gCodeOpts.filamentDia * gCodeOpts.wh) / zoomFactor;
    } else {
      renderOptions.extrusionWidth = (gCodeOpts.filamentDia * gCodeOpts.wh) / zoomFactor / 2;
    }
    if (renderOptions.showNextLayer && layerNumStore < model.length - 1) {
      drawLayer(layerNumStore + 1, 0, GCODE.renderer.getLayerNumSegments(layerNumStore + 1), true);
    }
    drawLayer(layerNumStore, progressStore.from, progressStore.to);
  };

  function trackTransforms(ctx) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let xform = svg.createSVGMatrix();
    ctx.getTransform = function () {
      return xform;
    };

    const savedTransforms = [];
    const { save } = ctx;
    ctx.save = function () {
      savedTransforms.push(xform.translate(0, 0));
      return save.call(ctx);
    };
    const { restore } = ctx;
    ctx.restore = function () {
      xform = savedTransforms.pop();
      return restore.call(ctx);
    };

    const { scale } = ctx;
    ctx.scale = function (sx, sy) {
      xform = xform.scaleNonUniform(sx, sy);
      return scale.call(ctx, sx, sy);
    };
    const { rotate } = ctx;
    ctx.rotate = function (radians) {
      xform = xform.rotate((radians * 180) / Math.PI);
      return rotate.call(ctx, radians);
    };
    const { translate } = ctx;
    ctx.translate = function (dx, dy) {
      xform = xform.translate(dx, dy);
      return translate.call(ctx, dx, dy);
    };
    const { transform } = ctx;
    ctx.transform = function (a, b, c, d, e, f) {
      const m2 = svg.createSVGMatrix();
      m2.a = a;
      m2.b = b;
      m2.c = c;
      m2.d = d;
      m2.e = e;
      m2.f = f;
      xform = xform.multiply(m2);
      return transform.call(ctx, a, b, c, d, e, f);
    };
    const { setTransform } = ctx;
    ctx.setTransform = function (a, b, c, d, e, f) {
      xform.a = a;
      xform.b = b;
      xform.c = c;
      xform.d = d;
      xform.e = e;
      xform.f = f;
      return setTransform.call(ctx, a, b, c, d, e, f);
    };
    const pt = svg.createSVGPoint();
    ctx.transformedPoint = function (x, y) {
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(xform.inverse());
    };
  }

  const startCanvas = function () {
    canvas = document.getElementById('canvas');

    // Проверяем понимает ли браузер canvas
    if (!canvas.getContext) {
      throw 'exception';
    }

    ctx = canvas.getContext('2d'); // Получаем 2D контекст
    ctxHeight = canvas.height;
    ctxWidth = canvas.width;
    lastX = ctxWidth / 2;
    lastY = ctxHeight / 2;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    trackTransforms(ctx);

    canvas.addEventListener(
      'mousedown',
      (evt) => {
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        lastX = evt.offsetX || evt.pageX - canvas.offsetLeft;
        lastY = evt.offsetY || evt.pageY - canvas.offsetTop;
        dragStart = ctx.transformedPoint(lastX, lastY);
        dragged = false;
      },
      false,
    );
    canvas.addEventListener(
      'mousemove',
      (evt) => {
        lastX = evt.offsetX || evt.pageX - canvas.offsetLeft;
        lastY = evt.offsetY || evt.pageY - canvas.offsetTop;
        dragged = true;
        if (dragStart) {
          const pt = ctx.transformedPoint(lastX, lastY);
          ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
          reRender();
        }
      },
      false,
    );
    canvas.addEventListener(
      'mouseup',
      (evt) => {
        dragStart = null;
        if (!dragged) zoom(evt.shiftKey ? -1 : 1);
      },
      false,
    );
    var zoom = function (clicks) {
      const pt = ctx.transformedPoint(lastX, lastY);
      ctx.translate(pt.x, pt.y);
      const factor = Math.pow(scaleFactor, clicks);
      ctx.scale(factor, factor);
      ctx.translate(-pt.x, -pt.y);
      reRender();
    };
    const handleScroll = function (evt) {
      let delta;
      if (evt.detail < 0 || evt.wheelDelta > 0) delta = zoomFactorDelta;
      else delta = -1 * zoomFactorDelta;
      if (delta) zoom(delta);
      return evt.preventDefault() && false;
    };
    canvas.addEventListener('DOMMouseScroll', handleScroll, false);
    canvas.addEventListener('mousewheel', handleScroll, false);
  };

  var drawGrid = function () {
    let i;
    ctx.strokeStyle = renderOptions.colorGrid;
    ctx.lineWidth = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (renderOptions.moveModel) {
      offsetX = offsetModelX;
      offsetY = offsetModelY;
    }

    ctx.beginPath();
    for (i = 0; i <= gridSizeX; i += gridStep) {
      ctx.moveTo(i * zoomFactor - offsetX, 0 - offsetY);
      ctx.lineTo(i * zoomFactor - offsetX, -gridSizeY * zoomFactor - offsetY);
    }
    ctx.stroke();

    ctx.beginPath();
    for (i = 0; i <= gridSizeY; i += gridStep) {
      ctx.moveTo(0 - offsetX, -i * zoomFactor - offsetY);
      ctx.lineTo(gridSizeX * zoomFactor - offsetX, -i * zoomFactor - offsetY);
    }
    ctx.stroke();
  };

  var drawLayer = function (layerNum, fromProgress, toProgress, isNextLayer) {
    let i;
    let speedIndex = 0;
    let prevZ = 0;
    let speedScale = 0;
    isNextLayer = typeof isNextLayer !== 'undefined' ? isNextLayer : false;
    if (!isNextLayer) {
      layerNumStore = layerNum;
      progressStore = { from: fromProgress, to: toProgress };
    }
    if (!model || !model[layerNum]) return;

    const cmds = model[layerNum];
    let x; let
      y;

    //        if(toProgress === -1){
    //            toProgress=cmds.length;
    //        }

    if (fromProgress > 0) {
      prevX = cmds[fromProgress - 1].x * zoomFactor;
      prevY = -cmds[fromProgress - 1].y * zoomFactor;
    } else if (fromProgress === 0 && layerNum == 0) {
      if (model[0] && typeof model[0].x !== 'undefined' && typeof model[0].y !== 'undefined') {
        prevX = model[0].x * zoomFactor;
        prevY = -model[0].y * zoomFactor;
      } else {
        prevX = 0;
        prevY = 0;
      }
    } else if (typeof cmds[0].prevX !== 'undefined' && typeof cmds[0].prevY !== 'undefined') {
      prevX = cmds[0].prevX * zoomFactor;
      prevY = -cmds[0].prevY * zoomFactor;
    } else if (model[layerNum - 1]) {
      prevX = undefined;
      prevY = undefined;
      for (i = model[layerNum - 1].length - 1; i >= 0; i--) {
        if (typeof prevX === 'undefined' && model[layerNum - 1][i].x !== undefined) prevX = model[layerNum - 1][i].x * zoomFactor;
        if (typeof prevY === 'undefined' && model[layerNum - 1][i].y !== undefined) prevY = -model[layerNum - 1][i].y * zoomFactor;
      }
      if (typeof prevX === 'undefined') prevX = 0;
      if (typeof prevY === 'undefined') prevY = 0;
    } else {
      prevX = 0;
      prevY = 0;
    }

    prevZ = GCODE.renderer.getZ(layerNum);

    //        ctx.strokeStyle = renderOptions["colorLine"];
    for (i = fromProgress; i <= toProgress; i++) {
      ctx.lineWidth = 1;

      if (typeof cmds[i] === 'undefined') continue;

      if (typeof cmds[i].prevX !== 'undefined' && typeof cmds[i].prevY !== 'undefined') {
        prevX = cmds[i].prevX * zoomFactor;
        prevY = -cmds[i].prevY * zoomFactor;
      }
      //                console.log(cmds[i]);
      if (typeof cmds[i].x === 'undefined' || isNaN(cmds[i].x)) x = prevX / zoomFactor;
      else x = cmds[i].x;
      if (typeof cmds[i].y === 'undefined' || isNaN(cmds[i].y)) y = prevY / zoomFactor;
      else y = -cmds[i].y;
      if (renderOptions.differentiateColors && !renderOptions.showNextLayer && !renderOptions.renderAnalysis) {
        //                if(speedsByLayer['extrude'][prevZ]){
        if (renderOptions.speedDisplayType === displayType.speed) {
          speedIndex = speeds.extrude.indexOf(cmds[i].speed);
          speedScale = (cmds[i].speed - min.speed) / (max.speed - min.speed);
        } else if (renderOptions.speedDisplayType === displayType.expermm) {
          speedIndex = volSpeeds.indexOf(cmds[i].volPerMM);
          speedScale = (cmds[i].volPerMM - min.volSpeed) / (max.volSpeed - min.volSpeed);
        } else if (renderOptions.speedDisplayType === displayType.volpersec) {
          const volpersec = ((cmds[i].volPerMM * cmds[i].speed) / 60).toFixed(3);
          speedIndex = extrusionSpeeds.indexOf(volpersec);
          speedScale = (volpersec - min.extrSpeed) / (max.extrSpeed - min.extrSpeed);
        } else {
          speedIndex = 0;
          speedScale = -1;
        }
        //                    speedIndex = GCODE.ui.ArrayIndexOf(speedsByLayer['extrude'][prevZ], function(obj) {return obj.speed === cmds[i].speed;});
        //                } else {
        //                    speedIndex = -1;
        //                }
        if (speedIndex === -1) {
          speedIndex = 0;
        } else if (speedIndex > renderOptions.colorLineLen - 1) {
          speedIndex %= (renderOptions.colorLineLen - 1);
          //                console.log("Too much colors");
        }
      } else if (renderOptions.showNextLayer && isNextLayer) {
        speedIndex = 3;
      } else if (renderOptions.renderErrors) {
        if (cmds[i].errType === 2) {
          speedIndex = 9;
          //                    console.log("l: " + layerNum + " c: " + i);
        } else if (cmds[i].errType === 1) {
          speedIndex = 10;
        } else {
          speedIndex = 0;
        }
      } else if (renderOptions.renderAnalysis) {
        //                if(cmds[i].errType === 2){
        //                    speedIndex=-1;
        //                }else{
        //                    speedIndex=0;
        //                }
        if (layerNum !== 0) speedIndex = -1;
        else speedIndex = 0;
      } else {
        speedIndex = 0;
      }

      if (!cmds[i].extrude && !cmds[i].noMove) {
        //                ctx.stroke();
        if (cmds[i].retract == -1) {
          if (renderOptions.showRetracts) {
            ctx.strokeStyle = renderOptions.colorRetract;
            ctx.fillStyle = renderOptions.colorRetract;
            ctx.beginPath();
            ctx.arc(prevX, prevY, renderOptions.sizeRetractSpot, 0, Math.PI * 2, true);
            ctx.stroke();
            ctx.fill();
          }
        }
        if (renderOptions.showMoves) {
          ctx.strokeStyle = renderOptions.colorMove;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x * zoomFactor, y * zoomFactor);
          ctx.stroke();
        }
        //                ctx.strokeStyle = renderOptions["colorLine"][0];
        //                ctx.beginPath();
        //                console.log("moveto: "+cmds[i].x+":"+cmds[i].y)
        //                ctx.moveTo(cmds[i].x*zoomFactor,cmds[i].y*zoomFactor);
      } else if (cmds[i].extrude) {
        if (cmds[i].retract == 0) {
          if (speedScale >= 0) {
            ctx.strokeStyle = gradientColor(speedScale);
          } else if (speedIndex >= 0) {
            ctx.strokeStyle = renderOptions.colorLine[speedIndex];
          } else if (speedIndex === -1) {
            let val = parseInt(cmds[i].errLevelB).toString(16);
            //                        var val = '8A';
            const crB = `#${'00'.substr(0, 2 - val.length)}${val}0000`;
            val = parseInt(cmds[i].errLevelE).toString(16);
            const crE = `#${'00'.substr(0, 2 - val.length)}${val}0000`;
            //                        if(renderOptions['showMoves'])console.log(cr);
            const gradient = ctx.createLinearGradient(prevX, prevY, x * zoomFactor, y * zoomFactor);
            if (cmds[i].errType === 1) {
              var limit = 1 - cmds[i].errDelimiter;
              if (limit >= 0.99) limit = 0.99;
              gradient.addColorStop(0, '#000000');
              gradient.addColorStop(limit, '#000000');
              gradient.addColorStop(limit + 0.01, crE);
              gradient.addColorStop(1, crE);
            } else if (cmds[i].errType === 2) {
              gradient.addColorStop(0, crB);
              var limit = cmds[i].errDelimiter;
              if (limit >= 0.99) limit = 0.99;
              gradient.addColorStop(limit, crB);
              gradient.addColorStop(limit + 0.01, '#000000');
              gradient.addColorStop(1, '#000000');
            } else {
              gradient.addColorStop(0, crB);
              gradient.addColorStop(1, crE);
            }
            ctx.strokeStyle = gradient;
          }
          ctx.lineWidth = renderOptions.extrusionWidth;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x * zoomFactor, y * zoomFactor);
          ctx.stroke();
        } else if (renderOptions.showRetracts) {
          //                        ctx.stroke();
          ctx.strokeStyle = renderOptions.colorRestart;
          ctx.fillStyle = renderOptions.colorRestart;
          ctx.beginPath();
          ctx.arc(prevX, prevY, renderOptions.sizeRetractSpot, 0, Math.PI * 2, true);
          ctx.stroke();
          ctx.fill();
          //                        ctx.strokeStyle = renderOptions["colorLine"][0];
          //                        ctx.beginPath();
        }
      }
      prevX = x * zoomFactor;
      prevY = y * zoomFactor;
    }
    ctx.stroke();
  };

  // ***** PUBLIC *******
  return {
    init() {
      startCanvas();
      initialized = true;
      ctx.translate(
        (canvas.width - gridSizeX * zoomFactor) / 2,
        gridSizeY * zoomFactor + (canvas.height - gridSizeY * zoomFactor) / 2,
      );
    },
    setOption(options) {
      for (const opt in options) {
        if (options.hasOwnProperty(opt)) {
          renderOptions[opt] = options[opt];
          //                    console.log("Got a set option call: " + opt + " == " + options[opt]);
        }
      }

      if (initialized) reRender();
    },
    getOptions() {
      return renderOptions;
    },
    debugGetModel() {
      return model;
    },
    render(layerNum, fromProgress, toProgress) {
      const gCodeOpts = GCODE.gCodeReader.getOptions();
      if (!initialized) this.init();
      if (!model) {
        drawGrid();
      } else if (layerNum < model.length) {
        const p1 = ctx.transformedPoint(0, 0);
        const p2 = ctx.transformedPoint(canvas.width, canvas.height);
        ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        drawGrid();
        if (renderOptions.alpha) {
          ctx.globalAlpha = 0.6;
        } else {
          ctx.globalAlpha = 1;
        }
        if (renderOptions.actualWidth) {
          renderOptions.extrusionWidth = (gCodeOpts.filamentDia * gCodeOpts.wh) / zoomFactor;
        } else {
          renderOptions.extrusionWidth = (gCodeOpts.filamentDia * gCodeOpts.wh) / zoomFactor / 2;
        }
        if (renderOptions.showNextLayer && layerNum < model.length - 1) {
          drawLayer(layerNum + 1, 0, this.getLayerNumSegments(layerNum + 1), true);
        }
        drawLayer(layerNum, fromProgress, toProgress);
      } else {
        console.log('Got request to render non-existent layer!!');
      }
    },
    getModelNumLayers() {
      return model ? model.length : 1;
    },
    getLayerNumSegments(layer) {
      if (model) {
        return model[layer] ? model[layer].length : 1;
      }
      return 1;
    },
    doRender(mdl, layerNum) {
      let mdlInfo;
      model = mdl;
      prevX = 0;
      prevY = 0;
      if (!initialized) this.init();

      mdlInfo = GCODE.gCodeReader.getModelInfo();
      speeds = mdlInfo.speeds;
      speedsByLayer = mdlInfo.speedsByLayer;
      volSpeeds = mdlInfo.volSpeeds;
      volSpeedsByLayer = mdlInfo.volSpeedsByLayer;
      extrusionSpeeds = mdlInfo.extrusionSpeeds;
      extrusionSpeedsByLayer = mdlInfo.extrusionSpeedsByLayer;
      max = mdlInfo.max;
      min = mdlInfo.min;
      //            console.log(speeds);
      //            console.log(mdlInfo.min.x + ' ' + mdlInfo.modelSize.x);
      offsetModelX = (gridSizeX / 2 - (mdlInfo.min.x + mdlInfo.modelSize.x / 2)) * zoomFactor;
      offsetModelY = (mdlInfo.min.y + mdlInfo.modelSize.y / 2) * zoomFactor - (gridSizeY / 2) * zoomFactor;
      if (ctx) ctx.translate(offsetModelX, offsetModelY);
      const scaleF = mdlInfo.modelSize.x > mdlInfo.modelSize.y
        ? canvas.width / mdlInfo.modelSize.x / zoomFactor
        : canvas.height / mdlInfo.modelSize.y / zoomFactor;
      const pt = ctx.transformedPoint(canvas.width / 2, canvas.height / 2);
      const transform = ctx.getTransform();
      const sX = scaleF / transform.a;
      const sY = scaleF / transform.d;
      ctx.translate(pt.x, pt.y);
      ctx.scale(0.98 * sX, 0.98 * sY);
      ctx.translate(-pt.x, -pt.y);
      //            ctx.scale(scaleF,scaleF);
      this.render(layerNum, 0, model[layerNum].length);
    },
    getZ(layerNum) {
      if (!model && !model[layerNum]) {
        return '-1';
      }
      const cmds = model[layerNum];
      for (let i = 0; i < cmds.length; i++) {
        if (cmds[i].prevZ !== undefined) return cmds[i].prevZ;
      }
      return '-1';
    },
    getGradientColor(scale) {
      return gradientColor(scale);
    },
  };
}());
