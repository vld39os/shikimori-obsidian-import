import { App, Modal, Setting, Notice } from "obsidian";
import { createMD } from "./createMD";
import { getVaultBasePath } from "./checkAdapter";
import ShikiImport, { ShikiImportPluginSettings } from "main";
import * as path from "path";

interface AnimeList {
	name: string;
	russian: string;
	english: string;
	japanese: string;
	kind: string;
	score: number;
	episodes: number;
	poster: Poster;
	genres: Genres[];
	studios: Studios[];
	description: string;
	watched: boolean;
	whenWatched: number;
}

interface Poster {
	id: number;
	originalUrl: string;
	mainUrl: string;
}

interface Genres {
	id: number;
	name: string;
}

interface Studios {
	id: number;
	name: string;
}

export class ChoiseModal extends Modal {
	private titleList: AnimeList[];
	private listToImport: AnimeList[];
	private pathFromSettings: string;

	constructor(app: App, titles: AnimeList[], pathFromSettings: string) {
		super(app);
		this.titleList = titles;
		this.listToImport = [];
		this.pathFromSettings = pathFromSettings;
	}

	private toggleSelection(title: AnimeList, element: HTMLElement) {
		const index = this.listToImport.findIndex(
			(item) => item.name === title.name
		);
		if (index > -1) {
			this.listToImport.splice(index, 1);
			element.removeClass("item-selected");
		} else {
			this.listToImport.push(title);
			element.addClass("item-selected");
		}
	}

	private onFinishSelection() {
		console.log("Выбранные аниме для импорта:", this.listToImport);
		if (this.listToImport.length > 0) {
			for (const title of this.listToImport) {
				const data = {
					...title,
					poster: title.poster?.mainUrl,
					genres: title.genres.map((genre) => genre.name),
					studios: title.studios.map((studio) => studio.name),
					description: title.description || "",
					watched: false,
					whenWatched: null,
				};
				console.log(
					`Проверка пути сохранения файлов 1: ${getVaultBasePath(
						this.app
					)}`
				);
				console.log(
					`Проверка пути сохранения файлов 2: ${this.pathFromSettings}`
				);
				// функция создания файла (принимает папку куда сохранить и обработанные данные)
				const fullPath = path.join(
					getVaultBasePath(this.app),
					this.pathFromSettings
				);
				console.log(`Проверка пути сохранения файлов: ${fullPath}`);
				createMD(fullPath, data);
			}
		} else {
			new Notice("Не выбрано ни одного аниме.");
		}
		this.close(); // Закрываем модальное окно
	}

	onOpen(): Promise<void> | void {
		const { contentEl } = this;
		contentEl.empty(); // Очищаем содержимое

		contentEl.createEl("h2", { text: "Результаты поиска" });

		if (this.titleList.length === 0) {
			contentEl.createEl("p", { text: "Результаты не найдены." });
			return;
		}

		const listContainer = contentEl.createDiv();

		this.titleList.forEach((title) => {
			const titleBox = listContainer.createDiv({ cls: "item" });

			titleBox.addEventListener("click", (event) => {
				this.toggleSelection(title, titleBox);
			});

			if (title.poster?.mainUrl) {
				const img = titleBox.createEl("img", {
					attr: {
						src: title.poster.mainUrl,
						alt: title.name,
						width: "90",
						height: "120",
					},
				});
			}

			const titleEl = titleBox.createDiv();
			titleEl.createEl("strong", { text: title.russian || title.name }); // Приоритет у русского названия
			if (title.name && title.russian && title.name !== title.russian) {
				titleEl.createEl("div", { text: `${title.name}` });
				titleEl.createEl("div", { text: `${title.japanese}` });
				titleEl.createEl("div", { text: `${title.kind}` });
			}
			titleBox.createEl("hr");
		});

		const buttonBox = contentEl.createDiv({ cls: "modal-button" });
		const finishButton = buttonBox.createEl("button", {
			text: "Импортировать выбранные",
		});
		finishButton.addEventListener("click", () => {
			this.onFinishSelection(); // Вызываем метод импорта
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
