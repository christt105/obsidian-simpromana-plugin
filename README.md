# Simpromana

Obsidian plugin for project and task management: a task flow graph, a
kanban board, a project side panel, and helpers to keep `Projects`,
`Tasks`, and `Reference` notes wired together through frontmatter.

## Installation

Simpromana isn't in Obsidian's community plugin list, so install it with
[BRAT](https://github.com/TfTHacker/obsidian42-brat) or manually.

**BRAT (recommended)**

1. Install the BRAT community plugin.
2. In BRAT, *Add beta plugin*, and enter `christt105/obsidian-simpromana-plugin`.
3. Enable Simpromana under Settings → Community plugins.

**Manual**

1. Download `main.js`, `manifest.json`, and `styles.css` from the
   [latest release](https://github.com/christt105/obsidian-simpromana-plugin/releases/latest).
2. Copy them into `<vault>/.obsidian/plugins/simpromana/`.
3. Enable Simpromana under Settings → Community plugins.

**Why isn't it in the official list?** Simpromana isn't a general-purpose
task manager: its frontmatter fields, status vocabulary, and folder
conventions are opinionated, built around how I personally organize my
own vault rather than abstracted for a wide audience (see *Known
limitations*). If it picks up enough interest, submitting it to the
community plugin list is on the table.

## Requirements

- Obsidian 1.4.0+.
- The core **Bases** plugin, enabled, if you want kanban/table views
  embedded directly inside your project notes (see below).
- Recommended: the community plugin **[Kanban for Bases](https://github.com/kotchourko/obsidian-bases-kanban)**
  (`dev.kotchourko.obsidian-bases-kanban`). Simpromana's own "Setup bases"
  command generates a `Tasks.base` file whose views already use this
  plugin's kanban view type — without it installed, those views fall back
  to a plain table.

## Note types

Simpromana organizes a vault into three note types, distinguished by a
`type:` frontmatter field, all living under a configurable root folder
(default `Project Management`):

- **`project`** (`Projects/*.md`) — one per ongoing effort. Created via the
  *New project* command. Frontmatter: `pstatus`, `type: project`,
  `priority`, `tags`, `github`, `banner`. The generated note body embeds
  `Tasks.base#Current` and `References.base#Current` so its own tasks and
  references show up automatically.
- **`task`** (`Tasks/Title - abc123.md`, random 6-char id suffix) —
  created via the *New task* command. Frontmatter: `tstatus`
  (`Todo`/`Doing`/`Review`/`Done`), `type: task`, `priority`, optional
  `milestone`, `epic`, `due_date`, and `project` (a wikilink to the parent
  project note — required for the task to appear in that project's
  `Tasks.base` view).
- **`reference`** (`Reference/Title - abc123.md`) — write-ups, audits,
  analyses; not actionable by themselves. Created via the *New reference*
  command. Frontmatter: `type: reference`, `tags`, `project` (a wikilink
  to the parent project note — required for the reference to appear in
  that project's `References.base` view), `date`, `description`.

### Relations between tasks

Task relations belong in frontmatter, not prose links, so they can drive
the flow graph: `blocked_by` / `blocks` (hard prerequisite), `continues` /
`continued_by` (direct follow-on of a previous task), and `related` (loose
cross-reference, no ordering). Each is a wikilink or list of wikilinks.
Simpromana registers a custom property widget for these keys so Obsidian
renders them as relation pickers instead of plain text/link fields.

Field and value names above (`tstatus`, `pstatus`, `type`, the status
vocabulary, …) are currently fixed, not configurable — see *Known
limitations*.

## Settings

Only the vault layout is configurable, under Settings → Simpromana:
root folder and the `Projects` / `Tasks` / `Reference` / `Archive`
subfolder names.

## Commands

- **New project** / **New task** / **New reference** — scaffold a note
  with the frontmatter above.
- **Setup bases** — (re)generates `<root>/Tasks.base`, with `Current`
  (tasks linking to the active note, e.g. embedded in a project),
  `Board` (all tasks, grouped by project), and `Table` views. Run it again
  after changing the root/tasks folder in settings. It does not create
  `References.base` — if a project note embeds it, that file needs to
  exist already (create it manually, or copy `Tasks.base` as a starting
  point).
- **Archive current task** — available when the active note is a task;
  sets `tstatus: Archive` and moves the file into the archive subfolder.
- **Open task flow** — opens the flow graph view (see below).
- **Open Board** — opens the standalone board view (see below).
- **Open project panel** — opens the project panel view (see below).

## Views

- **Flow view** — a node graph of tasks and their `blocked_by` /
  `continues` / `related` relations for a project, laid out and grouped
  automatically. Opens scoped to the active project note when there is
  one.
- **Board view** — a kanban board (Todo/Doing/Review/Done columns) as a
  standalone workspace tab, with drag-and-drop status changes and an
  optional project filter. This duplicates what the `Board` view in
  `Tasks.base` already gives you once the Kanban for Bases plugin is
  installed, but it's kept as a self-contained fallback for vaults that
  don't have that community plugin — unlike a `.base` view, it can't be
  embedded inside a note.
- **Project panel** — a side-panel view listing a project's tasks grouped
  by status, with quick task creation scoped to that project.

## Known limitations

- Frontmatter property names (`tstatus`, `pstatus`, `type`, `project`,
  relation keys, …) and the status vocabulary (`Todo`/`Doing`/`Review`/
  `Done`, …) are hardcoded across the graph, board, panel, and the
  `Tasks.base` template. Making these configurable — so a vault that
  already uses e.g. `status` instead of `tstatus` doesn't have to
  rename everything — is a real gap, not yet scheduled.
- `References.base` is not generated by "Setup bases"; only `Tasks.base`
  is.
