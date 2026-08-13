var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SimpromanaPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian8 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  rootFolder: "Project Management",
  projectsFolder: "Projects",
  tasksFolder: "Tasks",
  referencesFolder: "Reference",
  archiveFolder: "Archive"
};
var SimpromanaSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Root folder").setDesc("Folder that contains Projects, Tasks, and Reference subfolders.").addText(
      (text) => text.setPlaceholder("Atlas/Project Management").setValue(this.plugin.settings.rootFolder).onChange(async (value) => {
        this.plugin.settings.rootFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Projects subfolder").addText(
      (text) => text.setValue(this.plugin.settings.projectsFolder).onChange(async (value) => {
        this.plugin.settings.projectsFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Tasks subfolder").addText(
      (text) => text.setValue(this.plugin.settings.tasksFolder).onChange(async (value) => {
        this.plugin.settings.tasksFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("References subfolder").addText(
      (text) => text.setValue(this.plugin.settings.referencesFolder).onChange(async (value) => {
        this.plugin.settings.referencesFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Archive subfolder").addText(
      (text) => text.setValue(this.plugin.settings.archiveFolder).onChange(async (value) => {
        this.plugin.settings.archiveFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/modals/CreateProjectModal.ts
var import_obsidian3 = require("obsidian");

// src/lib/vault.ts
var import_obsidian2 = require("obsidian");
function projectsPath(s) {
  return (0, import_obsidian2.normalizePath)(`${s.rootFolder}/${s.projectsFolder}`);
}
function tasksPath(s) {
  return (0, import_obsidian2.normalizePath)(`${s.rootFolder}/${s.tasksFolder}`);
}
function generateId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
async function ensureFolder(app, path) {
  const normalized = (0, import_obsidian2.normalizePath)(path);
  if (!app.vault.getAbstractFileByPath(normalized)) {
    await app.vault.createFolder(normalized);
  }
}
async function getAllProjects(app, s) {
  const folder = app.vault.getAbstractFileByPath(projectsPath(s));
  if (!(folder instanceof import_obsidian2.TFolder))
    return [];
  return folder.children.filter((f) => f instanceof import_obsidian2.TFile && f.extension === "md").sort((a, b) => a.basename.localeCompare(b.basename));
}
function activeProjectFile(app, s) {
  var _a;
  const active = app.workspace.getActiveFile();
  if (!active)
    return null;
  const fm = (_a = app.metadataCache.getFileCache(active)) == null ? void 0 : _a.frontmatter;
  if ((fm == null ? void 0 : fm.type) === "project" && active.path.startsWith(projectsPath(s))) {
    return active;
  }
  return null;
}
function projectWikilink(s, basename) {
  return `"[[${s.rootFolder}/${s.projectsFolder}/${basename}]]"`;
}

// src/modals/CreateProjectModal.ts
var PSTATUS_OPTIONS = {
  Backlog: "Backlog",
  Planning: "Planning",
  "In progress": "In progress",
  Paused: "Paused",
  Done: "Done",
  Canceled: "Canceled"
};
var PRIORITY_OPTIONS = {
  high: "High",
  medium: "Medium",
  low: "Low"
};
var CreateProjectModal = class extends import_obsidian3.Modal {
  constructor(app, settings) {
    super(app);
    this.settings = settings;
    this.name = "";
    this.pstatus = "Backlog";
    this.priority = "medium";
    this.tags = "";
    this.github = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "New project" });
    let nameInput;
    new import_obsidian3.Setting(contentEl).setName("Name").addText((text) => {
      nameInput = text.inputEl;
      text.setPlaceholder("My project").onChange((v) => this.name = v);
    });
    new import_obsidian3.Setting(contentEl).setName("Status").addDropdown(
      (dd) => dd.addOptions(PSTATUS_OPTIONS).setValue(this.pstatus).onChange((v) => this.pstatus = v)
    );
    new import_obsidian3.Setting(contentEl).setName("Priority").addDropdown(
      (dd) => dd.addOptions(PRIORITY_OPTIONS).setValue(this.priority).onChange((v) => this.priority = v)
    );
    new import_obsidian3.Setting(contentEl).setName("Tags").setDesc("Comma-separated.").addText(
      (text) => text.setPlaceholder("godot, tool, web").onChange((v) => this.tags = v)
    );
    new import_obsidian3.Setting(contentEl).setName("GitHub").addText(
      (text) => text.setPlaceholder("https://github.com/...").onChange((v) => this.github = v)
    );
    new import_obsidian3.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Create").setCta().onClick(() => this.submit())
    );
    contentEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey)
        this.submit();
    });
    setTimeout(() => nameInput == null ? void 0 : nameInput.focus(), 50);
  }
  onClose() {
    this.contentEl.empty();
  }
  async submit() {
    const name = this.name.trim();
    if (!name) {
      new import_obsidian3.Notice("Project name cannot be empty.");
      return;
    }
    const folder = projectsPath(this.settings);
    const filePath = (0, import_obsidian3.normalizePath)(`${folder}/${name}.md`);
    if (this.app.vault.getAbstractFileByPath(filePath)) {
      new import_obsidian3.Notice(`Project "${name}" already exists.`);
      return;
    }
    const tags = this.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const tagsYaml = tags.length > 0 ? `
${tags.map((t) => `  - ${t}`).join("\n")}` : " []";
    const root = this.settings.rootFolder;
    const content = `---
pstatus: ${this.pstatus}
type: project
priority: ${this.priority}
tags:${tagsYaml}
github: ${this.github.trim()}
banner:
---
# ${name}

## Descripci\xF3n

## Tareas
![[${root}/Tasks.base#Current|Tareas]]

## Referencia

![[${root}/References.base#Current|Referencias]]
`;
    try {
      await ensureFolder(this.app, folder);
      const file = await this.app.vault.create(filePath, content);
      this.close();
      await this.app.workspace.getLeaf().openFile(file);
      new import_obsidian3.Notice(`\u2705 Project "${name}" created.`);
    } catch (err) {
      console.error("[Simpromana] CreateProject error:", err);
      new import_obsidian3.Notice("\u274C Failed to create project.");
    }
  }
};

// src/modals/CreateTaskModal.ts
var import_obsidian4 = require("obsidian");
var TSTATUS_OPTIONS = {
  Todo: "Todo",
  Doing: "Doing",
  Review: "Review",
  Done: "Done"
};
var PRIORITY_OPTIONS2 = {
  high: "High",
  medium: "Medium",
  low: "Low"
};
var NO_PROJECT = "__none__";
var CreateTaskModal = class extends import_obsidian4.Modal {
  constructor(app, settings) {
    super(app);
    this.settings = settings;
    this.taskName = "";
    this.tstatus = "Todo";
    this.priority = "medium";
    this.milestone = "";
    this.selectedProject = null;
    this.projects = [];
    this.lockedProject = false;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "New task" });
    this.projects = await getAllProjects(this.app, this.settings);
    const contextProject = activeProjectFile(this.app, this.settings);
    if (contextProject) {
      this.selectedProject = contextProject;
      this.lockedProject = true;
    }
    let nameInput;
    new import_obsidian4.Setting(contentEl).setName("Name").addText((text) => {
      nameInput = text.inputEl;
      text.setPlaceholder("Task name").onChange((v) => this.taskName = v);
    });
    new import_obsidian4.Setting(contentEl).setName("Status").addDropdown(
      (dd) => dd.addOptions(TSTATUS_OPTIONS).setValue(this.tstatus).onChange((v) => this.tstatus = v)
    );
    new import_obsidian4.Setting(contentEl).setName("Priority").addDropdown(
      (dd) => dd.addOptions(PRIORITY_OPTIONS2).setValue(this.priority).onChange((v) => this.priority = v)
    );
    if (this.lockedProject) {
      new import_obsidian4.Setting(contentEl).setName("Project").setDesc(this.selectedProject.basename).setDisabled(true);
    } else {
      const projectOptions = {
        [NO_PROJECT]: "\u2014 No project \u2014"
      };
      for (const p of this.projects) {
        projectOptions[p.path] = p.basename;
      }
      new import_obsidian4.Setting(contentEl).setName("Project").addDropdown((dd) => {
        dd.addOptions(projectOptions).setValue(NO_PROJECT).onChange((v) => {
          this.selectedProject = v === NO_PROJECT ? null : this.app.vault.getAbstractFileByPath(v);
        });
      });
    }
    new import_obsidian4.Setting(contentEl).setName("Milestone").setDesc("Optional version or milestone label.").addText(
      (text) => text.setPlaceholder("v1.0").onChange((v) => this.milestone = v)
    );
    new import_obsidian4.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Create").setCta().onClick(() => this.submit())
    );
    contentEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey)
        this.submit();
    });
    setTimeout(() => nameInput == null ? void 0 : nameInput.focus(), 50);
  }
  onClose() {
    this.contentEl.empty();
  }
  async submit() {
    const name = this.taskName.trim();
    if (!name) {
      new import_obsidian4.Notice("Task name cannot be empty.");
      return;
    }
    const id = generateId(6);
    const fileName = `${name} - ${id}.md`;
    const folder = tasksPath(this.settings);
    const filePath = (0, import_obsidian4.normalizePath)(`${folder}/${fileName}`);
    const projectLine = this.selectedProject ? `project: ${projectWikilink(this.settings, this.selectedProject.basename)}` : "project:";
    const milestoneLine = this.milestone.trim() ? `milestone: "${this.milestone.trim()}"` : "";
    const frontmatterLines = [
      `tstatus: ${this.tstatus}`,
      "type: task",
      `priority: ${this.priority}`,
      milestoneLine,
      projectLine
    ].filter(Boolean);
    const content = `---
${frontmatterLines.join("\n")}
---
# ${name}
`;
    try {
      await ensureFolder(this.app, folder);
      const file = await this.app.vault.create(filePath, content);
      this.close();
      await this.app.workspace.getLeaf().openFile(file);
      new import_obsidian4.Notice(
        this.selectedProject ? `\u2705 Task linked to "${this.selectedProject.basename}" created.` : "\u2705 Task created."
      );
    } catch (err) {
      console.error("[Simpromana] CreateTask error:", err);
      new import_obsidian4.Notice("\u274C Failed to create task.");
    }
  }
};

