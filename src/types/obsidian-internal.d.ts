import "obsidian";

/**
 * Minimal surface of Obsidian's undocumented property-widget API, reverse
 * engineered against Obsidian 1.13. Only the members this plugin actually
 * calls are declared; anything else on the real objects is untyped here.
 */
declare module "obsidian" {
	interface PropertyRenderContext {
		app: App;
		key: string;
		sourcePath: string;
		blur(): void;
		onChange(value: unknown): void;
	}

	interface PropertyWidgetComponentBase {
		type: string;
		focus(mode?: unknown): void;
	}

	interface PropertyWidget<
		ComponentType extends PropertyWidgetComponentBase = PropertyWidgetComponentBase
	> {
		type: string;
		icon: string;
		reservedKeys?: string[];
		name(): string;
		render(containerEl: HTMLElement, data: unknown, context: PropertyRenderContext): ComponentType;
		validate(value: unknown): boolean;
	}

	interface MetadataTypeManager {
		registeredTypeWidgets: Record<string, PropertyWidget>;
		getAssignedWidget(property: string): string | null;
		setType(property: string, type: string): Promise<void>;
	}

	interface App {
		metadataTypeManager: MetadataTypeManager;
	}
}
