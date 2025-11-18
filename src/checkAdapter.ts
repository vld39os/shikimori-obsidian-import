import { FileSystemAdapter, App } from "obsidian";

export function getVaultBasePath(app: App): string {
	const adapter = app.vault.adapter;

	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath();
	}
	return " ";
}