// src/lib/bases.ts
var import_obsidian5 = require("obsidian");
function tasksBaseContent(s) {
  const tasksFolder = `${s.rootFolder}/${s.tasksFolder}`;
  return `filters:
  and:
    - file.folder == "${tasksFolder}"
formulas:
  taskName: file.name.slice(0, file.name.length - 9)
  taskNameLink: link(file.path, formula.taskName)
  _tstatus_order: if(tstatus == "Todo", 1, if(tstatus == "Doing", 2, if(tstatus == "Review", 3, 4)))
  project_link: link(project, project.split('/')[-1])
properties:
  file.name:
    displayName: id
views:
  - type: dev.kotchourko.obsidian-bases-kanban
    name: Current
    filters:
      and:
        - file.hasLink(this)
    groupBy:
      property: tstatus
      direction: ASC
    columnOrder: Todo,Doing,Review,Done
    order:
      - priority
      - milestone
    sort:
      - property: file.mtime
        direction: DESC
  - type: dev.kotchourko.obsidian-bases-kanban
    name: Board
    groupBy:
      property: tstatus
      direction: ASC
    columnOrder: Todo,Doing,Review,Done
    order:
      - formula.project_link
      - priority
      - milestone
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: Table
    groupBy:
      property: project
      direction: ASC
    order:
      - formula.taskNameLink
      - tstatus
      - priority
      - milestone
    sort:
      - property: project
        direction: ASC
      - property: formula._tstatus_order
        direction: ASC
`;
}
async function setupBases(app, s) {
  const path = (0, import_obsidian5.normalizePath)(`${s.rootFolder}/Tasks.base`);
  const content = tasksBaseContent(s);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian5.TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
}

// src/views/FlowView.ts
var import_obsidian7 = require("obsidian");

// src/graph/relations.ts
var RELATION_KEYS = {
  blocks: { kind: "dependency", inverted: false },
  blocking: { kind: "dependency", inverted: false },
  blockedby: { kind: "dependency", inverted: true },
  dependson: { kind: "dependency", inverted: true },
  continuedby: { kind: "continuation", inverted: false },
  followedby: { kind: "continuation", inverted: false },
  continues: { kind: "continuation", inverted: true },
  follows: { kind: "continuation", inverted: true },
  related: { kind: "related", inverted: false },
  relatedto: { kind: "related", inverted: false }
};
var RELATION_LABELS = {
  dependency: "Blocks",
  continuation: "Continues",
  related: "Related"
};
function normalizeKey(key) {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}
function relationKeyOf(key) {
  var _a;
  return (_a = RELATION_KEYS[normalizeKey(key)]) != null ? _a : null;
}
function parseLinkTarget(raw) {
  if (typeof raw !== "string") {
    if (raw && typeof raw === "object" && "path" in raw) {
      return parseLinkTarget(raw.path);
    }
    return null;
  }
  const match = raw.trim().match(/^\[\[(.*)\]\]$/);
  const inner = (match ? match[1] : raw).trim();
  const target = inner.split("|")[0].split("#")[0].trim();
  return target.length > 0 ? target : null;
}
function toTargetList(value) {
  if (value === null || value === void 0)
    return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(parseLinkTarget).filter((target) => target !== null);
}

