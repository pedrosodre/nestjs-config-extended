import { FileLoaderOptions } from './file.interface';
import { readConfigFile } from './read-config-file.util';

interface YamlParser {
	parse(source: string, options?: { prettyErrors?: boolean }): unknown;
}

interface YamlError {
	code?: string;
	message?: string;
	pos?: [number, number];
}

const loadYamlParser = (): YamlParser => {
	try {
		// Loaded lazily so the "yaml" package stays an optional peer dependency.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require('yaml') as YamlParser;
	} catch {
		throw new Error(
			'yamlFileLoader requires the "yaml" package. Install it with: npm install yaml',
		);
	}
};

/**
 * Loads variables from a YAML file. Requires the optional "yaml" package.
 */
export const yamlFileLoader = (
	options?: FileLoaderOptions | Record<string, any>,
): Record<string, any> => {
	const yaml = loadYamlParser();
	return readConfigFile(options as FileLoaderOptions, 'YAML', content => {
		try {
			// prettyErrors (the default) appends the offending source lines to the
			// message, which would put configuration values (secrets) into errors,
			// getStatus().lastError, health output and logs.
			return yaml.parse(content, { prettyErrors: false });
		} catch (err) {
			throw new Error(describeYamlError(err as YamlError, content));
		}
	});
};

const describeYamlError = (error: YamlError, content: string): string => {
	const line =
		typeof error.pos?.[0] === 'number'
			? content.slice(0, error.pos[0]).split('\n').length
			: undefined;
	return [
		'Invalid YAML',
		line ? ` at line ${line}` : '',
		error.code ? ` (${error.code})` : '',
		`: ${error.message ?? 'parse error'}`,
	].join('');
};
