export interface SimpromanaSettings {
	rootFolder: string;
	projectsFolder: string;
	tasksFolder: string;
	referencesFolder: string;
	archiveFolder: string;
	typeProperty: string;
	projectProperty: string;
	taskStatusProperty: string;
	projectStatusProperty: string;
	priorityProperty: string;
	milestoneProperty: string;
	epicProperty: string;
	dueDateProperty: string;
	blockedByProperty: string;
	continuesProperty: string;
	relatedProperty: string;
	taskStatuses: string;
	archivedStatus: string;
	projectStatuses: string;
}

export const DEFAULT_SETTINGS: SimpromanaSettings = {
	rootFolder: "Project Management",
	projectsFolder: "Projects",
	tasksFolder: "Tasks",
	referencesFolder: "Reference",
	archiveFolder: "Archive",
	typeProperty: "type",
	projectProperty: "project",
	taskStatusProperty: "tstatus",
	projectStatusProperty: "pstatus",
	priorityProperty: "priority",
	milestoneProperty: "milestone",
	epicProperty: "epic",
	dueDateProperty: "due_date",
	blockedByProperty: "blocked_by",
	continuesProperty: "continues",
	relatedProperty: "related",
	taskStatuses: "Todo, Doing, Review, Done",
	archivedStatus: "Archive",
	projectStatuses: "Backlog, Planning, In progress, Paused, Done, Canceled",
};

function splitList(value: string, fallback: string): string[] {
	const items = value.split(",").map((item) => item.trim()).filter(Boolean);
	return items.length > 0 ? items : splitList(fallback, fallback);
}

/** Task statuses in board order: the first is the default for new tasks, the last means done. */
export function taskStatusList(s: SimpromanaSettings): string[] {
	return splitList(s.taskStatuses, DEFAULT_SETTINGS.taskStatuses);
}

export function doneStatus(s: SimpromanaSettings): string {
	return taskStatusList(s).at(-1) as string;
}

/** Project statuses; the first is the default for new projects. */
export function projectStatusList(s: SimpromanaSettings): string[] {
	return splitList(s.projectStatuses, DEFAULT_SETTINGS.projectStatuses);
}