// src/graph/build.ts
function relationId(relation) {
  if (relation.kind === "related") {
    const [a, b] = [relation.from, relation.to].sort();
    return `related|${a}|${b}`;
  }
  return `${relation.kind}|${relation.from}|${relation.to}`;
}
function orient(source, target, kind, inverted) {
  if (kind === "related") {
    const [from, to] = [source, target].sort();
    return { from, to, kind };
  }
  return inverted ? { from: target, to: source, kind } : { from: source, to: target, kind };
}
function buildTaskGraph(records, resolve) {
  const known = new Set(records.map((record) => record.path));
  const relations = /* @__PURE__ */ new Map();
  const unresolved = [];
  for (const record of records) {
    for (const [key, value] of Object.entries(record.frontmatter)) {
      const relationKey = relationKeyOf(key);
      if (!relationKey)
        continue;
      for (const target of toTargetList(value)) {
        const targetPath = resolve(target, record.path);
        if (!targetPath || !known.has(targetPath)) {
          unresolved.push({ from: record.path, kind: relationKey.kind, target });
          continue;
        }
        if (targetPath === record.path)
          continue;
        const relation = orient(record.path, targetPath, relationKey.kind, relationKey.inverted);
        relations.set(relationId(relation), relation);
      }
    }
  }
  return { nodes: records, relations: [...relations.values()], unresolved };
}
function selectSubgraph(graph, isCore) {
  const core = new Set(graph.nodes.filter(isCore).map((record) => record.path));
  const external = /* @__PURE__ */ new Set();
  const relations = graph.relations.filter((relation) => {
    const fromCore = core.has(relation.from);
    const toCore = core.has(relation.to);
    if (!fromCore && !toCore)
      return false;
    if (!fromCore)
      external.add(relation.from);
    if (!toCore)
      external.add(relation.to);
    return true;
  });
  const kept = /* @__PURE__ */ new Set([...core, ...external]);
  return {
    nodes: graph.nodes.filter((record) => kept.has(record.path)),
    relations,
    unresolved: graph.unresolved.filter((entry) => core.has(entry.from)),
    external
  };
}
function dropNodes(graph, shouldDrop) {
  const kept = new Set(
    graph.nodes.filter((record) => !shouldDrop(record)).map((record) => record.path)
  );
  return {
    nodes: graph.nodes.filter((record) => kept.has(record.path)),
    relations: graph.relations.filter(
      (relation) => kept.has(relation.from) && kept.has(relation.to)
    ),
    unresolved: graph.unresolved,
    external: new Set([...graph.external].filter((path) => kept.has(path)))
  };
}
function connectedPaths(graph) {
  const connected = /* @__PURE__ */ new Set();
  for (const relation of graph.relations) {
    connected.add(relation.from);
    connected.add(relation.to);
  }
  return connected;
}

// src/graph/model.ts
var ORDERING_KINDS = ["dependency", "continuation"];
function isOrderingKind(kind) {
  return ORDERING_KINDS.includes(kind);
}

