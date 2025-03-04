import readline from 'readline';
import { saveCache } from '../utils/cache';

const ITEMS_PER_PAGE = 10;

interface Episode {
	id: string;
	title: string;
	duration: number; // seconds
	watched?: boolean;
}

interface PlaylistData {
	playlistId: string;
	details: any;
	items: any[];
}

export function startTUI(playlistData: PlaylistData) {
	const episodes: Episode[] = playlistData.items.map(
		(item: any, index: number) => ({
			id: item.id || String(index),
			title: item?.title || `Episode ${index + 1}`,
			duration: Number(item?.duration) || 0,
			watched: item.watched ?? false,
		})
	);

	markEpisodes(playlistData.playlistId, playlistData.details, episodes);
}

// allow keypress
readline.emitKeypressEvents(process.stdin);

function markEpisodes(playlistId: string, details: any, episodes: Episode[]) {
	let currentIndex = 0; // cursor index
	let windowStart = 0; // start index of the current viewable window

	// enable raw mode and resume stdin for keep process active
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
	}

	function render() {
		console.clear();
		console.log(
			'\nUse ↑/↓ to navigate, Enter/Space to toggle watched, Q to quit.\n'
		);

		const windowEnd = Math.min(
			windowStart + ITEMS_PER_PAGE,
			episodes.length
		);
		for (let i = windowStart; i < windowEnd; i++) {
			const pointer = i === currentIndex ? '>' : ' ';
			const status = episodes[i].watched ? '[X]' : '[ ]';
			console.log(
				`${pointer} ${String(i + 1).padStart(3, '0')}. ${status} ${
					episodes[i].title
				} (${formatTime(episodes[i].duration)})`
			);
		}
		console.log(
			`\nShowing ${windowStart + 1}–${windowEnd} of ${
				episodes.length
			} episodes.`
		);

		console.log(`\n${computeRating(episodes)}`);
	}

	const onKeyPress = (_str: string, key: any) => {
		if (key.name === 'up') {
			if (currentIndex > 0) {
				currentIndex--;
				if (currentIndex < windowStart) {
					windowStart = currentIndex;
				}
			}
		} else if (key.name === 'down') {
			if (currentIndex < episodes.length - 1) {
				currentIndex++;
				if (currentIndex >= windowStart + ITEMS_PER_PAGE) {
					windowStart = currentIndex - ITEMS_PER_PAGE + 1;
				}
			}
		} else if (key.name === 'space' || key.name === 'return') {
			// toggle watched flag.
			episodes[currentIndex].watched = !episodes[currentIndex].watched;
			// immediately update
			const cacheData = {
				details: details,
				items: episodes,
			};
			saveCache(playlistId, cacheData);
		} else if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
			// Clean up:
			// set raw mode off
			// remove key listener
			// clear screen
			// exit
			process.stdin.setRawMode(false);
			process.stdin.off('keypress', onKeyPress);
			process.stdin.pause();
			console.clear();
			process.exit();
		}
		render();
	};

	process.stdin.on('keypress', onKeyPress);
	render();
}

function computeRating(episodes: Episode[]) {
	const [watchedDuration, totalDuration] = episodes.reduce(
		(acc, episode) => {
			acc[0] += episode.watched ? episode.duration : 0;
			acc[1] += episode.duration;
			return acc;
		},
		[0, 0]
	);
	const rating = totalDuration
		? ((watchedDuration / totalDuration) * 100).toFixed(2)
		: '0';
	return `You watched ${formatTime(watchedDuration)} out of ${formatTime(
		totalDuration
	)} (${rating}%)`;
}

function formatTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const remainder = seconds % 3600;
	const m = Math.floor(remainder / 60);
	const s = remainder % 60;
	let result = '';
	if (h > 0) {
		result += `${h.toString().padStart(2, '0')}h `;
	}
	result += `${m.toString().padStart(2, '0')}m ${s
		.toString()
		.padStart(2, '0')}s`;
	return result;
}
