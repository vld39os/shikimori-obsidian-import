import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import * as path from "path";
import { queryToShiki } from "src/queryToShiki";
import { createMD } from "src/createMD";
import { getVaultBasePath } from "src/checkAdapter";
import { ChoiseModal } from "src/ChoiseModal";

// Remember to rename these classes and interfaces!

interface ShikiImportPluginSettings {
	mySetting: string;
	vaultPath: string;
	importCount: number;
}

const DEFAULT_SETTINGS: ShikiImportPluginSettings = {
	mySetting: "default",
	vaultPath: "this.app.vault.adapter.basePath", // Подумать как реализовать смену дефолтного пути
	importCount: 5,
};

export default class ShikiImport extends Plugin {
	settings: ShikiImportPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"database",
			"Shikimori Import",
			(_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new ShikiImportModal(this.app).open();
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "shikimori-import-modal-window",
			name: "Добавить заметку из Shikimori",
			callback: () => {
				new ShikiImportModal(this.app).open();
			},
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ShikiImportSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		//this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		//	console.log("click", evt);
		//});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(
		//	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		//);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ShikiImportModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		//const { contentEl } = this;
		this.setTitle("Поиск аниме по БД Shikimori");
		let querySearch = "";
		new Setting(this.contentEl).setName("Запрос").addText((text) =>
			text.onChange((value) => {
				querySearch = value;
			})
		);

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText("Поиск")
				.setCta()
				.onClick(async () => {
					try {
						// Запрос
						const response = await queryToShiki(querySearch);
						if (response) {
							// Вызов окна для выбора
							new ChoiseModal(this.app, response).open();
						}
					} catch (error) {
						console.error(error);
					}
				})
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Побаловаться с настройками

class ShikiImportSettingTab extends PluginSettingTab {
	plugin: ShikiImport;

	constructor(app: App, plugin: ShikiImport) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
