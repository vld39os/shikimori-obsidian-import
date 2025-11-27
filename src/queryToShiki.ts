import { getAccessToken } from "./getAccessToken";
import { ListToImport } from "./interfaces";

const GRAPHQL_URL = "https://shikimori.one/api/graphql";
const USER_AGENT = "Shikimori Import Obsidian Plugin";

interface GraphQLResponse {
	data?: {
		animes: ListToImport;
		mangas: ListToImport;
	};
	errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
}

// GraphQL запрос
export async function queryToShiki(
	queryTitle: string,
	queryType: string,
	limit: number
): Promise<ListToImport | null> {
	if (!queryTitle.trim()) {
		console.log("Ничего не введено");
		return null;
	}

	const accessToken = await getAccessToken();

	// Потом сделать чтобы это поле редактировалось через настройки плагина
	let query = "";
	if (queryType === "anime") {
		query = `
    query($search: String!) {
      animes(search: $search, limit: ${limit}, kind: "!special") {
        name
        russian
        english
        japanese
        kind
        score
        episodes
        poster { mainUrl }
        genres { name }
        studios { name }
        description
      }
    }
    `;
	}
	if (queryType === "manga") {
		query = `
    query($search: String!) {
      mangas(search: $search, limit: ${limit}) {
        name
        russian
        english
        japanese
        kind
        score
		chapters
		volumes
        poster { mainUrl }
        genres { name }
        description
      }
    }
    `;
	}

	const variables = { search: queryTitle };

	// Сам запрос
	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken?.access_token}`,
			"User-Agent": USER_AGENT,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!response.ok) {
		console.error(
			`Ошибка запроса: ${response.status} - ${response.text()}`
		);
		return null;
	}

	const responseData: unknown = await response.json();

	if (typeof responseData !== "object" || responseData === null) {
		console.log("Вернулся не объект: ", responseData);
		return null;
	}

	const data = responseData as GraphQLResponse;
	console.log(data);

	if (data.errors) {
		console.error("Ошибки GraphQL:");
		data.errors.forEach((err) => console.error("-", err.message));
		return null;
	}

	const animes = data.data?.animes || [];
	const mangas = data.data?.mangas || [];
	if (animes.length === 0 && mangas.length === 0) {
		console.log("Ничего не найдено");
		return null;
	}

	if (mangas.length === 0) {
		return animes;
	} else {
		return mangas;
	}
}
