import * as fs from "fs";
import * as path from "path";
import { Notice } from "obsidian";

export function createMD(filepath: string, data: Record<string, any>) {
	const sanitizedName = data.name
		.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_")
		.trim()
		.substring(0, 200);
	const filePath = path.join(filepath, sanitizedName);
	const yaml = require("js-yaml");
	const yamlFrontmatter = yaml
		.dump(data, { allowUnicode: true, sortKeys: false })
		.trim();
	const fullContent = `---\n${yamlFrontmatter}\n---\n`;

	const directoryPath = path.dirname(filePath);

	// Проверяем, существует ли директория
	if (!fs.existsSync(directoryPath)) {
		// Если нет, создаём её и все промежуточные папки
		fs.mkdirSync(directoryPath, { recursive: true });
		console.log(`Директория создана: ${directoryPath}`);
	} else {
		console.log(`Директория уже существует: ${directoryPath}`);
	}

	fs.writeFileSync(filePath + ".md", fullContent, "utf-8");
	new Notice(`Файл создан: ${filePath}`);
}
