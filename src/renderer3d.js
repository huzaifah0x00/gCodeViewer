/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 4:59 PM
 */
GCODE.renderer3d = (function () {
  // ***** PRIVATE ******
  let modelLoaded = false;
  let model;
  let prevX = 0;
  let prevY = 0;
  let prevZ = 0;
  let sliderHor;
  let sliderVer;
  let object;
  let geometry;

  const WIDTH = 650;
  const HEIGHT = 630;
  const VIEW_ANGLE = 70;
  const ASPECT = WIDTH / HEIGHT;
  const NEAR = 0.1;
  const FAR = 10000;

  let renderer;
  let scene;
  const camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  let controls;
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  let mouseX = 0;
  let mouseY = 0;

  const renderOptions = {
    showMoves: true,
    colorLine: 0x000000,
    colorMove: 0x00ff00,
    rendererType: "webgl",
  };

  var render = function () {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  const buildModelIteration = function (layerNum) {
    let j;
    const cmds = model[layerNum];
    if (!cmds) return;
    for (j = 0; j < cmds.length; j++) {
      if (!cmds[j]) continue;
      if (isNaN(cmds[j].x)) cmds[j].x = prevX;
      if (isNaN(cmds[j].y)) cmds[j].y = prevY;
      if (isNaN(cmds[j].z)) cmds[j].z = prevZ;
      if (!cmds[j].extrude) {
      } else {
        geometry.vertices.push(new THREE.Vector3(prevX, prevY, prevZ));
        geometry.vertices.push(
          new THREE.Vector3(cmds[j].x, cmds[j].y, cmds[j].z)
        );
      }
      prevX = cmds[j].x;
      prevY = cmds[j].y;
      prevZ = cmds[j].z;
    }
  };

  const buildModelIteratively = function () {
    let i;

    for (i = 0; i < model.length; i += 1) {
      buildModelIteration(i);
      // TODO: need to remove UI stuff from here
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: renderOptions.colorLine,
      lineWidth: 2,
      opacity: 0.6,
      fog: false,
    });
    geometry.computeBoundingBox();
    object.add(new THREE.Line(geometry, lineMaterial, THREE.LinePieces));
    const center = new THREE.Vector3()
      .add(geometry.boundingBox.min, geometry.boundingBox.max)
      .divideScalar(2);
    object.position = center.multiplyScalar(-1);
  };

  const buildModel = function () {
    let i;
    let j;
    let cmds = [];

    for (i = 0; i < model.length; i++) {
      cmds = model[i];
      if (!cmds) continue;
      for (j = 0; j < cmds.length; j++) {
        if (!cmds[j]) continue;
        if (!cmds[j].x) cmds[j].x = prevX;
        if (!cmds[j].y) cmds[j].y = prevY;
        if (!cmds[j].z) cmds[j].z = prevZ;
        if (!cmds[j].extrude) {
        } else {
          geometry.vertices.push(new THREE.Vector3(prevX, prevY, prevZ));
          geometry.vertices.push(
            new THREE.Vector3(cmds[j].x, cmds[j].y, cmds[j].z)
          );
        }
        prevX = cmds[j].x;
        prevY = cmds[j].y;
        prevZ = cmds[j].z;
      }
      // TODO: need to remove UI stuff from here
      $(() => {
        $("#progressbar").progressbar({
          value: (i / model.length) * 100,
        });
      });
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: renderOptions.colorLine,
      lineWidth: 4,
      opacity: 1,
      fog: false,
    });
    geometry.computeBoundingBox();
    object.add(new THREE.Line(geometry, lineMaterial, THREE.LinePieces));
    const center = new THREE.Vector3()
      .add(geometry.boundingBox.min, geometry.boundingBox.max)
      .divideScalar(2);
    object.position = center.multiplyScalar(-1);
  };

  const debugAxis = function (axisLength) {
    // Shorten the vertex function
    function v(x, y, z) {
      return new THREE.Vector3(x, y, z);
    }

    // Create axis (point1, point2, colour)
    function createAxis(p1, p2, color) {
      let line;
      const lineGeometry = new THREE.Geometry();
      const lineMat = new THREE.LineBasicMaterial({ color, lineWidth: 1 });
      lineGeometry.vertices.push(p1, p2);
      line = new THREE.Line(lineGeometry, lineMat);
      scene.add(line);
    }

    createAxis(v(-axisLength, 0, 0), v(axisLength, 0, 0), 0xff0000);
    createAxis(v(0, -axisLength, 0), v(0, axisLength, 0), 0x00ff00);
    createAxis(v(0, 0, -axisLength), v(0, 0, axisLength), 0x0000ff);
  };

  // ***** PUBLIC *******
  return {
    init() {
      modelLoaded = false;
      if (renderOptions.rendererType == "webgl")
        renderer = new THREE.WebGLRenderer({
          clearColor: 0xffffff,
          clearAlpha: 1,
        });
      else if (renderOptions.rendererType == "canvas") {
        renderer = new THREE.CanvasRenderer({
          clearColor: 0xffffff,
          clearAlpha: 1,
        });
      } else {
        console.log("unknown rendererType");
        return;
      }

      scene = new THREE.Scene();
      const $container = $("#3d_container");
      camera.position.z = 200;
      scene.add(camera);
      renderer.setSize(WIDTH, HEIGHT);
      $container.empty();
      $container.append(renderer.domElement);

      controls = new THREE.TrackballControls(camera, renderer.domElement);
      controls.rotateSpeed = 1.0;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;

      controls.noZoom = false;
      controls.noPan = false;

      controls.staticMoving = true;
      controls.dynamicDampingFactor = 0.3;

      controls.keys = [65, 83, 68];
    },
    isModelReady() {
      return modelLoaded;
    },
    setOption(options) {
      for (const opt in options) {
        if (options.hasOwnProperty(opt)) renderOptions[opt] = options[opt];
      }
    },
    setModel(mdl) {
      model = mdl;
      modelLoaded = false;
    },
    doRender() {
      //            model = mdl;
      prevX = 0;
      prevY = 0;
      prevZ = 0;
      object = new THREE.Object3D();
      geometry = new THREE.Geometry();
      this.init();
      if (model) modelLoaded = true;
      else return;
      //            buildModel();
      buildModelIteratively();

      scene.add(object);
      debugAxis(100);

      const mousemove = function (e) {
        mouseX = e.clientX - halfWidth;
        mouseY = e.clientY - halfHeight;
      };
      // Action!
      render();
      //            renderer.render(scene, camera);
    },
  };
})();