// src/graph/layout.ts
var DEFAULT_LAYOUT_OPTIONS = {
  nodeWidth: 210,
  nodeHeight: 76,
  layerGap: 76,
  rowGap: 22,
  componentGap: 56,
  dummyHeight: 14
};
function findBackEdges(edges) {
  var _a, _b, _c;
  const outgoing = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const list = outgoing.get(edge.from);
    if (list)
      list.push(edge);
    else
      outgoing.set(edge.from, [edge]);
  }
  const state = /* @__PURE__ */ new Map();
  const back = /* @__PURE__ */ new Set();
  for (const edge of edges) {
    for (const start of [edge.from, edge.to]) {
      if (state.get(start))
        continue;
      state.set(start, 1);
      const stack = [{ node: start, edges: (_a = outgoing.get(start)) != null ? _a : [], index: 0 }];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame.index >= frame.edges.length) {
          state.set(frame.node, 2);
          stack.pop();
          continue;
        }
        const next = frame.edges[frame.index++];
        const visited = (_b = state.get(next.to)) != null ? _b : 0;
        if (visited === 1) {
          back.add(next);
        } else if (visited === 0) {
          state.set(next.to, 1);
          stack.push({ node: next.to, edges: (_c = outgoing.get(next.to)) != null ? _c : [], index: 0 });
        }
      }
    }
  }
  return back;
}
function assignLayers(paths, edges) {
  var _a, _b, _c, _d, _e, _f, _g;
  const layer = new Map(paths.map((path) => [path, 0]));
  const outgoing = /* @__PURE__ */ new Map();
  const inDegree = new Map(paths.map((path) => [path, 0]));
  for (const edge of edges) {
    const list = outgoing.get(edge.source);
    if (list)
      list.push(edge);
    else
      outgoing.set(edge.source, [edge]);
    inDegree.set(edge.target, ((_a = inDegree.get(edge.target)) != null ? _a : 0) + 1);
  }
  const queue = paths.filter((path) => {
    var _a2;
    return ((_a2 = inDegree.get(path)) != null ? _a2 : 0) === 0;
  });
  let processed = 0;
  while (queue.length > 0) {
    const path = queue.shift();
    processed++;
    for (const edge of (_b = outgoing.get(path)) != null ? _b : []) {
      const candidate = ((_c = layer.get(path)) != null ? _c : 0) + 1;
      if (candidate > ((_d = layer.get(edge.target)) != null ? _d : 0))
        layer.set(edge.target, candidate);
      const remaining = ((_e = inDegree.get(edge.target)) != null ? _e : 0) - 1;
      inDegree.set(edge.target, remaining);
      if (remaining === 0)
        queue.push(edge.target);
    }
  }
  if (processed < paths.length) {
    for (const edge of edges) {
      const candidate = ((_f = layer.get(edge.source)) != null ? _f : 0) + 1;
      if (candidate > ((_g = layer.get(edge.target)) != null ? _g : 0))
        layer.set(edge.target, candidate);
    }
  }
  return layer;
}
function groupComponents(paths, relations) {
  const parent = new Map(paths.map((path) => [path, path]));
  const find = (path) => {
    let root = path;
    while (parent.get(root) !== root)
      root = parent.get(root);
    let cursor = path;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  for (const relation of relations) {
    const a = find(relation.from);
    const b = find(relation.to);
    if (a !== b)
      parent.set(a, b);
  }
  const ids = /* @__PURE__ */ new Map();
  const components = /* @__PURE__ */ new Map();
  for (const path of paths) {
    const root = find(path);
    let id = ids.get(root);
    if (id === void 0) {
      id = ids.size;
      ids.set(root, id);
    }
    components.set(path, id);
  }
  return components;
}
function median(values) {
  if (values.length === 0)
    return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function orderLayers(layers, neighbours) {
  const applyOrder = (layer) => {
    layer.forEach((cell, index) => cell.order = index);
  };
  layers.forEach(applyOrder);
  for (let sweep = 0; sweep < 6; sweep++) {
    const downwards = sweep % 2 === 0;
    const indexes = downwards ? layers.map((_, index) => index).slice(1) : layers.map((_, index) => index).slice(0, -1).reverse();
    for (const index of indexes) {
      const layer = layers[index];
      const scores = /* @__PURE__ */ new Map();
      for (const cell of layer) {
        const links = neighbours.get(cell.key);
        const side = downwards ? links == null ? void 0 : links.previous : links == null ? void 0 : links.next;
        const barycentre = median((side != null ? side : []).map((other) => other.order));
        scores.set(cell.key, barycentre != null ? barycentre : cell.order);
      }
      layer.sort((a, b) => scores.get(a.key) - scores.get(b.key));
      applyOrder(layer);
    }
  }
}
function assignRows(layers, neighbours, rowGap) {
  for (const layer of layers) {
    let cursor = 0;
    for (const cell of layer) {
      cell.y = cursor;
      cursor += cell.height + rowGap;
    }
  }
  for (let sweep = 0; sweep < 4; sweep++) {
    const downwards = sweep % 2 === 0;
    const indexes = downwards ? layers.map((_, index) => index).slice(1) : layers.map((_, index) => index).slice(0, -1).reverse();
    for (const index of indexes) {
      let cursor = Number.NEGATIVE_INFINITY;
      for (const cell of layers[index]) {
        const links = neighbours.get(cell.key);
        const side = downwards ? links == null ? void 0 : links.previous : links == null ? void 0 : links.next;
        const centre = median((side != null ? side : []).map((other) => other.y + other.height / 2));
        const desired = centre === null ? cell.y : centre - cell.height / 2;
        cell.y = Math.max(cursor, desired);
        cursor = cell.y + cell.height + rowGap;
      }
    }
  }
}
function sideAnchor(node, towards) {
  const horizontal = Math.abs(towards.x - node.x) >= node.width;
  if (horizontal) {
    return {
      x: towards.x > node.x ? node.x + node.width : node.x,
      y: node.y + node.height / 2
    };
  }
  return {
    x: node.x + node.width / 2,
    y: towards.y > node.y ? node.y + node.height : node.y
  };
}
function layoutGraph(graph, options = DEFAULT_LAYOUT_OPTIONS) {
  var _a, _b, _c;
  const records = new Map(graph.nodes.map((record) => [record.path, record]));
  const relations = graph.relations.filter(
    (relation) => records.has(relation.from) && records.has(relation.to)
  );
  const orderingRelations = relations.filter((relation) => isOrderingKind(relation.kind));
  const backEdges = findBackEdges(orderingRelations);
  const ordering = orderingRelations.map((relation) => {
    const cyclic = backEdges.has(relation);
    return {
      relation,
      source: cyclic ? relation.to : relation.from,
      target: cyclic ? relation.from : relation.to,
      cyclic,
      dummies: []
    };
  });
  const paths = [...records.keys()];
  const layerOf = assignLayers(paths, ordering);
  const componentOf = groupComponents(paths, relations);
  const degree = new Map(paths.map((path) => [path, 0]));
  for (const relation of relations) {
    degree.set(relation.from, ((_a = degree.get(relation.from)) != null ? _a : 0) + 1);
    degree.set(relation.to, ((_b = degree.get(relation.to)) != null ? _b : 0) + 1);
  }
  const linked = paths.filter((path) => {
    var _a2;
    return ((_a2 = degree.get(path)) != null ? _a2 : 0) > 0;
  });
  const unlinked = paths.filter((path) => {
    var _a2;
    return ((_a2 = degree.get(path)) != null ? _a2 : 0) === 0;
  });
  const cells = /* @__PURE__ */ new Map();
  for (const path of linked) {
    cells.set(path, {
      key: path,
      record: records.get(path),
      layer: (_c = layerOf.get(path)) != null ? _c : 0,
      order: 0,
      y: 0,
      height: options.nodeHeight
    });
  }
  const components = /* @__PURE__ */ new Map();
  for (const path of linked) {
    const id = componentOf.get(path);
    const list = components.get(id);
    if (list)
      list.push(path);
    else
      components.set(id, [path]);
  }
  const step = options.nodeWidth + options.layerGap;
  const layoutNodes = [];
  const layoutEdges = [];
  let maxLayers = 0;
  let top = 0;
  const componentIds = [...components.keys()].sort((a, b) => {
    const sizeDelta = components.get(b).length - components.get(a).length;
    if (sizeDelta !== 0)
      return sizeDelta;
    return a - b;
  });
  for (const id of componentIds) {
    const members = components.get(id);
    const memberSet = new Set(members);
    const minLayer = Math.min(...members.map((path) => {
      var _a2, _b2;
      return (_b2 = (_a2 = cells.get(path)) == null ? void 0 : _a2.layer) != null ? _b2 : 0;
    }));
    for (const path of members) {
      const cell = cells.get(path);
      cell.layer -= minLayer;
    }
    const componentEdges = ordering.filter((edge) => memberSet.has(edge.source));
    const layerCount = Math.max(...members.map((path) => cells.get(path).layer)) + 1;
    const layers = Array.from({ length: layerCount }, () => []);
    for (const path of members) {
      const cell = cells.get(path);
      layers[cell.layer].push(cell);
    }
    let dummyCount = 0;
    for (const edge of componentEdges) {
      const source = cells.get(edge.source);
      const target = cells.get(edge.target);
      for (let layer = source.layer + 1; layer < target.layer; layer++) {
        const dummy = {
          key: `${id}:dummy:${dummyCount++}`,
          record: null,
          layer,
          order: 0,
          y: 0,
          height: options.dummyHeight
        };
        edge.dummies.push(dummy);
        layers[layer].push(dummy);
      }
    }
    const neighbours = /* @__PURE__ */ new Map();
    const linkOf = (key) => {
      let entry = neighbours.get(key);
      if (!entry) {
        entry = { previous: [], next: [] };
        neighbours.set(key, entry);
      }
      return entry;
    };
    for (const edge of componentEdges) {
      const chain = [
        cells.get(edge.source),
        ...edge.dummies,
        cells.get(edge.target)
      ];
      for (let index = 0; index < chain.length - 1; index++) {
        const from = chain[index];
        const to = chain[index + 1];
        linkOf(from.key).next.push(to);
        linkOf(to.key).previous.push(from);
      }
    }
    for (const layer of layers) {
      layer.sort((a, b) => {
        var _a2, _b2, _c2, _d;
        return ((_b2 = (_a2 = a.record) == null ? void 0 : _a2.title) != null ? _b2 : "").localeCompare((_d = (_c2 = b.record) == null ? void 0 : _c2.title) != null ? _d : "");
      });
    }
    orderLayers(layers, neighbours);
    assignRows(layers, neighbours, options.rowGap);
    const allCells = layers.flat();
    const componentTop = Math.min(...allCells.map((cell) => cell.y));
    const componentBottom = Math.max(...allCells.map((cell) => cell.y + cell.height));
    for (const cell of allCells) {
      cell.y += top - componentTop;
    }
    for (const path of members) {
      const cell = cells.get(path);
      layoutNodes.push({
        record: cell.record,
        x: cell.layer * step,
        y: cell.y,
        width: options.nodeWidth,
        height: cell.height,
        layer: cell.layer,
        unlinked: false
      });
    }
    maxLayers = Math.max(maxLayers, layerCount);
    top += componentBottom - componentTop + options.componentGap;
  }
  const nodeByPath = new Map(layoutNodes.map((node) => [node.record.path, node]));
  for (const edge of ordering) {
    const source = nodeByPath.get(edge.source);
    const target = nodeByPath.get(edge.target);
    if (!source || !target)
      continue;
    const points = [
      { x: source.x + source.width, y: source.y + source.height / 2 },
      ...edge.dummies.map((dummy) => ({
        x: dummy.layer * step + options.nodeWidth / 2,
        y: dummy.y + dummy.height / 2
      })),
      { x: target.x, y: target.y + target.height / 2 }
    ];
    layoutEdges.push({
      relation: edge.relation,
      points: edge.cyclic ? [...points].reverse() : points,
      cyclic: edge.cyclic
    });
  }
  for (const relation of relations) {
    if (relation.kind !== "related")
      continue;
    const from = nodeByPath.get(relation.from);
    const to = nodeByPath.get(relation.to);
    if (!from || !to)
      continue;
    layoutEdges.push({
      relation,
      points: [sideAnchor(from, to), sideAnchor(to, from)],
      cyclic: false
    });
  }
  let unlinkedTop = null;
  if (unlinked.length > 0) {
    if (layoutNodes.length > 0)
      top += options.componentGap;
    unlinkedTop = top;
    const columns = Math.max(4, maxLayers);
    const sorted = [...unlinked].sort(
      (a, b) => records.get(a).title.localeCompare(records.get(b).title)
    );
    sorted.forEach((path, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      layoutNodes.push({
        record: records.get(path),
        x: column * step,
        y: top + row * (options.nodeHeight + options.rowGap),
        width: options.nodeWidth,
        height: options.nodeHeight,
        layer: column,
        unlinked: true
      });
    });
    top += Math.ceil(sorted.length / columns) * (options.nodeHeight + options.rowGap);
  }
  const width = layoutNodes.reduce((max, node) => Math.max(max, node.x + node.width), 0);
  const height = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.height), 0);
  return { nodes: layoutNodes, edges: layoutEdges, width, height, unlinkedTop };
}

