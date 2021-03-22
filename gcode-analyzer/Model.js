import Layer from "./Layer.js";

export default class Model {
  constructor(layers = [new Layer()]) {
    this.layers = layers;
  }

  addLayer(layer) {
    this.layers.push(layer);
  }

  getNthLayer(layerNum) {
    return this.layers[layerNum];
  }
}
