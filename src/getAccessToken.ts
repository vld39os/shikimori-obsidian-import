import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import { App, Modal, Notice } from "obsidian";

const CLIENT_ID = "bVlJeuSa9zuVjOBBgMAR35J-poX0QhnDBthC1D0Hn0I";
const CLIENT_SECRET = "_qPQSlI7Zbh8UYPSmSKnl1WFelHCG_a3bv9DMkfxkNE";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";
const AUTH_URL = "https://shikimori.one/oauth/authorize";
const TOKEN_URL = "https://shikimori.one/oauth/token";
const TOKEN_FILE = "shikimori_token.json";
const USER_AGENT = "Shikimori Import Obsidian Plugin";

interface TokenData {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
	created_at: number;
	last_update: number;
}

class modalCodeWindow extends Modal {
	private authUrl: string;
	private onCodeReceived: (code: string) => void;
	constructor(
		app: App,
		authUrl: string,
		onCodeReceived: (code: string) => void
	) {
		super(app);
		this.authUrl = authUrl;
		this.onCodeReceived = onCodeReceived;
	}

	onOpen(): Promise<void> | void {
		const { contentEl } = this;
		contentEl.empty(); // Очищаем содержимое модального окна

		// Заголовок
		contentEl.createEl("h2", { text: "Авторизация Shikimori" });

		// Инструкция
		contentEl.createEl("p", {
			text: "Для продолжения, пожалуйста, авторизуйтесь через Shikimori.",
		});

		// Ссылка для авторизации
		const linkContainer = contentEl.createDiv();
		linkContainer.createEl("a", {
			text: "Перейти к авторизации",
			href: this.authUrl, // Устанавливаем URL
		});

		contentEl.createEl("p", {
			text: "После авторизации скопируйте код авторизации и вставьте его ниже:",
		});

		// Поле ввода для кода
		const inputContainer = contentEl.createDiv();
		const inputEl = inputContainer.createEl("input", {
			type: "text",
			placeholder: "Введите код авторизации",
		});

		// Кнопка подтверждения
		const buttonContainer = contentEl.createDiv();
		const confirmButton = buttonContainer.createEl("button", {
			text: "Подтвердить код",
		});

		// Обработчик нажатия кнопки
		confirmButton.addEventListener("click", () => {
			const code = inputEl.value.trim();
			if (code) {
				// Вызываем внешний коллбэк с введённым кодом
				this.onCodeReceived(code);
				this.close(); // Закрываем модальное окно
			} else {
				new Notice("Пожалуйста, введите код авторизации.");
			}
		});
	}
}

// Функция обмена кодом авторизации для OAuth
async function exchangeCode(code: string): Promise<TokenData> {
	// Формирование параментров для запроса
	const params = new URLSearchParams();
	params.append("grant_type", "authorization_code");
	params.append("client_id", CLIENT_ID);
	params.append("client_secret", CLIENT_SECRET);
	params.append("code", code);
	params.append("redirect_uri", REDIRECT_URI);

	// Запрос
	const response = await fetch(TOKEN_URL, {
		method: "POST",
		body: params,
		headers: { "User-Agent": USER_AGENT },
	});

	if (!response.ok) {
		throw new Error(
			`Не удалось обменяться токеном OAuth: ${
				response.status
			} - ${await response.text()}`
		);
	}
	// Возвращаем новый токен
	return (await response.json()) as TokenData;
}

async function saveToken(token: TokenData, tokenPath: string): Promise<void> {
	if (!token) {
		console.log(`Токен для сохранения не найден`);
	} else {
		token.last_update = Math.floor(Date.now() / 1000);
		try {
			fs.writeFileSync(
				tokenPath,
				JSON.stringify(token, null, 2),
				"utf-8"
			);
			console.log(`Токен сохранён в ${tokenPath}`);
		} catch (error) {
			console.error(
				`Ошибка при сохранении токена: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}
}

async function loadToken(): Promise<TokenData | null> {
	/// Функция загрузки токена ///
	// Формирование пути до токена
	const tokenPath = path.join(
		this.app.vault.adapter.basePath,
		".obsidian",
		"plugins",
		"shikimori-obsidian-import",
		TOKEN_FILE
	);
	// Проверка наличия файла
	if (!fs.existsSync(tokenPath)) {
		// Если токен не найден
		new Notice("Токен не найден. Пробуем авторизоваться...");
		const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;

		// Ожидание кода авторизации на сайте
		const codePromise = new Promise<string>((resolve) => {
			new modalCodeWindow(this.app, authUrl, (code) => {
				console.log("DEBUG: Code received in modal callback:", code); // Отладка
				resolve(code); // Разрешаем промис с введённым кодом
			}).open();
		});

		const code = await codePromise;
		if (!code) {
			throw new Error("Неверный код");
		}

		// Запуск функций обмена токенами и СОХРАНЕНИЕМ актуального
		const token = await exchangeCode(code);
		console.log(`Новый полученный токен: ${token}`);
		await saveToken(token, tokenPath);
	} else {
		// Если токен найден
		const raw = fs.readFileSync(tokenPath, "utf8");
		try {
			console.log("Файл есть");
			let tokenData: TokenData = JSON.parse(raw);
			const now = Math.floor(Date.now() / 1000);
			const expiresAt =
				(tokenData.last_update || 0) + tokenData.expires_in;

			// Обновление токена при истечении
			if (now > expiresAt - 300) {
				new Notice("Обновляем токен...");
				const newToken = await this.refresh(
					tokenData.refresh_token || ""
				);
				if (newToken) {
					if (!newToken.refresh_token) {
						newToken.refresh_token = tokenData.refresh_token;
					}
					await this.saveToken(newToken);
					tokenData = newToken;
					new Notice("Токен обновлён.");
				} else {
					return null;
				}
			}

			return tokenData;
		} catch (e) {
			console.error("Не удалось прочитать токен из файла: ", e);
			return null;
		}
	}
	return null;
}

export async function getAccessToken(): Promise<TokenData | null> {
	let token = loadToken();
	if (!token) {
		return null;
	} else {
		return token;
	}
}
