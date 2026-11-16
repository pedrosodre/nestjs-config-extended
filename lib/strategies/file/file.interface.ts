export interface FileLoaderOptions {
	/**
	 * Path of the configuration file. Relative paths are resolved from process.cwd().
	 */
	path: string;

	/**
	 * File encoding. Defaults to "utf8".
	 */
	encoding?: string;

	/**
	 * If "true", a missing file loads no variables instead of failing.
	 */
	optional?: boolean;
}
