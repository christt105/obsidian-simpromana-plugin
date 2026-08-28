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
var import_obsidian10 = require("obsidian");

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
function referencesPath(s) {
  return (0, import_obsidian2.normalizePath)(`${s.rootFolder}/${s.referencesFolder}`);
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
var import_obsidian8 = require("obsidian");

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
var CANONICAL_RELATION_KEYS = {
  dependency: "blocked_by",
  continuation: "continues",
  related: "related",
  mention: ""
};
var RELATION_LABELS = {
  dependency: "Blocks",
  continuation: "Continues",
  related: "Related",
  mention: "Mentions"
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
  if (relation.kind === "dependency" || relation.kind === "continuation") {
    return `${relation.kind}|${relation.from}|${relation.to}`;
  }
  const [a, b] = [relation.from, relation.to].sort();
  return `${relation.kind}|${a}|${b}`;
}
function pairId(from, to) {
  const [a, b] = [from, to].sort();
  return `${a}|${b}`;
}
function orient(source, target, kind, inverted) {
  if (kind !== "dependency" && kind !== "continuation") {
    const [from, to] = [source, target].sort();
    return { from, to, kind };
  }
  return inverted ? { from: target, to: source, kind } : { from: source, to: target, kind };
}
function buildNoteGraph(records, resolve, options = { mentions: true }) {
  const known = new Set(records.map((record) => record.path));
  const relations = /* @__PURE__ */ new Map();
  const pairs = /* @__PURE__ */ new Set();
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
        pairs.add(pairId(relation.from, relation.to));
      }
    }
  }
  if (options.mentions) {
    for (const record of records) {
      for (const link of record.links) {
        const targetPath = resolve(link, record.path);
        if (!targetPath || !known.has(targetPath) || targetPath === record.path)
          continue;
        if (pairs.has(pairId(record.path, targetPath)))
          continue;
        const relation = orient(record.path, targetPath, "mention", false);
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
function collapseHubs(graph, limit) {
  var _a, _b;
  const hidden = /* @__PURE__ */ new Map();
  if (limit <= 0)
    return { graph, hidden };
  const degree = /* @__PURE__ */ new Map();
  for (const relation of graph.relations) {
    degree.set(relation.from, ((_a = degree.get(relation.from)) != null ? _a : 0) + 1);
    degree.set(relation.to, ((_b = degree.get(relation.to)) != null ? _b : 0) + 1);
  }
  const hubs = new Set(
    [...degree].filter(([, count]) => count > limit).map(([path]) => path)
  );
  if (hubs.size === 0)
    return { graph, hidden };
  const relations = graph.relations.filter((relation) => {
    var _a2;
    if (relation.kind !== "mention")
      return true;
    const ends = [relation.from, relation.to].filter((path) => hubs.has(path));
    if (ends.length === 0)
      return true;
    for (const path of ends)
      hidden.set(path, ((_a2 = hidden.get(path)) != null ? _a2 : 0) + 1);
    return false;
  });
  return { graph: { ...graph, relations }, hidden };
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

// src/graph/validate.ts
function reaches(graph, from, to) {
  var _a;
  const outgoing = /* @__PURE__ */ new Map();
  for (const relation of graph.relations) {
    if (!isOrderingKind(relation.kind))
      continue;
    const list = outgoing.get(relation.from);
    if (list)
      list.push(relation.to);
    else
      outgoing.set(relation.from, [relation.to]);
  }
  const seen = /* @__PURE__ */ new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === to)
      return true;
    for (const next of (_a = outgoing.get(current)) != null ? _a : []) {
      if (seen.has(next))
        continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}
function rejectionReason(graph, draft) {
  if (draft.from.path === draft.to.path)
    return "A task cannot relate to itself.";
  const existing = graph.relations.find(
    (relation) => relation.kind !== "mention" && (relation.from === draft.from.path && relation.to === draft.to.path || relation.from === draft.to.path && relation.to === draft.from.path)
  );
  if (existing)
    return "These tasks are already related.";
  if (isOrderingKind(draft.kind) && reaches(graph, draft.to.path, draft.from.path)) {
    return "That would close a dependency cycle.";
  }
  return null;
}

// src/lib/relations.ts
var import_obsidian6 = require("obsidian");
function declaration(draft) {
  return draft.kind === "related" ? { owner: draft.from, target: draft.to } : { owner: draft.to, target: draft.from };
}
function wikilink(file) {
  return `[[${file.path.replace(/\.md$/, "")}]]`;
}
async function writeRelation(app, draft) {
  const { owner, target } = declaration(draft);
  const file = app.vault.getAbstractFileByPath(owner.path);
  const targetFile = app.vault.getAbstractFileByPath(target.path);
  if (!(file instanceof import_obsidian6.TFile) || !(targetFile instanceof import_obsidian6.TFile)) {
    throw new Error("Task file not found.");
  }
  const key = CANONICAL_RELATION_KEYS[draft.kind];
  const link = wikilink(targetFile);
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    const current = frontmatter[key];
    const values = Array.isArray(current) ? [...current] : current ? [current] : [];
    const already = values.some((value) => {
      const parsed = parseLinkTarget(value);
      return parsed !== null && parsed.split("/").pop() === targetFile.basename;
    });
    if (already)
      return;
    values.push(link);
    frontmatter[key] = values;
  });
}

// src/graph/grouping.ts
var GROUPING_LABELS = {
  status: "Status",
  milestone: "Milestone",
  priority: "Priority",
  none: "Nothing"
};
var STATUS_ORDER = ["todo", "doing", "review", "done"];
var PRIORITY_ORDER = ["high", "medium", "low"];
function rankOf(order, value) {
  const index = order.indexOf(value.toLowerCase());
  return index === -1 ? order.length : index;
}
var REFERENCE_GROUP = { key: "reference", label: "Reference notes", rank: 99 };
function grouperFor(mode) {
  if (mode !== "none") {
    const inner = grouperByField(mode);
    return (record) => record.kind === "reference" ? REFERENCE_GROUP : inner(record);
  }
  return () => ({ key: "", label: "", rank: 0 });
}
function grouperByField(mode) {
  if (mode === "status") {
    return (record) => ({
      key: record.status || "\u2014",
      label: record.status || "No status",
      rank: rankOf(STATUS_ORDER, record.status)
    });
  }
  if (mode === "priority") {
    return (record) => ({
      key: record.priority || "\u2014",
      label: record.priority || "No priority",
      rank: rankOf(PRIORITY_ORDER, record.priority)
    });
  }
  if (mode === "milestone") {
    return (record) => {
      var _a, _b;
      return {
        key: (_a = record.milestone) != null ? _a : "\u2014",
        label: (_b = record.milestone) != null ? _b : "No milestone",
        rank: record.milestone ? 0 : 1
      };
    };
  }
  return () => ({ key: "", label: "", rank: 0 });
}
function compareGroups(a, b) {
  if (a.rank !== b.rank)
    return a.rank - b.rank;
  return a.label.localeCompare(b.label, void 0, { numeric: true });
}

// src/graph/layout.ts
var DEFAULT_LAYOUT_OPTIONS = {
  nodeWidth: 210,
  nodeHeight: 76,
  layerGap: 76,
  rowGap: 22,
  componentGap: 56,
  dummyHeight: 14,
  headerHeight: 34,
  grouping: "status"
};
function undirectedAdjacency(relations) {
  const adjacency = /* @__PURE__ */ new Map();
  const push = (from, to) => {
    const list = adjacency.get(from);
    if (list)
      list.push(to);
    else
      adjacency.set(from, [to]);
  };
  for (const relation of relations) {
    push(relation.from, relation.to);
    push(relation.to, relation.from);
  }
  return adjacency;
}
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
function assignLayers(paths, edges, relations) {
  var _a, _b, _c, _d, _e, _f, _g;
  const layer = new Map(paths.map((path) => [path, 0]));
  const outgoing = /* @__PURE__ */ new Map();
  const inDegree = new Map(paths.map((path) => [path, 0]));
  const constrained = /* @__PURE__ */ new Set();
  for (const edge of edges) {
    const list = outgoing.get(edge.source);
    if (list)
      list.push(edge);
    else
      outgoing.set(edge.source, [edge]);
    inDegree.set(edge.target, ((_a = inDegree.get(edge.target)) != null ? _a : 0) + 1);
    constrained.add(edge.source);
    constrained.add(edge.target);
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
  spreadUnconstrained(paths, relations, layer, constrained);
  return layer;
}
function spreadUnconstrained(paths, relations, layer, constrained) {
  var _a, _b;
  const free = paths.filter((path) => !constrained.has(path));
  if (free.length === 0)
    return;
  const adjacency = undirectedAdjacency(relations);
  const settled = new Set(constrained);
  const queue = [...constrained].sort(
    (a, b) => {
      var _a2, _b2;
      return ((_a2 = layer.get(a)) != null ? _a2 : 0) - ((_b2 = layer.get(b)) != null ? _b2 : 0);
    }
  );
  const degreeOf = (path) => {
    var _a2;
    return ((_a2 = adjacency.get(path)) != null ? _a2 : []).length;
  };
  const pending = new Set(free.filter((path) => degreeOf(path) > 0));
  while (pending.size > 0) {
    if (queue.length === 0) {
      const root = [...pending].sort(
        (a, b) => degreeOf(b) - degreeOf(a) || a.localeCompare(b)
      )[0];
      layer.set(root, 0);
      settled.add(root);
      pending.delete(root);
      queue.push(root);
    }
    const current = queue.shift();
    for (const neighbour of (_a = adjacency.get(current)) != null ? _a : []) {
      if (settled.has(neighbour))
        continue;
      layer.set(neighbour, ((_b = layer.get(current)) != null ? _b : 0) + 1);
      settled.add(neighbour);
      pending.delete(neighbour);
      queue.push(neighbour);
    }
  }
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
function centreOf(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}
function sideTowards(node, towards) {
  const centre = centreOf(node);
  const dx = towards.x - centre.x;
  const dy = towards.y - centre.y;
  if (Math.abs(dx) >= node.width)
    return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}
function assignPorts(endpoints) {
  const groups = /* @__PURE__ */ new Map();
  for (const endpoint of endpoints) {
    const key = `${endpoint.node.record.path}|${endpoint.side}`;
    const group = groups.get(key);
    if (group)
      group.push(endpoint);
    else
      groups.set(key, [endpoint]);
  }
  for (const group of groups.values()) {
    const { node, side } = group[0];
    const vertical = side === "left" || side === "right";
    group.sort(
      (a, b) => vertical ? a.towards.y - b.towards.y : a.towards.x - b.towards.x
    );
    const span = vertical ? node.height : node.width;
    const inset = Math.min(10, span / 4);
    const usable = span - inset * 2;
    group.forEach((endpoint, index) => {
      const offset = inset + usable * (index + 1) / (group.length + 1);
      endpoint.point = vertical ? { x: side === "right" ? node.x + node.width : node.x, y: node.y + offset } : { x: node.x + offset, y: side === "bottom" ? node.y + node.height : node.y };
    });
  }
}
function layoutGraph(graph, options = DEFAULT_LAYOUT_OPTIONS) {
  var _a, _b, _c, _d, _e;
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
  const layerOf = assignLayers(paths, ordering, relations);
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
  const layoutGroups = [];
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
    const connect = (from, to) => {
      linkOf(from.key).next.push(to);
      linkOf(to.key).previous.push(from);
    };
    for (const edge of componentEdges) {
      const chain = [
        cells.get(edge.source),
        ...edge.dummies,
        cells.get(edge.target)
      ];
      for (let index = 0; index < chain.length - 1; index++) {
        connect(chain[index], chain[index + 1]);
      }
    }
    for (const relation of relations) {
      if (isOrderingKind(relation.kind))
        continue;
      if (!memberSet.has(relation.from) || !memberSet.has(relation.to))
        continue;
      const from = cells.get(relation.from);
      const to = cells.get(relation.to);
      if (to.layer - from.layer === 1)
        connect(from, to);
      else if (from.layer - to.layer === 1)
        connect(to, from);
    }
    for (const layer of layers) {
      layer.sort((a, b) => {
        var _a2, _b2, _c2, _d2;
        return ((_b2 = (_a2 = a.record) == null ? void 0 : _a2.title) != null ? _b2 : "").localeCompare((_d2 = (_c2 = b.record) == null ? void 0 : _c2.title) != null ? _d2 : "");
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
  const pending = [];
  const endpoints = [];
  const addEndpoint = (node, towards, side) => {
    const endpoint = { node, side, towards, point: centreOf(node) };
    endpoints.push(endpoint);
    return endpoint;
  };
  for (const edge of ordering) {
    const source = nodeByPath.get(edge.source);
    const target = nodeByPath.get(edge.target);
    if (!source || !target)
      continue;
    const waypoints = edge.dummies.map((dummy) => ({
      x: dummy.layer * step + options.nodeWidth / 2,
      y: dummy.y + dummy.height / 2
    }));
    const firstHop = (_d = waypoints[0]) != null ? _d : centreOf(target);
    const lastHop = (_e = waypoints[waypoints.length - 1]) != null ? _e : centreOf(source);
    pending.push({
      relation: edge.relation,
      cyclic: edge.cyclic,
      from: addEndpoint(source, firstHop, "right"),
      to: addEndpoint(target, lastHop, "left"),
      waypoints
    });
  }
  for (const relation of relations) {
    if (isOrderingKind(relation.kind))
      continue;
    const from = nodeByPath.get(relation.from);
    const to = nodeByPath.get(relation.to);
    if (!from || !to)
      continue;
    pending.push({
      relation,
      cyclic: false,
      from: addEndpoint(from, centreOf(to), sideTowards(from, centreOf(to))),
      to: addEndpoint(to, centreOf(from), sideTowards(to, centreOf(from))),
      waypoints: []
    });
  }
  assignPorts(endpoints);
  for (const edge of pending) {
    const points = [edge.from.point, ...edge.waypoints, edge.to.point];
    layoutEdges.push({
      relation: edge.relation,
      points: edge.cyclic ? [...points].reverse() : points,
      cyclic: edge.cyclic
    });
  }
  let unlinkedTop = null;
  if (unlinked.length > 0) {
    if (layoutNodes.length > 0)
      top += options.componentGap;
    unlinkedTop = top;
    const columns = Math.max(4, maxLayers);
    const gridWidth = columns * step - options.layerGap;
    const grouper = grouperFor(options.grouping);
    const buckets = /* @__PURE__ */ new Map();
    for (const path of unlinked) {
      const record = records.get(path);
      const group = grouper(record);
      const bucket = buckets.get(group.key);
      if (bucket)
        bucket.records.push(record);
      else
        buckets.set(group.key, { group, records: [record] });
    }
    const ordered = [...buckets.values()].sort((a, b) => compareGroups(a.group, b.group));
    for (const bucket of ordered) {
      if (bucket.group.label) {
        layoutGroups.push({ label: bucket.group.label, x: 0, y: top, width: gridWidth });
        top += options.headerHeight;
      }
      bucket.records.sort((a, b) => a.title.localeCompare(b.title));
      bucket.records.forEach((record, index) => {
        layoutNodes.push({
          record,
          x: index % columns * step,
          y: top + Math.floor(index / columns) * (options.nodeHeight + options.rowGap),
          width: options.nodeWidth,
          height: options.nodeHeight,
          layer: index % columns,
          unlinked: true
        });
      });
      const rows = Math.ceil(bucket.records.length / columns);
      top += rows * (options.nodeHeight + options.rowGap) + options.componentGap;
    }
  }
  const width = layoutNodes.reduce((max, node) => Math.max(max, node.x + node.width), 0);
  const height = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.height), 0);
  return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, width, height, unlinkedTop };
}

// src/lib/notes.ts
var ID_PATTERN = /^(.*?)\s+-\s+([A-Za-z0-9]+)$/;
function splitBasename(basename) {
  const match = basename.match(ID_PATTERN);
  return match ? { title: match[1], id: match[2] } : { title: basename, id: "" };
}
function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function readNote(app, file, kind) {
  var _a, _b, _c, _d, _e;
  const cache = app.metadataCache.getFileCache(file);
  const frontmatter = (_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : {};
  const { title, id } = splitBasename(file.basename);
  const projectTarget = parseLinkTarget(frontmatter.project);
  const projectFile = projectTarget ? app.metadataCache.getFirstLinkpathDest(projectTarget, file.path) : null;
  return {
    kind,
    path: file.path,
    basename: file.basename,
    title,
    id,
    projectPath: (_b = projectFile == null ? void 0 : projectFile.path) != null ? _b : null,
    projectName: (_d = (_c = projectFile == null ? void 0 : projectFile.basename) != null ? _c : projectTarget == null ? void 0 : projectTarget.split("/").pop()) != null ? _d : null,
    status: kind === "task" ? stringValue(frontmatter.tstatus) || "Todo" : "",
    priority: stringValue(frontmatter.priority),
    milestone: stringValue(frontmatter.milestone) || null,
    frontmatter,
    links: ((_e = cache == null ? void 0 : cache.links) != null ? _e : []).map((link) => link.link)
  };
}
function collectNotes(app, settings, options) {
  const taskPrefix = `${tasksPath(settings)}/`;
  const referencePrefix = `${referencesPath(settings)}/`;
  const records = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (file.path.startsWith(taskPrefix)) {
      records.push(readNote(app, file, "task"));
    } else if (options.references && file.path.startsWith(referencePrefix)) {
      records.push(readNote(app, file, "reference"));
    }
  }
  return records;
}
function createNoteResolver(app, records) {
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
var import_obsidian7 = require("obsidian");

// src/graph/force.ts
var DEFAULT_FORCE_OPTIONS = {
  charge: -1400,
  linkStrength: 0.12,
  anchorStrength: 0.06,
  centreStrength: 0.04,
  velocityDecay: 0.62,
  alphaDecay: 0.022,
  alphaMin: 8e-3,
  padding: 26,
  maxVelocity: 60
};
var COLLISION_PASSES = 4;
var LINK_DISTANCE = {
  dependency: 280,
  continuation: 260,
  related: 320,
  mention: 360
};
var ForceSimulation = class {
  constructor(layout, relations, options = DEFAULT_FORCE_OPTIONS) {
    this.options = options;
    this.nodes = [];
    this.index = /* @__PURE__ */ new Map();
    this.links = [];
    this.alpha = 1;
    this.centre = { x: 0, y: 0 };
    for (const node of layout.nodes) {
      const entry = {
        path: node.record.path,
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
        vx: 0,
        vy: 0,
        width: node.width,
        height: node.height,
        anchorX: node.unlinked ? null : node.x + node.width / 2,
        fixed: false
      };
      this.nodes.push(entry);
      this.index.set(entry.path, entry);
    }
    for (const relation of relations) {
      const source = this.index.get(relation.from);
      const target = this.index.get(relation.to);
      if (!source || !target)
        continue;
      this.links.push({ source, target, distance: LINK_DISTANCE[relation.kind] });
    }
    if (this.nodes.length > 0) {
      this.centre = {
        x: this.nodes.reduce((sum, node) => sum + node.x, 0) / this.nodes.length,
        y: this.nodes.reduce((sum, node) => sum + node.y, 0) / this.nodes.length
      };
    }
  }
  get running() {
    return this.alpha > this.options.alphaMin;
  }
  get(path) {
    return this.index.get(path);
  }
  reheat(alpha = 0.5) {
    this.alpha = Math.max(this.alpha, alpha);
  }
  setAlpha(alpha) {
    this.alpha = alpha;
  }
  pin(path, x, y) {
    const node = this.index.get(path);
    if (!node)
      return;
    node.fixed = true;
    node.x = x;
    node.y = y;
    node.vx = 0;
    node.vy = 0;
  }
  unpinAll() {
    for (const node of this.nodes)
      node.fixed = false;
    this.reheat(0.6);
  }
  get pinnedCount() {
    return this.nodes.filter((node) => node.fixed).length;
  }
  tick() {
    if (!this.running)
      return;
    this.alpha *= 1 - this.options.alphaDecay;
    this.applyLinks();
    this.applyCharge();
    this.applyAnchors();
    this.integrate();
    this.resolveCollisions();
    this.recentre();
  }
  applyLinks() {
    const strength = this.options.linkStrength * this.alpha;
    for (const link of this.links) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const spread = Math.max(1, Math.hypot(dx, dy));
      const push = (spread - link.distance) / spread * strength;
      const fx = dx * push;
      const fy = dy * push;
      link.source.vx += fx;
      link.source.vy += fy;
      link.target.vx -= fx;
      link.target.vy -= fy;
    }
  }
  applyCharge() {
    const charge = this.options.charge * this.alpha;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let squared = dx * dx + dy * dy;
        if (squared < 1) {
          dx = i % 7 - 3;
          dy = j % 7 - 3;
          squared = Math.max(1, dx * dx + dy * dy);
        }
        const distance2 = Math.sqrt(squared);
        const magnitude = charge / Math.max(squared, 400);
        const fx = dx / distance2 * magnitude;
        const fy = dy / distance2 * magnitude;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
  }
  applyAnchors() {
    const anchor = this.options.anchorStrength * this.alpha;
    for (const node of this.nodes) {
      if (node.anchorX === null)
        continue;
      node.vx += (node.anchorX - node.x) * anchor;
    }
  }
  integrate() {
    const { velocityDecay, maxVelocity } = this.options;
    for (const node of this.nodes) {
      if (node.fixed) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx = Math.max(-maxVelocity, Math.min(maxVelocity, node.vx * velocityDecay));
      node.vy = Math.max(-maxVelocity, Math.min(maxVelocity, node.vy * velocityDecay));
      node.x += node.vx;
      node.y += node.vy;
    }
  }
  resolveCollisions() {
    const padding = this.options.padding;
    for (let pass = 0; pass < COLLISION_PASSES; pass++) {
      let separated = 0;
      for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const b = this.nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
          const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0)
            continue;
          separated++;
          const movable = (a.fixed ? 0 : 1) + (b.fixed ? 0 : 1);
          if (movable === 0)
            continue;
          const horizontal = overlapX < overlapY;
          const overlap = horizontal ? overlapX : overlapY;
          const direction = (horizontal ? dx : dy) >= 0 ? 1 : -1;
          const shift = overlap * direction / movable;
          if (horizontal) {
            if (!a.fixed)
              a.x -= shift;
            if (!b.fixed)
              b.x += shift;
          } else {
            if (!a.fixed)
              a.y -= shift;
            if (!b.fixed)
              b.y += shift;
          }
        }
      }
      if (separated === 0)
        return;
    }
  }
  recentre() {
    if (this.nodes.length === 0)
      return;
    let sumX = 0;
    let sumY = 0;
    for (const node of this.nodes) {
      sumX += node.x;
      sumY += node.y;
    }
    const shiftX = (this.centre.x - sumX / this.nodes.length) * this.options.centreStrength;
    const shiftY = (this.centre.y - sumY / this.nodes.length) * this.options.centreStrength;
    for (const node of this.nodes) {
      if (node.fixed)
        continue;
      node.x += shiftX;
      node.y += shiftY;
    }
  }
  bounds() {
    if (this.nodes.length === 0)
      return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
};

// src/views/CanvasGestures.ts
var MIN_SCALE = 0.05;
var MAX_SCALE = 3;
var TAP_MOVEMENT = 10;
var TAP_DURATION = 600;
var FRICTION = 0.93;
var MIN_VELOCITY = 0.03;
var RECT_TTL = 250;
var ANIMATION_MS = 260;
var LONG_PRESS_MS = 550;
function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
var CanvasGestures = class {
  constructor(element, handlers) {
    this.element = element;
    this.handlers = handlers;
    this.transform = { x: 0, y: 0, k: 1 };
    this.pointers = /* @__PURE__ */ new Map();
    this.mode = "none";
    this.draggedNode = null;
    this.pinchDistance = 0;
    this.pinchCentre = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.lastMove = 0;
    this.moved = 0;
    this.tapStart = 0;
    this.inertiaFrame = 0;
    this.animationFrame = 0;
    this.renderFrame = 0;
    this.rect = null;
    this.rectTime = 0;
    this.longPress = null;
    this.onPointerDown = (event) => {
      if (event.button !== 0 && event.button !== 1)
        return;
      this.stopMotion();
      this.element.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, this.local(event));
      if (this.pointers.size === 1) {
        const graphPoint = this.toGraph(this.local(event));
        this.draggedNode = this.handlers.nodeAt(graphPoint);
        this.mode = this.draggedNode ? "node" : "pan";
        this.moved = 0;
        this.tapStart = performance.now();
        this.lastMove = this.tapStart;
        this.velocity = { x: 0, y: 0 };
        if (this.draggedNode) {
          this.handlers.onNodeDrag(this.draggedNode, graphPoint, "start");
        } else {
          this.handlers.onGesture(true);
        }
        if (event.pointerType !== "mouse")
          this.armLongPress(this.local(event));
      } else if (this.pointers.size === 2) {
        this.cancelLongPress();
        this.endNodeDrag();
        const [a, b] = [...this.pointers.values()];
        this.mode = "pinch";
        this.pinchDistance = distance(a, b);
        this.pinchCentre = midpoint(a, b);
        this.velocity = { x: 0, y: 0 };
      }
    };
    this.onPointerMove = (event) => {
      const previous = this.pointers.get(event.pointerId);
      const point = this.local(event);
      if (!previous) {
        if (this.mode === "none" && event.pointerType === "mouse") {
          this.handlers.onHover(this.toGraph(point));
        }
        return;
      }
      this.pointers.set(event.pointerId, point);
      if (this.mode === "node" && this.draggedNode) {
        this.moved += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
        if (this.moved > TAP_MOVEMENT)
          this.cancelLongPress();
        this.handlers.onNodeDrag(this.draggedNode, this.toGraph(point), "move");
        return;
      }
      if (this.mode === "pan") {
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const now = performance.now();
        const elapsed = Math.max(1, now - this.lastMove);
        this.lastMove = now;
        this.moved += Math.abs(dx) + Math.abs(dy);
        if (this.moved > TAP_MOVEMENT)
          this.cancelLongPress();
        this.velocity = {
          x: this.velocity.x * 0.3 + dx / elapsed * 0.7,
          y: this.velocity.y * 0.3 + dy / elapsed * 0.7
        };
        this.transform.x += dx;
        this.transform.y += dy;
        this.schedule();
        return;
      }
      if (this.mode === "pinch" && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const spread = distance(a, b);
        const centre = midpoint(a, b);
        if (this.pinchDistance > 0) {
          this.transform = this.scaled(spread / this.pinchDistance, this.pinchCentre);
        }
        this.transform.x += centre.x - this.pinchCentre.x;
        this.transform.y += centre.y - this.pinchCentre.y;
        this.pinchDistance = spread;
        this.pinchCentre = centre;
        this.schedule();
      }
    };
    this.onPointerUp = (event) => {
      this.cancelLongPress();
      if (!this.pointers.has(event.pointerId))
        return;
      const point = this.local(event);
      this.pointers.delete(event.pointerId);
      if (this.element.hasPointerCapture(event.pointerId)) {
        this.element.releasePointerCapture(event.pointerId);
      }
      if (this.pointers.size === 1) {
        const remaining = [...this.pointers.values()][0];
        this.mode = "pan";
        this.moved = TAP_MOVEMENT + 1;
        this.lastMove = performance.now();
        this.velocity = { x: 0, y: 0 };
        this.pinchCentre = remaining;
        return;
      }
      if (this.pointers.size > 0)
        return;
      const wasTap = this.mode !== "pinch" && this.moved <= TAP_MOVEMENT && performance.now() - this.tapStart <= TAP_DURATION;
      const wasNodeDrag = this.mode === "node";
      this.endNodeDrag(this.toGraph(point));
      this.mode = "none";
      this.handlers.onGesture(false);
      if (wasTap)
        this.handlers.onTap(this.toGraph(point), event);
      else if (!wasNodeDrag)
        this.startInertia();
    };
    this.onPointerLeave = (event) => {
      if (this.pointers.size === 0 && event.pointerType === "mouse") {
        this.handlers.onHover(null);
      }
    };
    this.onWheel = (event) => {
      event.preventDefault();
      this.stopMotion();
      this.transform = this.scaled(Math.pow(0.999, event.deltaY), this.local(event));
      this.schedule();
    };
    this.onContextMenu = (event) => {
      event.preventDefault();
      this.cancelLongPress();
      const point = this.local(event);
      this.handlers.onContextMenu(this.toGraph(point), { x: event.clientX, y: event.clientY });
    };
    this.onDoubleClick = (event) => {
      event.preventDefault();
      this.handlers.onDoubleClick(this.toGraph(this.local(event)));
    };
    this.onTouchStart = (event) => {
      event.stopPropagation();
    };
    this.onTouchMove = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    element.addEventListener("wheel", this.onWheel, { passive: false });
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerUp);
    element.addEventListener("pointerleave", this.onPointerLeave);
    element.addEventListener("dblclick", this.onDoubleClick);
    element.addEventListener("contextmenu", this.onContextMenu);
    element.addEventListener("touchstart", this.onTouchStart, { passive: false });
    element.addEventListener("touchmove", this.onTouchMove, { passive: false });
  }
  destroy() {
    this.stopMotion();
    if (this.renderFrame)
      cancelAnimationFrame(this.renderFrame);
    this.element.removeEventListener("wheel", this.onWheel);
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("pointerleave", this.onPointerLeave);
    this.element.removeEventListener("dblclick", this.onDoubleClick);
    this.element.removeEventListener("contextmenu", this.onContextMenu);
    this.cancelLongPress();
    this.element.removeEventListener("touchstart", this.onTouchStart);
    this.element.removeEventListener("touchmove", this.onTouchMove);
  }
  invalidateBounds() {
    this.rect = null;
  }
  get bounds() {
    const now = performance.now();
    if (!this.rect || now - this.rectTime > RECT_TTL) {
      this.rect = this.element.getBoundingClientRect();
      this.rectTime = now;
    }
    return this.rect;
  }
  toGraph(point) {
    return {
      x: (point.x - this.transform.x) / this.transform.k,
      y: (point.y - this.transform.y) / this.transform.k
    };
  }
  toClient(point) {
    const bounds = this.bounds;
    return {
      x: point.x * this.transform.k + this.transform.x + bounds.left,
      y: point.y * this.transform.k + this.transform.y + bounds.top
    };
  }
  moveTo(target, animate) {
    this.stopMotion();
    if (!animate) {
      this.transform = { ...target };
      this.schedule();
      return;
    }
    const from = { ...this.transform };
    const start = performance.now();
    const step = () => {
      const progress = Math.min(1, (performance.now() - start) / ANIMATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.transform = {
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        k: from.k + (target.k - from.k) * eased
      };
      this.apply();
      this.animationFrame = progress < 1 ? requestAnimationFrame(step) : 0;
    };
    this.animationFrame = requestAnimationFrame(step);
  }
  zoomBy(factor, animate = true) {
    const bounds = this.bounds;
    const anchor = { x: bounds.width / 2, y: bounds.height / 2 };
    this.moveTo(this.scaled(factor, anchor), animate);
  }
  fit(area, padding, animate) {
    const bounds = this.bounds;
    const scale = Math.min(
      (bounds.width - padding * 2) / Math.max(area.width, 1),
      (bounds.height - padding * 2) / Math.max(area.height, 1),
      1
    );
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.moveTo(
      {
        k,
        x: (bounds.width - area.width * k) / 2 - area.x * k,
        y: (bounds.height - area.height * k) / 2 - area.y * k
      },
      animate
    );
  }
  scaled(factor, anchor) {
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.transform.k * factor));
    const ratio = k / this.transform.k;
    return {
      k,
      x: anchor.x - (anchor.x - this.transform.x) * ratio,
      y: anchor.y - (anchor.y - this.transform.y) * ratio
    };
  }
  local(event) {
    const bounds = this.bounds;
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }
  apply() {
    this.handlers.onTransform(this.transform);
  }
  schedule() {
    if (this.renderFrame)
      return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = 0;
      this.apply();
    });
  }
  stopMotion() {
    if (this.inertiaFrame)
      cancelAnimationFrame(this.inertiaFrame);
    if (this.animationFrame)
      cancelAnimationFrame(this.animationFrame);
    this.inertiaFrame = 0;
    this.animationFrame = 0;
  }
  startInertia() {
    if (Math.hypot(this.velocity.x, this.velocity.y) < MIN_VELOCITY)
      return;
    let previous = performance.now();
    const step = () => {
      const now = performance.now();
      const elapsed = Math.min(32, now - previous);
      previous = now;
      this.transform.x += this.velocity.x * elapsed;
      this.transform.y += this.velocity.y * elapsed;
      this.velocity.x *= Math.pow(FRICTION, elapsed / 16);
      this.velocity.y *= Math.pow(FRICTION, elapsed / 16);
      this.apply();
      this.inertiaFrame = Math.hypot(this.velocity.x, this.velocity.y) > MIN_VELOCITY ? requestAnimationFrame(step) : 0;
    };
    this.inertiaFrame = requestAnimationFrame(step);
  }
  endNodeDrag(point) {
    if (!this.draggedNode)
      return;
    this.handlers.onNodeDrag(this.draggedNode, point != null ? point : { x: 0, y: 0 }, "end");
    this.draggedNode = null;
  }
  cancelLongPress() {
    if (this.longPress !== null)
      clearTimeout(this.longPress);
    this.longPress = null;
  }
  armLongPress(point) {
    this.cancelLongPress();
    this.longPress = setTimeout(() => {
      this.longPress = null;
      this.endNodeDrag(this.toGraph(point));
      this.mode = "none";
      this.pointers.clear();
      this.handlers.onGesture(false);
      this.handlers.onContextMenu(this.toGraph(point), this.toClient(this.toGraph(point)));
    }, LONG_PRESS_MS);
  }
};

