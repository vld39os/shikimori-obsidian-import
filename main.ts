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

import { queryToShiki } from "src/queryToShiki";
import { ChoiseModal } from "src/ChoiseModal";

export interface ShikiImportPluginSettings {
	mySetting: string;
	vaultPath: string;
	importCount: number;
}

const DEFAULT_SETTINGS: ShikiImportPluginSettings = {
	mySetting: "default",
	vaultPath: "", // Подумать как реализовать смену дефолтного пути
	importCount: 5,
};

export default class ShikiImport extends Plugin {
	settings: ShikiImportPluginSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconShikiImport = this.addRibbonIcon(
			"database",
			"Shikimori Import",
			(_evt: MouseEvent) => {
				const limit = this.settings.importCount;
				new ShikiImportModal(this.app, this.settings).open();
			}
		);

		this.addCommand({
			id: "shikimori-import-modal-window",
			name: "Добавить заметки из Shikimori",
			callback: () => {
				const limit = this.settings.importCount;
				new ShikiImportModal(this.app, this.settings).open();
			},
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ShikiImportSettingTab(this.app, this));
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
	settings: ShikiImportPluginSettings;
	constructor(app: App, settings: ShikiImportPluginSettings) {
		super(app);
		this.settings = settings;
	}

	onOpen() {
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
						// Импорт лимита и запрос
						const limit = this.settings.importCount;
						const response = await queryToShiki(querySearch, limit);

						if (response) {
							//Импорт пути и запрос
							const pathFromSetting = this.settings.vaultPath;
							new ChoiseModal(
								this.app,
								response,
								pathFromSetting
							).open();
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
		let limitText: HTMLDivElement;
		new Setting(containerEl)
			.setName("Количество объектов в запросе")
			.addSlider((slider) =>
				slider
					.setLimits(1, 25, 1)
					.setValue(this.plugin.settings.importCount)
					.onChange(async (value) => {
						limitText.innerText = " " + value.toString();
						this.plugin.settings.importCount = value;
						this.plugin.saveSettings();
					})
			)
			.settingEl.createDiv("", (el) => {
				limitText = el;
				el.style.minWidth = "2.3em";
				el.style.textAlign = "right";
				el.innerText =
					" " + this.plugin.settings.importCount.toString();
			});

		new Setting(containerEl)
			.setName("Место сохранения новых файлов")
			.setDesc("По умолчанию заметки сохраняются в корень хранилища")
			.addSearch((cb) => {
				cb.setPlaceholder("Пример: папка1/папка2")
					.setValue(this.plugin.settings.vaultPath)
					.onChange((newFolder) => {
						this.plugin.settings.vaultPath = newFolder;
						this.plugin.saveSettings();
					});
			});
	}
}
