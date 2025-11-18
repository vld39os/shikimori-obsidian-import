import { getAccessToken } from "./getAccessToken";

const GRAPHQL_URL = "https://shikimori.one/api/graphql";
const USER_AGENT = "Api Test";

interface AnimeList {
	name: string;
	russian: string;
	english: string;
	japanese: string;
	kind: string;
	score: number;
	episodes: number;
	poster: string;
	genres: string[];
	studios: string[];
	description: string;
}

interface GraphQLResponse {
	data?: {
		animes: AnimeList[];
	};
	errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
}

// GraphQL запрос
export async function queryToShiki(
	queryTitle: string
): Promise<AnimeList[] | null> {
	if (!queryTitle.trim()) {
		console.log("Ничего не введено");
		return null;
	}

	const accessToken = await getAccessToken();
	console.log(accessToken);

	// Потом сделать чтобы это поле редактировалось через настройки плагина
	const query = `
    query($search: String!) {
      animes(search: $search, limit: 5, kind: "!special") {
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
	if (animes.length === 0) {
		console.log("Ничего не найдено");
		return null;
	}

	return animes;
}
