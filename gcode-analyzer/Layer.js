module.exports = class Layer {
  constructor({ commandsList } = { commandsList: [] }) {
    this.commandsList = commandsList;
  }

  addCommand(command) {
    this.commandsList.push(command);
  }
};
