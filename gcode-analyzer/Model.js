const Layer = require("./Layer.js");

module.exports = class Model {
  constructor(layers = [new Layer()]) {
    this.layers = layers;
  }

  addLayer(layer) {
    this.layers.push(layer);
  }

  getNthLayer(layerNum) {
    return this.layers[layerNum];
  }
};
