import * as fs from 'fs';
import { resolve } from 'path';
import { FileLoaderOptions } from './file.interface';

export const readConfigFile = (
	options: FileLoaderOptions | undefined,
	format: string,
	parse: (content: string) => unknown,
): Record<string, any> => {
	if (!options?.path) {
		throw new Error(`${format} file loader requires the "path" option`);
	}

	const filePath = resolve(process.cwd(), options.path);

	if (!fs.existsSync(filePath)) {
		if (options.optional) {
			return {};
		}
		throw new Error(`${format} file not found: ${filePath}`);
	}

	const content = fs.readFileSync(filePath, options.encoding || 'utf8');
	const parsed = parse(content);

	if (parsed === undefined || parsed === null) {
		return {};
	}

	if (typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(
			`${format} file must contain an object at the top level: ${filePath}`,
		);
	}

	return parsed as Record<string, any>;
};
