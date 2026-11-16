export interface RedactOptions {
	/**
	 * Extra keys to mask, in addition to the defaults (password, secret, token,
	 * api key, private key, credential, session, cookie, salt, signature).
	 * Strings match a key exactly (case-insensitive), regular expressions test it.
	 */
	keys?: (string | RegExp)[];

	/**
	 * Text that replaces masked values. Defaults to "[REDACTED]".
	 */
	replacement?: string;
}
