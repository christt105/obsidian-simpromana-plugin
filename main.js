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
var import_obsidian6 = require("obsidian");

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

// src/main.ts
var SimpromanaPlugin = class extends import_obsidian6.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SimpromanaSettingTab(this.app, this));
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
          new import_obsidian6.Notice("\u2705 Tasks.base updated.");
        } catch (err) {
          console.error("[Simpromana] Setup bases error:", err);
          new import_obsidian6.Notice("\u274C Failed to update Tasks.base.");
        }
      }
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
