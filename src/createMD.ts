import * as fs from "fs";
import * as path from "path";
import { Notice } from "obsidian";

// функция создания фронтматтера без зависимостей с экранированием
function createFrontmatter(data: Record<string, any>): string {
	const lines = Object.entries(data)
		// Фильтруем пустые значения
		.filter(([key, value]) => {
			if (value === null || value === undefined) return false;
			if (typeof value === "string" && value.trim() === "") return false;
			if (Array.isArray(value) && value.length === 0) return false;
			if (typeof value === "object" && Object.keys(value).length === 0)
				return false;
			return true;
		})
		.map(([key, value]) => {
			// Все строковые значения заключаем в кавычки для безопасности
			if (typeof value === "string") {
				// Экранируем кавычки внутри строки
				const escapedValue = value.replace(/"/g, '\\"');

				// Для многострочных строк используем блоковый синтаксис
				if (value.includes("\n")) {
					return `${key}: |\n  ${value.replace(/\n/g, "\n  ")}`;
				}

				return `${key}: "${escapedValue}"`;
			}

			// Обработка массивов
			if (Array.isArray(value)) {
				const items = value
					.map((item) =>
						typeof item === "string"
							? `"${item.replace(/"/g, '\\"')}"`
							: item
					)
					.join(", ");
				return `${key}: [${items}]`;
			}

			// Для остальных типов (числа, булевы, null)
			return `${key}: ${value}`;
		});

	return `---\n${lines.join("\n")}\n---`;
}

export function createMD(filepath: string, data: Record<string, any>) {
	const sanitizedName = data.name
		.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_")
		.trim()
		.substring(0, 200);
	const filePath = path.join(filepath, sanitizedName);
	const frontmatter = createFrontmatter(data);

	const directoryPath = path.dirname(filePath);

	// Проверяем, существует ли директория
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
		new Notice(`Директория создана: ${directoryPath}`);
	}

	fs.writeFileSync(filePath + ".md", frontmatter, "utf-8");
	new Notice(`Файл создан: ${filePath}`);
}