// src/views/FlowCanvas.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var FIT_PADDING = 32;
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
function borderPoint(node, towards) {
  const dx = towards.x - node.x;
  const dy = towards.y - node.y;
  if (dx === 0 && dy === 0)
    return { x: node.x, y: node.y };
  const scaleX = dx === 0 ? Infinity : node.width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : node.height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}
function isUndirected(edge) {
  return edge.relation.kind === "related" || edge.relation.kind === "mention";
}
function edgePath(edge) {
  const points = edge.points;
  if (points.length < 2)
    return "";
  if (isUndirected(edge))
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
    this.layout = null;
    this.nodeElements = /* @__PURE__ */ new Map();
    this.edgeElements = [];
    this.neighbours = /* @__PURE__ */ new Map();
    this.hitAreas = [];
    this.hovered = null;
    this.pendingFit = false;
    this.mode = "flow";
    this.simulation = null;
    this.simulationFrame = 0;
    this.grabOffset = { x: 0, y: 0 };
    this.connecting = false;
    this.connectFrom = null;
    this.ghost = null;
    this.dropTarget = null;
    this.svg = svgEl("svg", { class: "spm-flow-svg" });
    this.svg.appendChild(this.buildDefs());
    this.viewport = svgEl("g", { class: "spm-flow-viewport" });
    this.edgeLayer = svgEl("g", { class: "spm-flow-edges" });
    this.nodeLayer = svgEl("g", { class: "spm-flow-nodes" });
    this.viewport.appendChild(this.edgeLayer);
    this.viewport.appendChild(this.nodeLayer);
    this.svg.appendChild(this.viewport);
    this.container.appendChild(this.svg);
    this.gestures = new CanvasGestures(this.svg, {
      onTransform: (transform) => this.applyTransform(transform),
      onTap: (point, event) => this.onTap(point, event),
      onHover: (point) => this.onHover(point),
      onGesture: (active) => this.svg.toggleClass("is-panning", active),
      onDoubleClick: (point) => this.onDoubleClick(point),
      nodeAt: (point) => this.mode === "force" || this.connecting ? this.hitTest(point) : null,
      onNodeDrag: (path, point, phase) => this.onNodeDrag(path, point, phase),
      onContextMenu: (point, client) => this.handlers.onMenu(this.hitTest(point), client)
    });
    this.observer = new ResizeObserver(() => {
      this.gestures.invalidateBounds();
      if (this.pendingFit)
        this.fit(false);
    });
    this.observer.observe(this.container);
  }
  destroy() {
    this.stopSimulation();
    this.observer.disconnect();
    this.gestures.destroy();
    this.svg.remove();
  }
  render(layout, options) {
    this.layout = layout;
    this.mode = options.mode;
    this.edgeLayer.empty();
    this.edgeElements = [];
    this.neighbours.clear();
    this.hitAreas = [];
    this.hovered = null;
    if (this.mode === "flow") {
      if (layout.unlinkedTop !== null) {
        this.edgeLayer.appendChild(this.buildUnlinkedDivider(layout));
      }
      for (const group of layout.groups) {
        this.edgeLayer.appendChild(this.buildGroupHeader(group));
      }
    }
    for (const edge of layout.edges) {
      this.edgeLayer.appendChild(this.buildEdge(edge));
      this.link(edge.relation.from, edge.relation.to);
    }
    const previous = this.nodeElements;
    this.nodeElements = /* @__PURE__ */ new Map();
    for (const node of layout.nodes) {
      this.nodeElements.set(node.record.path, this.renderNode(node, previous));
      this.hitAreas.push({
        path: node.record.path,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      });
    }
    for (const orphan of previous.values())
      orphan.remove();
    this.setupSimulation(layout, options.relations);
    if (options.fit)
      this.fit(false);
  }
  fit(animate = true) {
    const layout = this.layout;
    if (!layout || layout.nodes.length === 0)
      return;
    const bounds = this.container.getBoundingClientRect();
    if (bounds.width < 50 || bounds.height < 50) {
      this.pendingFit = true;
      return;
    }
    this.pendingFit = false;
    const area = this.simulation && this.mode === "force" ? this.simulation.bounds() : { x: 0, y: 0, width: layout.width, height: layout.height };
    this.gestures.fit(area, FIT_PADDING, animate);
  }
  unpinAll() {
    if (!this.simulation)
      return;
    this.simulation.unpinAll();
    this.startSimulation();
  }
  get pinnedCount() {
    var _a, _b;
    return (_b = (_a = this.simulation) == null ? void 0 : _a.pinnedCount) != null ? _b : 0;
  }
  setupSimulation(layout, relations) {
    this.stopSimulation();
    if (this.mode !== "force") {
      this.simulation = null;
      this.nodeLayer.removeClass("is-simulating");
      return;
    }
    const previous = this.simulation;
    const simulation = new ForceSimulation(layout, relations);
    let carriedNodes = 0;
    for (const node of simulation.nodes) {
      const carried = previous == null ? void 0 : previous.get(node.path);
      if (!carried)
        continue;
      node.x = carried.x;
      node.y = carried.y;
      node.fixed = carried.fixed;
      carriedNodes++;
    }
    if (carriedNodes > 0)
      simulation.setAlpha(0.35);
    this.simulation = simulation;
    this.nodeLayer.addClass("is-simulating");
    this.startSimulation();
  }
  startSimulation() {
    if (!this.simulation || this.simulationFrame)
      return;
    const step = () => {
      const simulation = this.simulation;
      if (!simulation) {
        this.simulationFrame = 0;
        return;
      }
      simulation.tick();
      this.updateSimulatedPositions();
      this.simulationFrame = simulation.running ? requestAnimationFrame(step) : 0;
    };
    this.simulationFrame = requestAnimationFrame(step);
  }
  stopSimulation() {
    if (this.simulationFrame)
      cancelAnimationFrame(this.simulationFrame);
    this.simulationFrame = 0;
  }
  updateSimulatedPositions() {
    const simulation = this.simulation;
    if (!simulation)
      return;
    this.hitAreas = [];
    for (const node of simulation.nodes) {
      const element = this.nodeElements.get(node.path);
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;
      element == null ? void 0 : element.setAttribute("transform", `translate(${x} ${y})`);
      this.hitAreas.push({ path: node.path, x, y, width: node.width, height: node.height });
    }
    for (const edge of this.edgeElements) {
      const from = simulation.get(edge.from);
      const to = simulation.get(edge.to);
      if (!from || !to)
        continue;
      edge.element.setAttribute(
        "d",
        curveBetween(borderPoint(from, to), borderPoint(to, from))
      );
    }
  }
  setConnecting(connecting) {
    this.connecting = connecting;
    this.svg.toggleClass("is-connecting", connecting);
  }
  nodeCentre(path) {
    const area = this.hitAreas.find((entry) => entry.path === path);
    return area ? { x: area.x + area.width / 2, y: area.y + area.height / 2 } : null;
  }
  markDropTarget(path) {
    var _a, _b;
    if (path === this.dropTarget)
      return;
    if (this.dropTarget)
      (_a = this.nodeElements.get(this.dropTarget)) == null ? void 0 : _a.removeClass("is-drop-target");
    if (path)
      (_b = this.nodeElements.get(path)) == null ? void 0 : _b.addClass("is-drop-target");
    this.dropTarget = path;
  }
  onConnectDrag(path, point, phase) {
    var _a, _b;
    if (phase === "start") {
      this.connectFrom = path;
      this.ghost = svgEl("path", { class: "spm-flow-edge is-ghost" });
      this.edgeLayer.appendChild(this.ghost);
      return;
    }
    const from = this.connectFrom ? this.nodeCentre(this.connectFrom) : null;
    if (!from || !this.connectFrom)
      return;
    if (phase === "move") {
      const target2 = this.hitTest(point);
      this.markDropTarget(target2 === this.connectFrom ? null : target2);
      (_a = this.ghost) == null ? void 0 : _a.setAttribute("d", curveBetween(from, point));
      return;
    }
    const target = this.hitTest(point);
    const source = this.connectFrom;
    (_b = this.ghost) == null ? void 0 : _b.remove();
    this.ghost = null;
    this.connectFrom = null;
    this.markDropTarget(null);
    if (target && target !== source) {
      this.handlers.onConnect(source, target, this.gestures.toClient(point));
    }
  }
  onNodeDrag(path, point, phase) {
    if (this.connecting) {
      this.onConnectDrag(path, point, phase);
      return;
    }
    const simulation = this.simulation;
    const node = simulation == null ? void 0 : simulation.get(path);
    if (!simulation || !node)
      return;
    if (phase === "start") {
      this.grabOffset = { x: node.x - point.x, y: node.y - point.y };
      simulation.pin(path, node.x, node.y);
      simulation.reheat(0.3);
      this.startSimulation();
      return;
    }
    if (phase === "move") {
      simulation.pin(path, point.x + this.grabOffset.x, point.y + this.grabOffset.y);
      simulation.reheat(0.3);
      this.startSimulation();
    }
  }
  zoomBy(factor) {
    this.gestures.zoomBy(factor);
  }
  applyTransform(transform) {
    this.viewport.setAttribute(
      "transform",
      `translate(${transform.x} ${transform.y}) scale(${transform.k})`
    );
  }
  hitTest(point) {
    for (let index = this.hitAreas.length - 1; index >= 0; index--) {
      const area = this.hitAreas[index];
      if (point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height) {
        return area.path;
      }
    }
    return null;
  }
  onTap(point, event) {
    const path = this.hitTest(point);
    if (path)
      this.handlers.onOpenTask(path, event);
  }
  onHover(point) {
    const path = point ? this.hitTest(point) : null;
    if (path === this.hovered)
      return;
    this.hovered = path;
    if (path)
      this.highlight(path);
    else
      this.clearHighlight();
  }
  onDoubleClick(point) {
    if (this.hitTest(point))
      return;
    this.gestures.zoomBy(1.6);
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
  buildGroupHeader(group) {
    const element = svgEl("g", { class: "spm-flow-group" });
    const label = svgEl("text", { x: "2", y: String(group.y + 20) });
    label.textContent = group.label;
    element.appendChild(label);
    element.appendChild(
      svgEl("line", {
        x1: "0",
        y1: String(group.y + 28),
        x2: String(group.width),
        y2: String(group.y + 28)
      })
    );
    return element;
  }
  buildEdge(edge) {
    const kind = edge.cyclic ? "cycle" : edge.relation.kind;
    const path = svgEl("path", {
      class: `spm-flow-edge is-${kind}`,
      d: edgePath(edge)
    });
    if (!isUndirected(edge)) {
      path.setAttribute("marker-end", `url(#spm-arrow-${kind})`);
    }
    this.edgeElements.push({ element: path, from: edge.relation.from, to: edge.relation.to });
    return path;
  }
  renderNode(node, previous) {
    const record = node.record;
    const existing = previous.get(record.path);
    previous.delete(record.path);
    const group = existing != null ? existing : svgEl("g", { class: "spm-flow-node is-entering" });
    group.empty();
    if (!existing)
      this.nodeLayer.appendChild(group);
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);
    const holder = svgEl("foreignObject", {
      x: "0",
      y: "0",
      width: String(node.width),
      height: String(node.height)
    });
    const card = document.createElement("div");
    card.className = "spm-flow-card";
    card.dataset.status = statusSlug(record.status);
    card.dataset.kind = record.kind;
    if (node.unlinked)
      card.addClass("is-unlinked");
    if (record.external)
      card.addClass("is-external");
    const title = card.createDiv({ cls: "spm-flow-card-title", text: record.title });
    title.setAttribute("title", record.title);
    const meta = card.createDiv({ cls: "spm-flow-card-meta" });
    if (record.kind === "reference") {
      meta.createSpan({ cls: "spm-flow-chip is-reference", text: "Reference" });
    } else {
      meta.createSpan({ cls: "spm-flow-chip is-status", text: record.status });
    }
    if (record.priority) {
      meta.createSpan({ cls: `spm-flow-chip is-priority is-${record.priority}`, text: record.priority });
    }
    if (record.milestone) {
      meta.createSpan({ cls: "spm-flow-chip", text: record.milestone });
    }
    if (record.external && record.projectName) {
      meta.createSpan({ cls: "spm-flow-chip", text: record.projectName });
    }
    if (record.hiddenMentions) {
      meta.createSpan({
        cls: "spm-flow-chip is-collapsed",
        text: `+${record.hiddenMentions} mentions`
      });
    }
    holder.appendChild(card);
    group.appendChild(holder);
    (0, import_obsidian7.setTooltip)(card, this.tooltipFor(node), { delay: 400 });
    return group;
  }
  tooltipFor(node) {
    const record = node.record;
    const lines = [record.title];
    if (record.kind === "reference")
      lines.push("Reference note");
    else
      lines.push(`Status: ${record.status}`);
    if (record.priority)
      lines.push(`Priority: ${record.priority}`);
    if (record.milestone)
      lines.push(`Milestone: ${record.milestone}`);
    if (record.projectName)
      lines.push(`Project: ${record.projectName}`);
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
    const related = (_a = this.neighbours.get(path)) != null ? _a : /* @__PURE__ */ new Set();
    for (const [nodePath, element] of this.nodeElements) {
      const active = nodePath === path || related.has(nodePath);
      element.toggleClass("is-faded", !active);
      element.toggleClass("is-focus", nodePath === path);
    }
    for (const edge of this.edgeElements) {
      const active = edge.from === path || edge.to === path;
      edge.element.toggleClass("is-faded", !active);
      edge.element.toggleClass("is-active", active);
    }
  }
  clearHighlight() {
    for (const element of this.nodeElements.values()) {
      element.removeClass("is-faded");
      element.removeClass("is-focus");
    }
    for (const edge of this.edgeElements) {
      edge.element.removeClass("is-faded");
      edge.element.removeClass("is-active");
    }
  }
};

