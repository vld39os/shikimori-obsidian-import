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

import { getAccessToken } from "src/getAccessToken";
import * as path from "path";
import * as fs from "fs";
import { queryToShiki } from "src/queryToShiki";
import { createMD } from "src/createMD";
import { getVaultBasePath } from "src/checkAdapter";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"database",
			"Shikimori Import",
			(_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new ShikiImport(this.app).open();
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
				new ShikiImport(this.app).open();
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new ShikiImport(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

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

class ShikiImport extends Modal {
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
						// Отсюда начинается запрос
						const response = await queryToShiki(querySearch);
						if (response) {
							for (const title of response) {
								const data = {
									...title,
									poster: title.poster?.mainUrl,
									genres: title.genres.map(
										(genre) => genre.name
									),
									studios: title.studios.map(
										(studio) => studio.name
									),
									description: title.description || "",
								};

								// проверка адаптера
								const vaultPath = getVaultBasePath(this.app);
								// Название файла
								const filename = path.join(
									vaultPath,
									title.name
								);
								console.log(`Путь файла: ${filename}`);
								createMD(filename, data);
							}
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

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
