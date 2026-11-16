import { FileLoaderOptions } from './file.interface';
import { readConfigFile } from './read-config-file.util';

/**
 * Loads variables from a JSON file. Nested objects are kept as nested values.
 */
export const jsonFileLoader = (
	options?: FileLoaderOptions | Record<string, any>,
): Record<string, any> =>
	readConfigFile(options as FileLoaderOptions, 'JSON', content =>
		JSON.parse(content),
	);
