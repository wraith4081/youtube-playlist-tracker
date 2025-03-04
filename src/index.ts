import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import validateEnv from './utils/env';
import { readCredentialsFile, readTokenFile } from './utils/fs';
import Logger from './utils/logger';
import { loadCache, saveCache } from './utils/cache';
import { startTUI } from './ui/tui';
import { getVideoDuration } from './utils/video';

dotenv.config();
const OAuth2 = google.auth.OAuth2;

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

async function main() {
	await validateEnv();

	const CREDENTIALS_PATH = path.resolve(
		process.cwd(),
		process.env.CREDENTIALS_PATH
	);
	const TOKEN_PATH = path.resolve(process.cwd(), process.env.TOKEN_PATH);

	const credentials = readCredentialsFile(CREDENTIALS_PATH);
	const client = new OAuth2(
		credentials.installed.client_id,
		credentials.installed.client_secret,
		credentials.installed.redirect_uris[0]
	);

	if (fs.existsSync(TOKEN_PATH)) {
		const token = readTokenFile(TOKEN_PATH);

		client.setCredentials(token);
	} else {
		const authUrl = client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES,
		});

		Logger.info('Authorize this app by visiting this url: ' + authUrl);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question('Enter the code from that page here: ', function (code) {
			rl.close();

			client.getToken(code, function (err, token) {
				if (err || !token) {
					Logger.error(
						'Error while trying to retrieve access token: ' +
							(err ?? '')
					);
					return;
				}

				client.setCredentials(token);

				fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
					if (err) {
						console.error(err);
						return;
					}
				});

				Logger.info('Token stored to ' + TOKEN_PATH);
				Logger.info('Please restart the application to continue');
			});
		});
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter playlist ID: ', async (playlistId: string) => {
		rl.close();
		let playlistData: any;

		playlistData = loadCache(playlistId);
		if (playlistData) {
			Logger.info('Loaded playlist data from cache.');
		} else {
			// fetch playlist details and items
			playlistData = {};
			playlistData.details = await getPlaylist(client, playlistId);
			playlistData.items = (
				await getPlaylistItems(client, playlistId)
			).map((video) => ({
				title: video.snippet.title,
				position: video.snippet.position,
				videoId: video.snippet.resourceId.videoId,
				duration: video.contentDetails.duration,
			}));
			saveCache(playlistId, playlistData);
			Logger.info('Fetched and cached playlist data.');
		}

		const playlistDataFromCache = loadCache(playlistId);
		if (playlistDataFromCache) {
			Logger.info('Loaded playlist data from cache.');
			startTUI({
				playlistId,
				details: playlistDataFromCache.details,
				items: playlistDataFromCache.items,
			});
		} else {
			const details = await getPlaylist(client, playlistId);
			const items = await getPlaylistItems(client, playlistId);
			const data = { details, items };
			saveCache(playlistId, data);
			Logger.info('Fetched and cached playlist data.');
			startTUI({ playlistId, details, items });
		}
	});
}

main();

async function getPlaylist(auth: OAuth2Client, playlistId: string) {
	const service = google.youtube('v3');
	try {
		const response = await new Promise<any>((resolve, reject) => {
			service.playlists.list(
				{
					auth: auth,
					part: [
						'snippet',
						'contentDetails',
						'status',
						'player',
						'localizations',
					],
					id: [playlistId],
				},
				(err, response) => {
					if (err || !response) {
						reject(err);
					} else {
						resolve(response);
					}
				}
			);
		});
		const playlists = response.data.items || [];
		return playlists;
	} catch (err) {
		console.error('Error retrieving playlist: ', err);
		return [];
	}
}

async function getPlaylistItems(
	auth: OAuth2Client,
	playlistId: string
): Promise<any[]> {
	const service = google.youtube('v3');
	let items: any[] = [];
	let nextPageToken: string | undefined = undefined;
	do {
		// paginated fetch with maxResults set to 50 (the maximum allowed)
		const response = await new Promise<any>((resolve, reject) => {
			service.playlistItems.list(
				{
					auth: auth,
					part: ['snippet', 'contentDetails', 'status', 'id'],
					playlistId: playlistId,
					maxResults: 50,
					pageToken: nextPageToken,
				},
				(err, response) => {
					if (err || !response) {
						reject(err);
					} else {
						resolve(response);
					}
				}
			);
		});
		items = items.concat(response.data.items || []);
		const durations = await Promise.all(
			items.map(async (item) => {
				const videoId = item.snippet.resourceId.videoId;
				const duration = await getVideoDuration(videoId, auth);
				return { videoId, duration };
			})
		);

		// merge durations into items
		for (const duration of durations) {
			const item = items.find(
				(item) => item.snippet.resourceId.videoId === duration.videoId
			);
			if (item) {
				item.contentDetails.duration = duration.duration;
			}
		}

		nextPageToken = response.data.nextPageToken;
	} while (nextPageToken);
	return items;
}
