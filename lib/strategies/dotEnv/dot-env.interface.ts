export interface DotEnvStrategyOptions {
	/**
	 * You may specify one or more custom paths if your files containing environment variables is located elsewhere.
	 */
	path?: string | string[];

	/**
	 * You may specify the encoding of your files containing environment variables.
	 */
	encoding?: string;

	/**
	 * You may turn on to allow it to expand loaded variables.
	 */
	expandVariables?: boolean;
}
