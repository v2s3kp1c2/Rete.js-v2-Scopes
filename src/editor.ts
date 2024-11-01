import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";
import { ScopesPlugin, Presets as ScopesPresets } from "rete-scopes-plugin";
import {
  ContextMenuPlugin,
  ContextMenuExtra,
  Presets as ContextMenuPresets,
} from "rete-context-menu-plugin";
import {
  AutoArrangePlugin,
  Presets as ArrangePresets,
} from "rete-auto-arrange-plugin";

const socket = new ClassicPreset.Socket("socket");

class Node extends ClassicPreset.Node {
  width = 180;
  height = 140;
  parent?: string;
}

class NodeA extends Node {
  constructor() {
    super("A");

    this.addControl(
      "a",
      new ClassicPreset.InputControl("text", { initial: "a" })
    );
    this.addOutput("port", new ClassicPreset.Output(socket));
  }
}

class NodeB extends Node {
  constructor() {
    super("B");

    this.addControl(
      "b",
      new ClassicPreset.InputControl("text", { initial: "b" })
    );
    this.addInput("port", new ClassicPreset.Input(socket));
  }
}

class NodeParent extends Node {
  constructor() {
    super("Parent");

    this.addInput("port", new ClassicPreset.Input(socket));
    this.addOutput("port", new ClassicPreset.Output(socket));
  }
}

class Connection<
  A extends Node,
  B extends Node
> extends ClassicPreset.Connection<A, B> {}

type Schemes = GetSchemes<Node, Connection<Node, Node>>;
type AreaExtra = ReactArea2D<Schemes> | ContextMenuExtra;

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });
  const scopes = new ScopesPlugin<Schemes>();
  const contextMenu = new ContextMenuPlugin<Schemes>({
    items: ContextMenuPresets.classic.setup([
      ["A", () => new NodeA()],
      ["B", () => new NodeB()],
      ["Parent", () => new NodeParent()],
    ]),
  });
  const arrange = new AutoArrangePlugin<Schemes>();

  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl(),
  });

  render.addPreset(Presets.classic.setup());
  render.addPreset(Presets.contextMenu.setup());

  connection.addPreset(ConnectionPresets.classic.setup());

  scopes.addPreset(ScopesPresets.classic.setup());

  arrange.addPreset(ArrangePresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);
  area.use(scopes);
  area.use(contextMenu);
  area.use(arrange);

  const parent1 = new NodeParent();
  const b2 = new NodeB();
  const parent3 = new NodeParent();
  const a = new NodeA();
  const b = new NodeB();

  a.parent = parent1.id;
  b.parent = parent1.id;
  parent1.parent = parent3.id;
  b2.parent = parent3.id;

  await editor.addNode(parent3);
  await editor.addNode(parent1);
  await editor.addNode(b2);
  await editor.addNode(a);
  await editor.addNode(b);

  await editor.addConnection(
    new ClassicPreset.Connection(a, "port", b, "port")
  );
  await editor.addConnection(
    new ClassicPreset.Connection(parent1, "port", b2, "port")
  );

  await arrange.layout();

  AreaExtensions.zoomAt(area, editor.getNodes());

  return {
    destroy: () => area.destroy(),
  };
}
