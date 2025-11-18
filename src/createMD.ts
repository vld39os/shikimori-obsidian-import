import * as fs from "fs";
import { Notice } from "obsidian";

export function createMD(filepath: string, data: Record<string, any>) {
	filepath
		.replace(/[<>:"/\\|?*]/g, "_")
		.trim()
		.substring(0, 200);
	const yaml = require("js-yaml");
	const yamlFrontmatter = yaml
		.dump(data, { allowUnicode: true, sortKeys: false })
		.trim();
	const fullContent = `---\n${yamlFrontmatter}\n---\n`;
	fs.writeFileSync(filepath + ".md", fullContent, "utf-8");
	new Notice(`Файл создан: ${filepath}`);
}
