import { RedactOptions } from '../interfaces/redact-options.interface';

export const DEFAULT_REDACT_KEYS: ReadonlyArray<RegExp> = [
	/pass(word|wd|phrase)?|secret|token|api[-_]?key|private[-_]?key|credential|session|cookie|salt|signature/i,
];
export const DEFAULT_REDACT_REPLACEMENT = '[REDACTED]';

// Matches the credentials of URLs such as postgres://user:password@host.
// Anchored on "://" (no scheme pattern) so matching stays linear on any input.
const URL_CREDENTIALS = /:\/\/([^:/@\s]*):[^@/\s]+@/g;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

const matchesKey = (key: string, patterns: ReadonlyArray<string | RegExp>) =>
	patterns.some(pattern => {
		if (typeof pattern === 'string') {
			return pattern.toLowerCase() === key.toLowerCase();
		}
		pattern.lastIndex = 0;
		return pattern.test(key);
	});

/**
 * Returns a deep copy of the configuration with sensitive values replaced.
 * Keys matching the default patterns (password, secret, token, api key, ...) or
 * the custom ones are masked, and credentials embedded in URLs are removed.
 */
export const redactConfig = (
	value: unknown,
	options: RedactOptions = {},
): any => {
	const patterns = [...DEFAULT_REDACT_KEYS, ...(options.keys || [])];
	const replacement = options.replacement ?? DEFAULT_REDACT_REPLACEMENT;

	const redact = (current: unknown): unknown => {
		if (typeof current === 'string') {
			// Function replacer, so "$" patterns in a custom replacement stay literal.
			return current.replace(
				URL_CREDENTIALS,
				(_match, user: string) => `://${user}:${replacement}@`,
			);
		}

		if (Array.isArray(current)) {
			return current.map(redact);
		}

		if (isPlainObject(current)) {
			const copy: Record<string, unknown> = {};
			for (const key of Object.keys(current)) {
				copy[key] = matchesKey(key, patterns)
					? replacement
					: redact(current[key]);
			}
			return copy;
		}

		return current;
	};

	return redact(value);
};