// src/lib/tasks.ts
var ID_PATTERN = /^(.*?)\s+-\s+([A-Za-z0-9]+)$/;
function splitBasename(basename) {
  const match = basename.match(ID_PATTERN);
  return match ? { title: match[1], id: match[2] } : { title: basename, id: "" };
}
function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function collectTaskRecords(app, settings) {
  var _a, _b, _c, _d, _e;
  const prefix = `${tasksPath(settings)}/`;
  const records = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (!file.path.startsWith(prefix))
      continue;
    const frontmatter = (_b = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
    const { title, id } = splitBasename(file.basename);
    const projectTarget = parseLinkTarget(frontmatter.project);
    const projectFile = projectTarget ? app.metadataCache.getFirstLinkpathDest(projectTarget, file.path) : null;
    records.push({
      path: file.path,
      basename: file.basename,
      title,
      id,
      projectPath: (_c = projectFile == null ? void 0 : projectFile.path) != null ? _c : null,
      projectName: (_e = (_d = projectFile == null ? void 0 : projectFile.basename) != null ? _d : projectTarget == null ? void 0 : projectTarget.split("/").pop()) != null ? _e : null,
      status: stringValue(frontmatter.tstatus) || "Todo",
      priority: stringValue(frontmatter.priority),
      milestone: stringValue(frontmatter.milestone) || null,
      frontmatter
    });
  }
  return records;
}
function createTaskResolver(app, records) {
  const byBasename = /* @__PURE__ */ new Map();
  const byId = /* @__PURE__ */ new Map();
  for (const record of records) {
    if (!byBasename.has(record.basename))
      byBasename.set(record.basename, record.path);
    if (record.id && !byId.has(record.id))
      byId.set(record.id, record.path);
  }
  return (target, sourcePath) => {
    var _a, _b, _c;
    const resolved = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
    if (resolved)
      return resolved.path;
    const tail = (_a = target.split("/").pop()) != null ? _a : target;
    return (_c = (_b = byBasename.get(tail)) != null ? _b : byId.get(tail)) != null ? _c : null;
  };
}
function projectFiles(app, settings) {
  const prefix = `${projectsPath(settings)}/`;
  return app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix)).sort((a, b) => a.basename.localeCompare(b.basename));
}

