import { z, ZodError } from 'zod';
import fs from 'fs';
import Logger from './logger';
import { stringifyError } from './zod';

const CredentialsSchema = z.object({
	installed: z.object({
		client_id: z.string(),
		client_secret: z.string(),
		auth_uri: z.string(),
		token_uri: z.string(),
		auth_provider_x509_cert_url: z.string(),
		project_id: z.string(),
		redirect_uris: z.array(z.string()),
	}),
});

const TokenSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	scope: z.string(),
	token_type: z.string(),
	expiry_date: z.number(),
});

export function readCredentialsFile(
	path: string
): z.infer<typeof CredentialsSchema> {
	try {
		const file = fs.readFileSync(path, 'utf-8');

		return CredentialsSchema.parse(JSON.parse(file));
	} catch (e) {
		Logger.error(
			'Failed to read credentials file: ' +
				(e instanceof ZodError ? stringifyError(e) : e.toString())
		);
		process.exit(1);
	}
}

export function readTokenFile(path: string): z.infer<typeof TokenSchema> {
	try {
		const file = fs.readFileSync(path, 'utf-8');

		return TokenSchema.parse(JSON.parse(file));
	} catch (e) {
		Logger.error(
			'Failed to read token file: ' +
				(e instanceof ZodError ? stringifyError(e) : e.toString())
		);
		process.exit(1);
	}
}

export function writeTokenFile(
	path: string,
	token: z.infer<typeof TokenSchema>
) {
	try {
		fs.writeFileSync(path, JSON.stringify(token, null, 2));
	} catch (e) {
		Logger.error(
			'Failed to write token file: ' +
				(e instanceof ZodError ? stringifyError(e) : e.toString())
		);
		process.exit(1);
	}
}
