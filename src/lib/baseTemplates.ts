import type { SimpromanaSettings } from "../settings";

export function tasksBaseContent(s: SimpromanaSettings): string {
	const tasksFolder = `${s.rootFolder}/${s.tasksFolder}`;
	const status = s.taskStatusProperty;
	const project = s.projectProperty;
	const priority = s.priorityProperty;
	const milestone = s.milestoneProperty;
	return `filters:
  and:
    - file.folder == "${tasksFolder}"
formulas:
  taskName: file.name.slice(0, file.name.length - 9)
  taskNameLink: link(file.path, formula.taskName)
  _status_order: if(${status} == "Todo", 1, if(${status} == "Doing", 2, if(${status} == "Review", 3, 4)))
  project_link: link(${project}, ${project}.split('/')[-1])
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
      property: ${status}
      direction: ASC
    boardColumns:
      - Todo
      - Doing
      - Review
      - Done
    order:
      - ${priority}
      - ${milestone}
    sort:
      - property: file.mtime
        direction: DESC
  - type: kanban
    name: Board
    groupBy:
      property: ${status}
      direction: ASC
    boardColumns:
      - Todo
      - Doing
      - Review
      - Done
    order:
      - formula.project_link
      - ${priority}
      - ${milestone}
    sort:
      - property: file.mtime
        direction: DESC
  - type: table
    name: Table
    groupBy:
      property: ${project}
      direction: ASC
    order:
      - formula.taskNameLink
      - ${status}
      - ${priority}
      - ${milestone}
    sort:
      - property: ${project}
        direction: ASC
      - property: formula._status_order
        direction: ASC
`;
}

export function referencesBaseContent(s: SimpromanaSettings): string {
	const referencesFolder = `${s.rootFolder}/${s.referencesFolder}`;
	const project = s.projectProperty;
	return `filters:
  and:
    - file.folder == "${referencesFolder}"
formulas:
  referenceNameLink: link(file.path, file.name)
  project_link: link(${project}, ${project}.split('/')[-1])
properties:
  file.name:
    displayName: Reference
views:
  - type: table
    name: Current
    filters:
      and:
        - note.${project} == this
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
      property: ${project}
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