// src/views/FlowCanvas.ts
var import_obsidian6 = require("obsidian");
var SVG_NS = "http://www.w3.org/2000/svg";
var MIN_SCALE = 0.15;
var MAX_SCALE = 2.5;
var DRAG_THRESHOLD = 4;
function svgEl(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}
function curveBetween(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const offset2 = Math.max(20, Math.abs(dx) * 0.4);
    const direction2 = dx >= 0 ? 1 : -1;
    return `M ${from.x} ${from.y} C ${from.x + offset2 * direction2} ${from.y}, ${to.x - offset2 * direction2} ${to.y}, ${to.x} ${to.y}`;
  }
  const offset = Math.max(20, Math.abs(dy) * 0.4);
  const direction = dy >= 0 ? 1 : -1;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + offset * direction}, ${to.x} ${to.y - offset * direction}, ${to.x} ${to.y}`;
}
function edgePath(edge) {
  const points = edge.points;
  if (points.length < 2)
    return "";
  if (edge.relation.kind === "related")
    return curveBetween(points[0], points[1]);
  const direction = edge.cyclic ? -1 : 1;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const offset = Math.max(24, Math.abs(to.x - from.x) * 0.45);
    path += ` C ${from.x + offset * direction} ${from.y}, ${to.x - offset * direction} ${to.y}, ${to.x} ${to.y}`;
  }
  return path;
}
function statusSlug(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}
var FlowCanvas = class {
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    this.transform = { x: 0, y: 0, k: 1 };
    this.layout = null;
    this.nodeElements = /* @__PURE__ */ new Map();
    this.edgeElements = [];
    this.neighbours = /* @__PURE__ */ new Map();
    this.dragging = false;
    this.dragMoved = 0;
    this.pointerOrigin = { x: 0, y: 0 };
    this.clearHighlight = () => {
      for (const element of this.nodeElements.values()) {
        element.classList.remove("is-faded", "is-focus");
      }
      for (const edge of this.edgeElements) {
        edge.element.classList.remove("is-faded", "is-active");
      }
    };
    this.onWheel = (event) => {
      event.preventDefault();
      const bounds = this.container.getBoundingClientRect();
      this.zoomAt(
        Math.pow(0.999, event.deltaY),
        event.clientX - bounds.left,
        event.clientY - bounds.top
      );
    };
    this.onPointerDown = (event) => {
      if (event.button !== 0)
        return;
      this.dragging = true;
      this.dragMoved = 0;
      this.pointerOrigin = { x: event.clientX, y: event.clientY };
      this.svg.setPointerCapture(event.pointerId);
      this.svg.addClass("is-panning");
    };
    this.onPointerMove = (event) => {
      if (!this.dragging)
        return;
      const dx = event.clientX - this.pointerOrigin.x;
      const dy = event.clientY - this.pointerOrigin.y;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      this.transform.x += dx;
      this.transform.y += dy;
      this.pointerOrigin = { x: event.clientX, y: event.clientY };
      this.applyTransform();
    };
    this.onPointerUp = (event) => {
      if (!this.dragging)
        return;
      this.dragging = false;
      this.svg.releasePointerCapture(event.pointerId);
      this.svg.removeClass("is-panning");
      window.setTimeout(() => this.dragMoved = 0, 0);
    };
    this.svg = svgEl("svg", { class: "spm-flow-svg" });
    this.svg.appendChild(this.buildDefs());
    this.viewport = svgEl("g", { class: "spm-flow-viewport" });
    this.edgeLayer = svgEl("g", { class: "spm-flow-edges" });
    this.nodeLayer = svgEl("g", { class: "spm-flow-nodes" });
    this.viewport.appendChild(this.edgeLayer);
    this.viewport.appendChild(this.nodeLayer);
    this.svg.appendChild(this.viewport);
    this.container.appendChild(this.svg);
    this.svg.addEventListener("wheel", this.onWheel, { passive: false });
    this.svg.addEventListener("pointerdown", this.onPointerDown);
    this.svg.addEventListener("pointermove", this.onPointerMove);
    this.svg.addEventListener("pointerup", this.onPointerUp);
    this.svg.addEventListener("pointercancel", this.onPointerUp);
    this.svg.addEventListener("pointerleave", this.clearHighlight);
  }
  destroy() {
    this.svg.removeEventListener("wheel", this.onWheel);
    this.svg.removeEventListener("pointerdown", this.onPointerDown);
    this.svg.removeEventListener("pointermove", this.onPointerMove);
    this.svg.removeEventListener("pointerup", this.onPointerUp);
    this.svg.removeEventListener("pointercancel", this.onPointerUp);
    this.svg.removeEventListener("pointerleave", this.clearHighlight);
    this.svg.remove();
  }
  render(layout, options) {
    this.layout = layout;
    this.edgeLayer.empty();
    this.nodeLayer.empty();
    this.nodeElements.clear();
    this.edgeElements = [];
    this.neighbours.clear();
    if (layout.unlinkedTop !== null) {
      this.edgeLayer.appendChild(this.buildUnlinkedDivider(layout));
    }
    for (const edge of layout.edges) {
      this.edgeLayer.appendChild(this.buildEdge(edge));
      this.link(edge.relation.from, edge.relation.to);
    }
    for (const node of layout.nodes) {
      this.nodeLayer.appendChild(this.buildNode(node));
    }
    if (options.fit)
      this.fit();
    else
      this.applyTransform();
  }
  fit() {
    const layout = this.layout;
    if (!layout || layout.nodes.length === 0)
      return;
    const bounds = this.container.getBoundingClientRect();
    const padding = 32;
    const scale = Math.min(
      (bounds.width - padding * 2) / Math.max(layout.width, 1),
      (bounds.height - padding * 2) / Math.max(layout.height, 1),
      1
    );
    this.transform.k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.transform.x = (bounds.width - layout.width * this.transform.k) / 2;
    this.transform.y = (bounds.height - layout.height * this.transform.k) / 2;
    this.applyTransform();
  }
  zoomBy(factor) {
    const bounds = this.container.getBoundingClientRect();
    this.zoomAt(factor, bounds.width / 2, bounds.height / 2);
  }
  buildDefs() {
    const defs = svgEl("defs");
    for (const kind of ["dependency", "continuation", "cycle"]) {
      const marker = svgEl("marker", {
        id: `spm-arrow-${kind}`,
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "6",
        markerHeight: "6",
        orient: "auto-start-reverse"
      });
      marker.appendChild(
        svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `spm-flow-arrow is-${kind}` })
      );
      defs.appendChild(marker);
    }
    return defs;
  }
  buildUnlinkedDivider(layout) {
    const top = layout.unlinkedTop - 28;
    const group = svgEl("g", { class: "spm-flow-divider" });
    group.appendChild(
      svgEl("line", {
        x1: "0",
        y1: String(top),
        x2: String(Math.max(layout.width, 200)),
        y2: String(top)
      })
    );
    const label = svgEl("text", { x: "0", y: String(top - 8) });
    label.textContent = "Unlinked tasks";
    group.appendChild(label);
    return group;
  }
  buildEdge(edge) {
    const kind = edge.cyclic ? "cycle" : edge.relation.kind;
    const path = svgEl("path", {
      class: `spm-flow-edge is-${kind}`,
      d: edgePath(edge)
    });
    if (edge.relation.kind !== "related") {
      path.setAttribute("marker-end", `url(#spm-arrow-${kind})`);
    }
    this.edgeElements.push({ element: path, from: edge.relation.from, to: edge.relation.to });
    return path;
  }
  buildNode(node) {
    const record = node.record;
    const group = svgEl("g", { class: "spm-flow-node" });
    group.dataset.path = record.path;
    const holder = svgEl("foreignObject", {
      x: String(node.x),
      y: String(node.y),
      width: String(node.width),
      height: String(node.height)
    });
    const card = document.createElement("div");
    card.className = "spm-flow-card";
    card.dataset.status = statusSlug(record.status);
    if (node.unlinked)
      card.addClass("is-unlinked");
    const title = card.createDiv({ cls: "spm-flow-card-title", text: record.title });
    title.setAttribute("title", record.title);
    const meta = card.createDiv({ cls: "spm-flow-card-meta" });
    meta.createSpan({ cls: "spm-flow-chip is-status", text: record.status });
    if (record.priority) {
      meta.createSpan({ cls: `spm-flow-chip is-priority is-${record.priority}`, text: record.priority });
    }
    if (record.milestone) {
      meta.createSpan({ cls: "spm-flow-chip", text: record.milestone });
    }
    holder.appendChild(card);
    group.appendChild(holder);
    (0, import_obsidian6.setTooltip)(card, this.tooltipFor(node), { delay: 400 });
    group.addEventListener("mouseenter", () => this.highlight(record.path));
    group.addEventListener("mouseleave", this.clearHighlight);
    group.addEventListener("click", (event) => {
      if (this.dragMoved > DRAG_THRESHOLD)
        return;
      this.handlers.onOpenTask(record.path, event);
    });
    group.addEventListener("auxclick", (event) => {
      if (event.button === 1)
        this.handlers.onOpenTask(record.path, event);
    });
    this.nodeElements.set(record.path, group);
    return group;
  }
  tooltipFor(node) {
    var _a, _b;
    const record = node.record;
    const lines = [record.title, `Status: ${record.status}`];
    if (record.priority)
      lines.push(`Priority: ${record.priority}`);
    if (record.milestone)
      lines.push(`Milestone: ${record.milestone}`);
    if (record.projectName)
      lines.push(`Project: ${record.projectName}`);
    const incoming = (_b = (_a = this.layout) == null ? void 0 : _a.edges.filter((edge) => edge.relation.to === record.path)) != null ? _b : [];
    for (const edge of incoming) {
      if (edge.relation.kind === "dependency")
        lines.push("Blocked by an upstream task");
    }
    return lines.join("\n");
  }
  link(from, to) {
    var _a, _b;
    const forward = (_a = this.neighbours.get(from)) != null ? _a : /* @__PURE__ */ new Set();
    forward.add(to);
    this.neighbours.set(from, forward);
    const backward = (_b = this.neighbours.get(to)) != null ? _b : /* @__PURE__ */ new Set();
    backward.add(from);
    this.neighbours.set(to, backward);
  }
  highlight(path) {
    var _a;
    if (this.dragging)
      return;
    const related = (_a = this.neighbours.get(path)) != null ? _a : /* @__PURE__ */ new Set();
    for (const [nodePath, element] of this.nodeElements) {
      const active = nodePath === path || related.has(nodePath);
      element.classList.toggle("is-faded", !active);
      element.classList.toggle("is-focus", nodePath === path);
    }
    for (const edge of this.edgeElements) {
      const active = edge.from === path || edge.to === path;
      edge.element.classList.toggle("is-faded", !active);
      edge.element.classList.toggle("is-active", active);
    }
  }
  applyTransform() {
    const { x, y, k } = this.transform;
    this.viewport.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
  }
  zoomAt(factor, clientX, clientY) {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.transform.k * factor));
    const ratio = next / this.transform.k;
    this.transform.x = clientX - (clientX - this.transform.x) * ratio;
    this.transform.y = clientY - (clientY - this.transform.y) * ratio;
    this.transform.k = next;
    this.applyTransform();
  }
};

