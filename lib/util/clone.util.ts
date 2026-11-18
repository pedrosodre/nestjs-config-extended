const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== 'object') {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/**
 * Deep clones plain configuration data (plain objects and arrays). Other
 * values, such as class instances or dates, are kept by reference.
 *
 * Own "__proto__" keys (JSON.parse and yaml.parse create them as data
 * properties) are dropped: assigning them would replace the copy's prototype
 * with config-controlled data instead of copying a value.
 */
export const cloneConfigValue = <T>(value: T): T => {
	if (Array.isArray(value)) {
		return value.map(item => cloneConfigValue(item)) as unknown as T;
	}

	if (isPlainObject(value)) {
		const copy: Record<string, unknown> = {};
		for (const key of Object.keys(value)) {
			if (key === '__proto__') continue;
			copy[key] = cloneConfigValue(value[key]);
		}
		return copy as T;
	}

	return value;
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
