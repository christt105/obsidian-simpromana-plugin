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
  - type: kanban
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
      - property: formula._tstatus_order
        direction: ASC
  - type: kanban
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
      - property: formula._tstatus_order
        direction: ASC
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

export async function setupBases(app: App, s: SimpromanaSettings): Promise<void> {
	const path = normalizePath(`${s.rootFolder}/Tasks.base`);
	const content = tasksBaseContent(s);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else {
		await app.vault.create(path, content);
	}
}
