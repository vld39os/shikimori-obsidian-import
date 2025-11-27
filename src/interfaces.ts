interface BaseList {
	name: string;
	russian: string;
	english: string;
	japanese: string;
	kind: string;
	score: number;
	description: string;
	poster: Poster;
	genres: Genres[];
}

interface AnimeList extends BaseList {
	episodes: number;
	studios: Studios[];
	watched: boolean;
	whenWatched: number;
}

interface MangaList extends BaseList {
	chapters: number;
	volumes: number;
	read: boolean;
	lastChapterRead: number;
}

export type ImportableItem = AnimeList | MangaList;

export type ListToImport = ImportableItem[];

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
