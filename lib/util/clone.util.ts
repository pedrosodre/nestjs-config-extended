const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/**
 * Maximum nesting depth of configuration values. Deeper (or circular) values
 * are rejected instead of overflowing the stack in the recursive merge,
 * change detection and redaction.
 */
export const MAX_CONFIG_DEPTH = 100;

/**
 * Deep clones plain configuration data (plain objects and arrays). Other
 * values, such as class instances or dates, are kept by reference.
 *
 * Own "__proto__" keys (JSON.parse and yaml.parse create them as data
 * properties) are dropped: assigning them would replace the copy's prototype
 * with config-controlled data instead of copying a value.
 *
 * Throws when the data is circular or nested deeper than MAX_CONFIG_DEPTH.
 */
export const cloneConfigValue = <T>(value: T): T =>
	cloneAt(value, 0, new Set<object>());

const cloneAt = <T>(value: T, depth: number, ancestors: Set<object>): T => {
	if (!Array.isArray(value) && !isPlainObject(value)) {
		return value;
	}

	if (ancestors.has(value as object)) {
		throw new Error(
			'Configuration values must not contain circular references',
		);
	}
	if (depth >= MAX_CONFIG_DEPTH) {
		throw new Error(
			`Configuration values must not be nested more than ${MAX_CONFIG_DEPTH} levels deep`,
		);
	}

	ancestors.add(value as object);
	try {
		if (Array.isArray(value)) {
			return value.map(item =>
				cloneAt(item, depth + 1, ancestors),
			) as unknown as T;
		}

		const source = value as Record<string, unknown>;
		const copy: Record<string, unknown> = {};
		for (const key of Object.keys(source)) {
			if (key === '__proto__') continue;
			copy[key] = cloneAt(source[key], depth + 1, ancestors);
		}
		return copy as T;
	} finally {
		ancestors.delete(value as object);
	}
};

/**
 * Shallow copy of a loader result's own enumerable keys, without "__proto__".
 * Used instead of object spread, which compiles to Object.assign for the
 * es6 target and would let an own "__proto__" key replace the prototype.
 */
export const copyConfigEntries = (
	value: Record<string, any>,
): Record<string, any> => {
	const copy: Record<string, any> = {};
	for (const key of Object.keys(value)) {
		if (key === '__proto__') continue;
		copy[key] = value[key];
	}
	return copy;
};