// src/views/FlowView.ts
var FLOW_VIEW_TYPE = "simpromana-flow";
var LEGEND = [
  { kind: "dependency", label: RELATION_LABELS.dependency },
  { kind: "continuation", label: RELATION_LABELS.continuation },
  { kind: "related", label: RELATION_LABELS.related }
];
var FlowView = class extends import_obsidian7.ItemView {
  constructor(leaf, settings) {
    super(leaf);
    this.settings = settings;
    this.projectPath = null;
    this.hideDone = false;
    this.showUnlinked = false;
    this.canvas = null;
  }
  getViewType() {
    return FLOW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Task flow";
  }
  getIcon() {
    return "git-fork";
  }
  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("spm-flow");
    this.buildToolbar(root.createDiv({ cls: "spm-flow-toolbar" }));
    this.canvasEl = root.createDiv({ cls: "spm-flow-canvas" });
    this.emptyEl = this.canvasEl.createDiv({ cls: "spm-flow-empty" });
    this.canvas = new FlowCanvas(this.canvasEl, {
      onOpenTask: (path, event) => this.openTask(path, event)
    });
    const refresh = (0, import_obsidian7.debounce)(() => this.render(false), 400, true);
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isRelevant(file.path))
          refresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.isRelevant(file.path) || this.isRelevant(oldPath))
          refresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.isRelevant(file.path))
          refresh();
      })
    );
    this.render(true);
  }
  async onClose() {
    var _a;
    (_a = this.canvas) == null ? void 0 : _a.destroy();
    this.canvas = null;
  }
  getState() {
    var _a;
    return {
      projectPath: (_a = this.projectPath) != null ? _a : void 0,
      hideDone: this.hideDone,
      showUnlinked: this.showUnlinked
    };
  }
  async setState(state, result) {
    const next = state != null ? state : {};
    if (typeof next.projectPath === "string")
      this.projectPath = next.projectPath;
    if (typeof next.hideDone === "boolean")
      this.hideDone = next.hideDone;
    if (typeof next.showUnlinked === "boolean")
      this.showUnlinked = next.showUnlinked;
    await super.setState(state, result);
    if (this.canvas)
      this.render(true);
  }
  isRelevant(path) {
    return path.startsWith(`${tasksPath(this.settings)}/`) || path.startsWith(`${projectsPath(this.settings)}/`);
  }
  buildToolbar(toolbar) {
    this.projectSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-project" });
    this.projectSelect.addEventListener("change", () => {
      this.projectPath = this.projectSelect.value || null;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.doneButton = toolbar.createEl("button", {
      cls: "spm-flow-toggle",
      text: "Hide done"
    });
    this.doneButton.addEventListener("click", () => {
      this.hideDone = !this.hideDone;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.unlinkedButton = toolbar.createEl("button", {
      cls: "spm-flow-toggle",
      text: "Unlinked"
    });
    this.unlinkedButton.addEventListener("click", () => {
      this.showUnlinked = !this.showUnlinked;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    const zoomOut = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian7.setIcon)(zoomOut, "zoom-out");
    zoomOut.addEventListener("click", () => {
      var _a;
      return (_a = this.canvas) == null ? void 0 : _a.zoomBy(0.8);
    });
    const zoomIn = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian7.setIcon)(zoomIn, "zoom-in");
    zoomIn.addEventListener("click", () => {
      var _a;
      return (_a = this.canvas) == null ? void 0 : _a.zoomBy(1.25);
    });
    const fit = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian7.setIcon)(fit, "maximize");
    fit.addEventListener("click", () => {
      var _a;
      return (_a = this.canvas) == null ? void 0 : _a.fit();
    });
    const legend = toolbar.createDiv({ cls: "spm-flow-legend" });
    for (const entry of LEGEND) {
      const item = legend.createDiv({ cls: "spm-flow-legend-item" });
      item.createSpan({ cls: `spm-flow-legend-line is-${entry.kind}` });
      item.createSpan({ text: entry.label });
    }
    this.warningEl = toolbar.createDiv({ cls: "spm-flow-warning" });
  }
  syncProjectOptions(files) {
    const current = this.projectPath;
    this.projectSelect.empty();
    for (const file of files) {
      this.projectSelect.createEl("option", { value: file.path, text: file.basename });
    }
    if (current && files.some((file) => file.path === current)) {
      this.projectSelect.value = current;
    } else if (files.length > 0) {
      this.projectPath = files[0].path;
      this.projectSelect.value = files[0].path;
    } else {
      this.projectPath = null;
    }
  }
  render(fit) {
    if (!this.canvas)
      return;
    const projects = projectFiles(this.app, this.settings);
    this.syncProjectOptions(projects);
    const records = collectTaskRecords(this.app, this.settings);
    const graph = buildTaskGraph(records, createTaskResolver(this.app, records));
    const projectPath = this.projectPath;
    let scoped = selectSubgraph(
      graph,
      (record) => projectPath !== null && record.projectPath === projectPath
    );
    if (this.hideDone) {
      scoped = dropNodes(scoped, (record) => record.status.toLowerCase() === "done");
    }
    const connected = connectedPaths(scoped);
    const unlinkedCount = scoped.nodes.filter((record) => !connected.has(record.path)).length;
    if (!this.showUnlinked) {
      scoped = dropNodes(scoped, (record) => !connected.has(record.path));
    }
    this.doneButton.toggleClass("is-active", this.hideDone);
    this.unlinkedButton.toggleClass("is-active", this.showUnlinked);
    this.unlinkedButton.setText(`Unlinked (${unlinkedCount})`);
    this.warningEl.empty();
    if (scoped.unresolved.length > 0) {
      const targets = [...new Set(scoped.unresolved.map((entry) => entry.target))];
      this.warningEl.setText(`${targets.length} unresolved link(s)`);
      this.warningEl.setAttribute("title", targets.join("\n"));
    }
    this.canvas.render(layoutGraph(scoped), { fit });
    this.updateEmptyState(projects.length, scoped.nodes.length, unlinkedCount);
  }
  updateEmptyState(projectCount, nodeCount, unlinkedCount) {
    this.emptyEl.empty();
    if (nodeCount > 0) {
      this.emptyEl.hide();
      return;
    }
    this.emptyEl.show();
    if (projectCount === 0) {
      this.emptyEl.setText("No projects found in the projects folder.");
    } else if (unlinkedCount > 0) {
      this.emptyEl.setText(
        `No related tasks in this project. Enable "Unlinked (${unlinkedCount})" to see the rest.`
      );
    } else {
      this.emptyEl.setText("No tasks in this project yet.");
    }
  }
  openTask(path, event) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian7.TFile))
      return;
    const leaf = this.app.workspace.getLeaf(import_obsidian7.Keymap.isModEvent(event));
    leaf.openFile(file);
  }
};

