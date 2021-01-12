import { DotEnvStrategyOptions } from './dot-env.interface';
import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import { resolve } from 'path';

export const dotEnvLoader = (
	options?: DotEnvStrategyOptions,
): Record<string, any> => {
	const envFilePaths: string[] = options?.path
		? Array.isArray(options.path)
			? options.path
			: [options.path]
		: [resolve(process.cwd(), '.env')];

	let config: ReturnType<typeof dotenv.parse> = {};
	for (const envFilePath of envFilePaths) {
		if (fs.existsSync(envFilePath)) {
			config = Object.assign(
				dotenv.parse(fs.readFileSync(envFilePath, options?.encoding || null)),
				config,
			);

			if (options?.expandVariables) {
				config = dotenvExpand({ parsed: config }).parsed || config;
			}
		}
	}

	return config;
};
