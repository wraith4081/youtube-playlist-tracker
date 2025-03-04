import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

const VIDEO_CACHE_DIR = path.resolve(process.cwd(), '.cache', 'videos');
if (!fs.existsSync(VIDEO_CACHE_DIR)) {
	fs.mkdirSync(VIDEO_CACHE_DIR, { recursive: true });
}

function getVideoCachePath(videoId: string): string {
	return path.join(VIDEO_CACHE_DIR, `video-${videoId}.json`);
}

function loadVideoCache(videoId: string): number | null {
	const cacheFile = getVideoCachePath(videoId);
	if (fs.existsSync(cacheFile)) {
		try {
			const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
			return data.duration;
		} catch (err) {
			return null;
		}
	}
	return null;
}

function saveVideoCache(videoId: string, duration: number) {
	const cacheFile = getVideoCachePath(videoId);
	fs.writeFileSync(cacheFile, JSON.stringify({ duration }));
}
	
// parses ISO 8601 duration (supports hours, minutes, seconds)
function parseDuration(isoDuration: string): number {
	if (!isoDuration) return 0;
	const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
	const matches = isoDuration.match(regex);
	if (!matches) return 0;
	const hours = matches[1] ? parseInt(matches[1], 10) : 0;
	const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
	const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
	return hours * 3600 + minutes * 60 + seconds;
}

export async function getVideoDuration(
	videoId: string,
	auth: OAuth2Client
): Promise<number> {
	const cachedDuration = loadVideoCache(videoId);
	if (cachedDuration !== null) {
		return cachedDuration;
	}

	try {
		const service = google.youtube('v3');
		const response = await service.videos.list({
			auth,
			part: ['contentDetails'],
			id: [videoId],
		});
		const items = response.data.items;
		if (!items || items.length === 0) return 0;
		const durationISO = items[0].contentDetails?.duration || '';
		const duration = parseDuration(durationISO);
		saveVideoCache(videoId, duration);
		return duration;
	} catch (err) {
		console.error(err);
		return 0;
	}
}