// src/main.ts
var SimpromanaPlugin = class extends import_obsidian8.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SimpromanaSettingTab(this.app, this));
    this.registerView(
      FLOW_VIEW_TYPE,
      (leaf) => new FlowView(leaf, this.settings)
    );
    this.addCommand({
      id: "open-task-flow",
      name: "Open task flow",
      callback: () => this.openFlowView()
    });
    this.addCommand({
      id: "create-project",
      name: "New project",
      callback: () => new CreateProjectModal(this.app, this.settings).open()
    });
    this.addCommand({
      id: "create-task",
      name: "New task",
      callback: () => new CreateTaskModal(this.app, this.settings).open()
    });
    this.addCommand({
      id: "setup-bases",
      name: "Setup bases",
      callback: async () => {
        try {
          await setupBases(this.app, this.settings);
          new import_obsidian8.Notice("\u2705 Tasks.base updated.");
        } catch (err) {
          console.error("[Simpromana] Setup bases error:", err);
          new import_obsidian8.Notice("\u274C Failed to update Tasks.base.");
        }
      }
    });
  }
  async openFlowView() {
    var _a;
    const { workspace } = this.app;
    const leaf = (_a = workspace.getLeavesOfType(FLOW_VIEW_TYPE)[0]) != null ? _a : workspace.getLeaf("tab");
    const project = activeProjectFile(this.app, this.settings);
    const state = project ? { projectPath: project.path } : {};
    await leaf.setViewState({ type: FLOW_VIEW_TYPE, active: true, state });
    await workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
