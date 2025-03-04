import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache');

if (!fs.existsSync(CACHE_DIR)) {
	fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function getCacheFilePath(playlistId: string): string {
	return path.join(CACHE_DIR, `playlist-${playlistId}.json`);
}

export function loadCache(playlistId: string): any | null {
	const cacheFile = getCacheFilePath(playlistId);
	if (fs.existsSync(cacheFile)) {
		try {
			return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
		} catch (err) {
			return null;
		}
	}
	return null;
}

export function saveCache(playlistId: string, data: object) {
	const cacheFile = getCacheFilePath(playlistId);
	fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}
