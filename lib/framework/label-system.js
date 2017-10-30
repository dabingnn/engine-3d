import { System } from 'ecs.js';

export default class LabelSystem extends System {
  constructor() {
    super();
  }
  add(comp) {
    this._engine.scene.addModel(comp._model);
  }

  remove(comp) {
    this._engine.scene.removeModel(comp._model);
  }
}