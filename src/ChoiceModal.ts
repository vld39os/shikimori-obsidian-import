import { App, Modal, Notice } from "obsidian";
import { createMD } from "./createMD";
import { getVaultBasePath } from "./checkAdapter";
import * as path from "path";
import { ImportableItem, ListToImport } from "./interfaces";

export class ChoiceModal extends Modal {
	private titleList: ImportableItem[];
	private listToImport: ListToImport;
	private pathFromSettings: string;

	constructor(app: App, titles: ImportableItem[], pathFromSettings: string) {
		super(app);
		this.titleList = titles;
		this.listToImport = [];
		this.pathFromSettings = pathFromSettings;
	}

	private toggleSelection(title: ImportableItem, element: HTMLElement) {
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
		console.log("Выбранные объекты для импорта:", this.listToImport);
		if (this.listToImport.length > 0) {
			for (const title of this.listToImport) {
				// обработка студий
				let processedStudios: string[] = [];
				if ("studios" in title && Array.isArray(title.studios)) {
					processedStudios = title.studios.map(
						(studio) => studio.name
					);
				}

				//обработка описания
				const processedDescription = title.description.replace(
					/\[.*?\]/g,
					""
				);

				// ввод данных
				const data = {
					...title,
					poster: title.poster?.mainUrl,
					genres: title.genres.map((genre) => genre.name),
					...(processedStudios ? { studios: processedStudios } : {}), // проверка на наличие студии для манги
					description: processedDescription || "",
				};
				// функция создания файла (принимает папку куда сохранить и обработанные данные)
				const fullPath = path.join(
					getVaultBasePath(this.app),
					this.pathFromSettings
				);
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
