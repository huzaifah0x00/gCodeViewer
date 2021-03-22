export default class MoveCommand {
  constructor({
    x,
    y,
    z,
    isExtrusion,
    retract,
    noMove,
    extrusion,
    extruder,
    prevX,
    prevY,
    prevZ,
    speed,
    gcodeLineNum,
  }) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.isExtrusion = isExtrusion;
    this.retract = retract;
    this.noMove = noMove;
    this.extrusion = extrusion; // not sure what this is
    this.extruder = extruder;

    this.prevX = prevX;
    this.prevY = prevY;
    this.prevZ = prevZ;

    this.speed = speed;
    this.gcodeLineNum = gcodeLineNum;
  }
}
