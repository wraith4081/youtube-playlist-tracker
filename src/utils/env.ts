import { z } from 'zod';
import Logger from './logger';

const envSchema = z.object({
	CREDENTIALS_PATH: z.string().default('.credentials/oauth.json'),
	TOKEN_PATH: z.string().default('.credentials/token.json'),
});

export default async function validateEnv() {
	const env = process.env;

	try {
		envSchema.parse(env);
		Logger.debug('Environment variables are valid');
	} catch (error) {
		Logger.error('Environment variables are invalid');
		process.exit(1);
	}
}

export type Env = z.infer<typeof envSchema>;

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Env {}
	}
}