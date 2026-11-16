/**
 * Structural equality for configuration values (primitives, arrays, plain
 * objects and dates).
 */
export const isDeepEqual = (a: unknown, b: unknown): boolean => {
	if (Object.is(a, b)) {
		return true;
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime();
	}

	if (
		typeof a !== 'object' ||
		typeof b !== 'object' ||
		a === null ||
		b === null ||
		Array.isArray(a) !== Array.isArray(b)
	) {
		return false;
	}

	const aRecord = a as Record<string, unknown>;
	const bRecord = b as Record<string, unknown>;
	const aKeys = Object.keys(aRecord);
	const bKeys = Object.keys(bRecord);

	return (
		aKeys.length === bKeys.length &&
		aKeys.every(
			key =>
				Object.prototype.hasOwnProperty.call(bRecord, key) &&
				isDeepEqual(aRecord[key], bRecord[key]),
		)
	);
};
