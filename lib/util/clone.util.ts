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
 */
export const cloneConfigValue = <T>(value: T): T => {
	if (Array.isArray(value)) {
		return (value.map(item => cloneConfigValue(item)) as unknown) as T;
	}

	if (isPlainObject(value)) {
		const copy: Record<string, unknown> = {};
		for (const key of Object.keys(value)) {
			copy[key] = cloneConfigValue(value[key]);
		}
		return copy as T;
	}

	return value;
};
