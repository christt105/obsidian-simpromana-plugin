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
};
