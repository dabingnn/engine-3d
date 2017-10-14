import { vec3, color3 } from 'vmath';
import { LinkedArray } from 'memop';
import { Node } from 'scene-graph';
import gfx from 'gfx.js';
import renderer from 'renderer.js';
import { sphere, wireframe } from 'primitives.js';
import LinesModel from '../renderer/lines-model';
import ShaderMaterial from '../materials/shader-material';

let _right = vec3.new(1, 0, 0);
let _up = vec3.new(0, 1, 0);
let _forward = vec3.new(0, 0, 1);
let _v3_tmp = vec3.create();
let _c3_tmp = color3.create();

export default class DrawMng {
  constructor(app) {
    this._app = app;

    this._lines = new LinkedArray(() => {
      return {
        start: vec3.create(),
        end: vec3.create(),
        color: color3.create(),
        duration: 0.0,
        depthTest: false,
        timer: 0.0,

        _prev: null,
        _next: null,
      };
    }, 2000);

    this._axesList = new LinkedArray(() => {
      return {
        pos: vec3.create(),
        up: vec3.create(),
        right: vec3.create(),
        forward: vec3.create(),
        duration: 0.0,
        depthTest: false,
        timer: 0.0,

        _prev: null,
        _next: null,
      };
    }, 2000);

    let materialWireframe = new ShaderMaterial(
      'wireframe', [
        { name: 'color', type: renderer.PARAM_COLOR3, },
      ], []
    );
    materialWireframe.setDepth(true, true);
    materialWireframe.setValue('color', color3.new(1, 1, 1));

    this._primitives = new LinkedArray(() => {
      return {
        model: (() => {
          let model = new renderer.Model();
          let node = new Node();
          model.setNode(node);
          model.addEffect(materialWireframe._effect);

          return model;
        })(),
        duration: 0.0,
        depthTest: false,
        timer: 0.0,

        _prev: null,
        _next: null,
      };
    }, 2000);

    let materialLine = new ShaderMaterial(
      'line', [], []
    );
    materialLine.setDepth(true, true);
    this._materialLine = materialLine;

    let linesModel = new LinesModel();
    linesModel.setDynamicIA(true);
    linesModel.setNode(new Node('debug-lines'));
    linesModel.addEffect(materialLine._effect);

    // TODO: https://github.com/cocos-creator/engine-3d/issues/108
    // lineModel.addInputAssembler(
    //   new renderer.DynamicInputAssembler(
    //     new gfx.VertexBuffer(
    //       device,
    //       new gfx.VertexFormat([
    //         { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
    //         { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 3 }
    //       ]),
    //       gfx.USAGE_DYNAMIC,
    //       lineData,
    //       2000
    //     ),
    //     null,
    //     gfx.PT_LINES
    //   )
    // );

    app.scene.addModel(linesModel);
    this._linesModel = linesModel;

    //
    let sphereData = sphere(1.0, {
      segments: 10,
    });
    sphereData.uvs = null;
    sphereData.indices = wireframe(sphereData.indices);
    this._sphereIA = renderer.createIA(app.device, sphereData);
    this._sphereIA._primitiveType = gfx.PT_LINES;

  }

  /**
   * @param {number} dt
   */
  tick(dt) {
    this._linesModel.clear();

    // lines
    this._lines.forEach(item => {
      if (item.timer > item.duration) {
        this._lines.remove(item);
        return;
      }

      if (item.depthTest) {
        this._linesModel.addLine(item.start, item.end, item.color);
      } else {
        console.warn('We have not support it yet');
        // this._linesModelNoDepth.addLine(start, end, color, duration);
      }

      item.timer += dt;
    });

    // axes list
    this._axesList.forEach(item => {
      if (item.timer > item.duration) {
        this._axesList.remove(item);
        return;
      }

      if (item.depthTest) {
        this._linesModel.addLine(item.pos, item.up, color3.set(_c3_tmp, 1, 0, 0));
        this._linesModel.addLine(item.pos, item.right, color3.set(_c3_tmp, 0, 1, 0));
        this._linesModel.addLine(item.pos, item.forward, color3.set(_c3_tmp, 0, 0, 1));
      } else {
        console.warn('We have not support it yet');
        // this._linesModelNoDepth.addLine(start, end, color, duration);
      }

      item.timer += dt;
    });

    // primitives
    this._primitives.forEach(item => {
      if (item.timer > item.duration) {
        item.model.clearInputAssemblers();
        this._app.scene.removeModel(item.model);

        this._primitives.remove(item);
        return;
      }

      item.timer += dt;
    });
  }

  addLine(start, end, color, duration = 0.0, depthTest = true) {
    let line = this._lines.add();

    vec3.copy(line.start, start);
    vec3.copy(line.end, end);
    color3.copy(line.color, color);
    line.duration = duration;
    line.depthTest = depthTest;
    line.timer = 0.0;
  }

  addAxes(pos, rotation, scale, duration = 0.0, depthTest = true) {
    let axes = this._axesList.add();

    vec3.copy(axes.pos, pos);

    vec3.transformQuat(_v3_tmp, _right, rotation);
    vec3.scaleAndAdd(_v3_tmp, pos, _v3_tmp, scale),
    vec3.copy(axes.right, _v3_tmp);

    vec3.transformQuat(_v3_tmp, _up, rotation);
    vec3.scaleAndAdd(_v3_tmp, pos, _v3_tmp, scale),
    vec3.copy(axes.up, _v3_tmp);

    vec3.transformQuat(_v3_tmp, _forward, rotation);
    vec3.scaleAndAdd(_v3_tmp, pos, _v3_tmp, scale),
    vec3.copy(axes.forward, _v3_tmp);

    axes.duration = duration;
    axes.depthTest = depthTest;
    axes.timer = 0.0;
  }

  addSphere(pos, radius, color, duration = 0.0, depthTest = true) {
    let primitive = this._primitives.add();
    primitive.model.addInputAssembler(this._sphereIA);
    vec3.copy(primitive.model._node.lpos, pos);
    vec3.set(primitive.model._node.lscale, radius, radius, radius);

    primitive.duration = duration;
    primitive.depthTest = depthTest;
    primitive.timer = 0.0;

    this._app.scene.addModel(primitive.model);
  }
}