import { App, normalizePath, TFile } from "obsidian";
import type { SimpromanaSettings } from "../settings";

function tasksBaseContent(s: SimpromanaSettings): string {
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

function referencesBaseContent(s: SimpromanaSettings): string {
	const referencesFolder = `${s.rootFolder}/${s.referencesFolder}`;
	return `filters:
  and:
    - file.folder == "${referencesFolder}"
formulas:
  referenceNameLink: link(file.path, file.name)
  project_link: link(project, project.split('/')[-1])
properties:
  file.name:
    displayName: Reference
views:
  - type: table
    name: Current
    filters:
      and:
        - note.project == this
    order:
      - formula.referenceNameLink
      - description
      - date
      - tags
    sort:
      - property: file.ctime
        direction: DESC
  - type: table
    name: All
    groupBy:
      property: project
      direction: ASC
    order:
      - formula.referenceNameLink
      - formula.project_link
      - description
      - date
      - tags
    sort:
      - property: file.ctime
        direction: DESC
`;
}

async function writeBase(app: App, path: string, content: string): Promise<void> {
	const normalized = normalizePath(path);
	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else {
		await app.vault.create(normalized, content);
	}
}

export async function setupBases(app: App, s: SimpromanaSettings): Promise<void> {
	await writeBase(app, `${s.rootFolder}/Tasks.base`, tasksBaseContent(s));
	await writeBase(app, `${s.rootFolder}/References.base`, referencesBaseContent(s));
}