// src/views/FlowView.ts
var FLOW_VIEW_TYPE = "simpromana-flow";
var LEGEND = [
  { kind: "dependency", label: RELATION_LABELS.dependency },
  { kind: "continuation", label: RELATION_LABELS.continuation },
  { kind: "related", label: RELATION_LABELS.related },
  { kind: "mention", label: RELATION_LABELS.mention }
];
var HUB_LIMITS = [
  { value: 0, label: "Keep every mention" },
  { value: 8, label: "Collapse hubs over 8" },
  { value: 12, label: "Collapse hubs over 12" },
  { value: 20, label: "Collapse hubs over 20" }
];
var MODE_LABELS = {
  flow: "Flow layout",
  force: "Force graph"
};
var FlowView = class extends import_obsidian8.ItemView {
  constructor(leaf, settings) {
    super(leaf);
    this.settings = settings;
    this.projectPath = null;
    this.hideDone = false;
    this.showUnlinked = false;
    this.mentions = true;
    this.references = false;
    this.grouping = "status";
    this.mode = "flow";
    this.hubLimit = 12;
    this.hiddenByProject = {};
    this.toggles = /* @__PURE__ */ new Map();
    this.canvas = null;
    this.connecting = false;
    this.graph = { nodes: [], relations: [], unresolved: [] };
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
      onOpenTask: (path, event) => this.openTask(path, event),
      onConnect: (from, to, client) => this.offerRelation(from, to, client),
      onMenu: (path, client) => this.showMenu(path, client)
    });
    const refresh = (0, import_obsidian8.debounce)(() => this.render(false), 400, true);
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
      showUnlinked: this.showUnlinked,
      mentions: this.mentions,
      references: this.references,
      grouping: this.grouping,
      mode: this.mode,
      hubLimit: this.hubLimit,
      hiddenByProject: this.hiddenByProject
    };
  }
  get hidden() {
    var _a;
    return this.projectPath ? (_a = this.hiddenByProject[this.projectPath]) != null ? _a : [] : [];
  }
  setHidden(paths) {
    if (!this.projectPath)
      return;
    if (paths.length > 0)
      this.hiddenByProject[this.projectPath] = paths;
    else
      delete this.hiddenByProject[this.projectPath];
    this.app.workspace.requestSaveLayout();
    this.render(false);
  }
  async setState(state, result) {
    const next = state != null ? state : {};
    if (typeof next.projectPath === "string")
      this.projectPath = next.projectPath;
    if (typeof next.hideDone === "boolean")
      this.hideDone = next.hideDone;
    if (typeof next.showUnlinked === "boolean")
      this.showUnlinked = next.showUnlinked;
    if (typeof next.mentions === "boolean")
      this.mentions = next.mentions;
    if (typeof next.references === "boolean")
      this.references = next.references;
    if (typeof next.grouping === "string")
      this.grouping = next.grouping;
    if (next.mode === "flow" || next.mode === "force")
      this.mode = next.mode;
    if (typeof next.hubLimit === "number")
      this.hubLimit = next.hubLimit;
    if (next.hiddenByProject && typeof next.hiddenByProject === "object") {
      this.hiddenByProject = next.hiddenByProject;
    }
    await super.setState(state, result);
    if (this.canvas)
      this.render(true);
  }
  isRelevant(path) {
    return path.startsWith(`${tasksPath(this.settings)}/`) || path.startsWith(`${referencesPath(this.settings)}/`) || path.startsWith(`${projectsPath(this.settings)}/`);
  }
  addToggle(toolbar, key, label, get, set) {
    const button = toolbar.createEl("button", { cls: "spm-flow-toggle", text: label });
    button.addEventListener("click", () => {
      set(!get());
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.toggles.set(key, button);
  }
  buildToolbar(toolbar) {
    this.modeSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-mode" });
    for (const [mode, label] of Object.entries(MODE_LABELS)) {
      this.modeSelect.createEl("option", { value: mode, text: label });
    }
    this.modeSelect.value = this.mode;
    this.modeSelect.addEventListener("change", () => {
      this.mode = this.modeSelect.value;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.projectSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-project" });
    this.projectSelect.addEventListener("change", () => {
      this.projectPath = this.projectSelect.value || null;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.addToggle(toolbar, "done", "Hide done", () => this.hideDone, (value) => this.hideDone = value);
    this.addToggle(toolbar, "mentions", "Mentions", () => this.mentions, (value) => this.mentions = value);
    this.addToggle(toolbar, "references", "References", () => this.references, (value) => this.references = value);
    this.addToggle(toolbar, "unlinked", "Unlinked", () => this.showUnlinked, (value) => this.showUnlinked = value);
    this.hubSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-hubs" });
    for (const limit of HUB_LIMITS) {
      this.hubSelect.createEl("option", { value: String(limit.value), text: limit.label });
    }
    this.hubSelect.value = String(this.hubLimit);
    this.hubSelect.addEventListener("change", () => {
      this.hubLimit = Number(this.hubSelect.value);
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.hiddenButton = toolbar.createEl("button", { cls: "spm-flow-toggle", text: "Hidden" });
    this.hiddenButton.addEventListener("click", () => this.setHidden([]));
    this.groupingSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-grouping" });
    for (const [mode, label] of Object.entries(GROUPING_LABELS)) {
      this.groupingSelect.createEl("option", { value: mode, text: `Group by ${label.toLowerCase()}` });
    }
    this.groupingSelect.value = this.grouping;
    this.groupingSelect.addEventListener("change", () => {
      this.grouping = this.groupingSelect.value;
      this.app.workspace.requestSaveLayout();
      this.render(true);
    });
    this.connectButton = toolbar.createEl("button", { cls: "spm-flow-toggle", text: "Connect" });
    this.connectButton.addEventListener("click", () => {
      var _a;
      this.connecting = !this.connecting;
      (_a = this.canvas) == null ? void 0 : _a.setConnecting(this.connecting);
      this.connectButton.toggleClass("is-active", this.connecting);
      new import_obsidian8.Notice(
        this.connecting ? "Drag from one task to another to relate them." : "Connect mode off."
      );
    });
    this.unpinButton = toolbar.createEl("button", { cls: "spm-flow-toggle", text: "Unpin" });
    this.unpinButton.addEventListener("click", () => {
      var _a;
      (_a = this.canvas) == null ? void 0 : _a.unpinAll();
      this.unpinButton.hide();
    });
    const zoomOut = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian8.setIcon)(zoomOut, "zoom-out");
    zoomOut.addEventListener("click", () => {
      var _a;
      return (_a = this.canvas) == null ? void 0 : _a.zoomBy(0.8);
    });
    const zoomIn = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian8.setIcon)(zoomIn, "zoom-in");
    zoomIn.addEventListener("click", () => {
      var _a;
      return (_a = this.canvas) == null ? void 0 : _a.zoomBy(1.25);
    });
    const fit = toolbar.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian8.setIcon)(fit, "maximize");
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
    var _a, _b, _c, _d, _e;
    if (!this.canvas)
      return;
    const projects = projectFiles(this.app, this.settings);
    this.syncProjectOptions(projects);
    const records = collectNotes(this.app, this.settings, { references: this.references });
    const graph = buildNoteGraph(records, createNoteResolver(this.app, records), {
      mentions: this.mentions
    });
    const projectPath = this.projectPath;
    let scoped = selectSubgraph(
      graph,
      (record) => projectPath !== null && record.projectPath === projectPath
    );
    for (const record of scoped.nodes) {
      record.external = scoped.external.has(record.path);
    }
    if (this.hideDone) {
      scoped = dropNodes(scoped, (record) => record.status.toLowerCase() === "done");
    }
    const hidden = new Set(this.hidden);
    if (hidden.size > 0)
      scoped = dropNodes(scoped, (record) => hidden.has(record.path));
    const collapsed = collapseHubs(scoped, this.hubLimit);
    scoped = collapsed.graph;
    for (const record of scoped.nodes) {
      record.hiddenMentions = collapsed.hidden.get(record.path);
    }
    this.graph = scoped;
    const connected = connectedPaths(scoped);
    const unlinkedCount = scoped.nodes.filter((record) => !connected.has(record.path)).length;
    if (!this.showUnlinked) {
      scoped = dropNodes(scoped, (record) => !connected.has(record.path));
    }
    (_a = this.toggles.get("done")) == null ? void 0 : _a.toggleClass("is-active", this.hideDone);
    (_b = this.toggles.get("mentions")) == null ? void 0 : _b.toggleClass("is-active", this.mentions);
    (_c = this.toggles.get("references")) == null ? void 0 : _c.toggleClass("is-active", this.references);
    (_d = this.toggles.get("unlinked")) == null ? void 0 : _d.toggleClass("is-active", this.showUnlinked);
    (_e = this.toggles.get("unlinked")) == null ? void 0 : _e.setText(`Unlinked (${unlinkedCount})`);
    this.groupingSelect.toggleClass("is-disabled", !this.showUnlinked || this.mode === "force");
    this.modeSelect.value = this.mode;
    this.hubSelect.value = String(this.hubLimit);
    this.unpinButton.toggle(this.mode === "force");
    this.hiddenButton.toggle(hidden.size > 0);
    this.hiddenButton.setText(`Show ${hidden.size} hidden`);
    this.warningEl.empty();
    const unresolved = scoped.unresolved.filter((entry) => entry.kind !== "mention");
    if (unresolved.length > 0) {
      const targets = [...new Set(unresolved.map((entry) => entry.target))];
      this.warningEl.setText(`${targets.length} unresolved link(s)`);
      this.warningEl.setAttribute("title", targets.join("\n"));
    }
    this.canvas.render(
      layoutGraph(scoped, { ...DEFAULT_LAYOUT_OPTIONS, grouping: this.grouping }),
      { fit, mode: this.mode, relations: scoped.relations }
    );
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
  showMenu(path, client) {
    const menu = new import_obsidian8.Menu();
    const record = path ? this.graph.nodes.find((entry) => entry.path === path) : null;
    if (record) {
      menu.addItem(
        (item) => item.setTitle("Open").setIcon("file-text").onClick(() => {
          const file = this.app.vault.getAbstractFileByPath(record.path);
          if (file instanceof import_obsidian8.TFile)
            this.app.workspace.getLeaf(false).openFile(file);
        })
      );
      menu.addItem(
        (item) => item.setTitle("Hide this card").setIcon("eye-off").onClick(() => this.setHidden([...this.hidden, record.path]))
      );
      menu.addSeparator();
    }
    const hiddenCount = this.hidden.length;
    menu.addItem(
      (item) => item.setTitle(hiddenCount > 0 ? `Show ${hiddenCount} hidden card(s)` : "Nothing hidden").setIcon("eye").setDisabled(hiddenCount === 0).onClick(() => this.setHidden([]))
    );
    menu.addItem(
      (item) => item.setTitle("Fit to screen").setIcon("maximize").onClick(() => {
        var _a;
        return (_a = this.canvas) == null ? void 0 : _a.fit();
      })
    );
    if (this.mode === "force") {
      menu.addItem(
        (item) => item.setTitle("Release pinned nodes").setIcon("pin-off").onClick(() => {
          var _a;
          return (_a = this.canvas) == null ? void 0 : _a.unpinAll();
        })
      );
    }
    menu.showAtPosition(client);
  }
  offerRelation(fromPath, toPath, client) {
    const from = this.graph.nodes.find((record) => record.path === fromPath);
    const to = this.graph.nodes.find((record) => record.path === toPath);
    if (!from || !to)
      return;
    const short = (title) => title.length > 32 ? `${title.slice(0, 31)}\u2026` : title;
    const choices = [
      { label: `\u201C${short(from.title)}\u201D blocks \u201C${short(to.title)}\u201D`, kind: "dependency" },
      { label: `\u201C${short(to.title)}\u201D continues \u201C${short(from.title)}\u201D`, kind: "continuation" },
      { label: "Related", kind: "related" }
    ];
    const menu = new import_obsidian8.Menu();
    for (const choice of choices) {
      const draft = { from, to, kind: choice.kind };
      const rejection = rejectionReason(this.graph, draft);
      menu.addItem((item) => {
        item.setTitle(rejection ? `${choice.label} \u2014 ${rejection}` : choice.label);
        item.setDisabled(rejection !== null);
        item.onClick(async () => {
          try {
            await writeRelation(this.app, draft);
            new import_obsidian8.Notice("Relation created.");
          } catch (error) {
            console.error("[Simpromana] Relation write error:", error);
            new import_obsidian8.Notice("\u274C Could not write the relation.");
          }
        });
      });
    }
    menu.showAtPosition(client);
  }
  openTask(path, event) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian8.TFile))
      return;
    const leaf = this.app.workspace.getLeaf(import_obsidian8.Keymap.isModEvent(event));
    leaf.openFile(file);
  }
};

// src/views/BoardView.ts
var import_obsidian9 = require("obsidian");
var BOARD_VIEW_TYPE = "simpromana-board";
var COLUMNS = ["Todo", "Doing", "Review", "Done"];
var BoardView = class extends import_obsidian9.ItemView {
  constructor(leaf, settings) {
    super(leaf);
    this.settings = settings;
    this.records = [];
    this.projectPath = null;
  }
  getViewType() {
    return BOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "Board";
  }
  getIcon() {
    return "layout-list";
  }
  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("spm-board");
    this.buildToolbar(root.createDiv({ cls: "spm-board-toolbar" }));
    this.columnsEl = root.createDiv({ cls: "spm-board-columns" });
    this.emptyEl = root.createDiv({ cls: "spm-board-empty" });
    const refresh = (0, import_obsidian9.debounce)(() => this.refresh(), 400, true);
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
    this.refresh();
  }
  async onClose() {
  }
  getState() {
    var _a;
    return { projectPath: (_a = this.projectPath) != null ? _a : void 0 };
  }
  async setState(state, result) {
    const next = state != null ? state : {};
    if (typeof next.projectPath === "string")
      this.projectPath = next.projectPath;
    await super.setState(state, result);
    if (this.columnsEl) {
      this.syncProjectSelect();
      this.renderBoard();
    }
  }
  isRelevant(path) {
    return path.startsWith(`${tasksPath(this.settings)}/`) || path.startsWith(`${projectsPath(this.settings)}/`);
  }
  buildToolbar(toolbar) {
    this.projectSelect = toolbar.createEl("select", {
      cls: "dropdown spm-board-project",
      attr: { "aria-label": "Filter by project" }
    });
    this.projectSelect.addEventListener("change", () => {
      this.projectPath = this.projectSelect.value || null;
      this.app.workspace.requestSaveLayout();
      this.renderBoard();
    });
  }
  syncProjectSelect() {
    var _a;
    const projects = projectFiles(this.app, this.settings);
    const current = this.projectPath;
    this.projectSelect.empty();
    this.projectSelect.createEl("option", { value: "", text: "Todos" });
    for (const file of projects) {
      this.projectSelect.createEl("option", { value: file.path, text: file.basename });
    }
    this.projectPath = current && projects.some((file) => file.path === current) ? current : null;
    this.projectSelect.value = (_a = this.projectPath) != null ? _a : "";
  }
  refresh() {
    this.records = collectNotes(this.app, this.settings, { references: false });
    this.syncProjectSelect();
    this.renderBoard();
  }
  renderBoard() {
    this.columnsEl.empty();
    const filtered = this.projectPath ? this.records.filter((record) => record.projectPath === this.projectPath) : this.records;
    for (const column of COLUMNS) {
      this.columnsEl.appendChild(this.renderColumn(column, filtered));
    }
    this.emptyEl.toggle(filtered.length === 0);
    if (filtered.length === 0)
      this.emptyEl.setText("No tasks found.");
  }
  renderColumn(column, filtered) {
    const cards = filtered.filter((record) => record.status.toLowerCase() === column.toLowerCase());
    const columnEl = createDiv({ cls: "spm-board-column" });
    const header = columnEl.createDiv({ cls: "spm-board-column-header" });
    header.createSpan({ cls: "spm-board-column-title", text: column });
    header.createSpan({ cls: "spm-board-column-count", text: String(cards.length) });
    const list = columnEl.createDiv({ cls: "spm-board-column-list" });
    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      list.addClass("is-drag-over");
    });
    list.addEventListener("dragleave", () => list.removeClass("is-drag-over"));
    list.addEventListener("drop", (event) => {
      var _a;
      event.preventDefault();
      list.removeClass("is-drag-over");
      const path = (_a = event.dataTransfer) == null ? void 0 : _a.getData("text/plain");
      if (path)
        void this.moveTask(path, column);
    });
    for (const record of cards) {
      list.appendChild(this.renderCard(record));
    }
    return columnEl;
  }
  renderCard(record) {
    const card = createDiv({ cls: "spm-board-card" });
    card.dataset.path = record.path;
    card.draggable = true;
    card.createDiv({ cls: "spm-board-card-title", text: record.title });
    const meta = card.createDiv({ cls: "spm-board-card-meta" });
    if (record.projectName) {
      meta.createSpan({ cls: "spm-board-chip", text: record.projectName });
    }
    if (record.priority) {
      meta.createSpan({
        cls: `spm-board-chip is-priority is-${record.priority}`,
        text: record.priority
      });
    }
    card.addEventListener("dragstart", (event) => {
      var _a;
      (_a = event.dataTransfer) == null ? void 0 : _a.setData("text/plain", record.path);
      if (event.dataTransfer)
        event.dataTransfer.effectAllowed = "move";
      card.addClass("is-dragging");
    });
    card.addEventListener("dragend", () => card.removeClass("is-dragging"));
    card.addEventListener("click", (event) => this.openTask(record.path, event));
    return card;
  }
  async moveTask(path, column) {
    const record = this.records.find((entry) => entry.path === path);
    if (record && record.status.toLowerCase() === column.toLowerCase())
      return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian9.TFile))
      return;
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.tstatus = column;
      });
      if (record)
        record.status = column;
      this.renderBoard();
    } catch (error) {
      console.error("[Simpromana] Board status update error:", error);
      new import_obsidian9.Notice("\u274C Could not update the task status.");
    }
  }
  openTask(path, event) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian9.TFile))
      return;
    const leaf = this.app.workspace.getLeaf(import_obsidian9.Keymap.isModEvent(event));
    leaf.openFile(file);
  }
};

// src/main.ts
var SimpromanaPlugin = class extends import_obsidian10.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SimpromanaSettingTab(this.app, this));
    this.registerView(
      FLOW_VIEW_TYPE,
      (leaf) => new FlowView(leaf, this.settings)
    );
    this.registerView(
      BOARD_VIEW_TYPE,
      (leaf) => new BoardView(leaf, this.settings)
    );
    this.addCommand({
      id: "open-task-flow",
      name: "Open task flow",
      callback: () => this.openFlowView()
    });
    this.addCommand({
      id: "open-board",
      name: "Open Board",
      callback: () => this.openBoardView()
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
          new import_obsidian10.Notice("\u2705 Tasks.base updated.");
        } catch (err) {
          console.error("[Simpromana] Setup bases error:", err);
          new import_obsidian10.Notice("\u274C Failed to update Tasks.base.");
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
  async openBoardView() {
    var _a;
    const { workspace } = this.app;
    const leaf = (_a = workspace.getLeavesOfType(BOARD_VIEW_TYPE)[0]) != null ? _a : workspace.getLeaf("tab");
    await leaf.setViewState({ type: BOARD_VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
