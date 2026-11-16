import { FileLoaderOptions } from './file.interface';
import { readConfigFile } from './read-config-file.util';

interface YamlParser {
	parse(source: string): unknown;
}

const loadYamlParser = (): YamlParser => {
	try {
		// Loaded lazily so the "yaml" package stays an optional peer dependency.
		// tslint:disable-next-line:no-var-requires
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
	return readConfigFile(options as FileLoaderOptions, 'YAML', content =>
		yaml.parse(content),
	);
};
