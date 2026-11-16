const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const setOn = <
	T extends Record<string, unknown> = Record<string, unknown>
>(
	obj: Record<keyof T, unknown>,
	path: number | symbol | string | string[],
	value: unknown,
): Record<keyof T, unknown> => {
	const validPathCharactersRegex = /([^[.\]])+/g;

	const pathArray = Array.isArray(path)
		? path
		: String(path).match(validPathCharactersRegex);

	if (!pathArray) return obj;

	if (pathArray.some(key => UNSAFE_KEYS.has(String(key)))) return obj;

	let nestedObj = obj;
	for (let i = 0; i < pathArray.length; i++) {
		const key: string | number = pathArray[i];

		if (i === pathArray.length - 1) {
			nestedObj[key as keyof T] = value;
			break;
		}

		const current = nestedObj[key];
		if (current === null || typeof current !== 'object') {
			// Intermediate segment is missing or a primitive: replace it with a
			// container (same semantics as lodash.set) instead of throwing.
			const nextIsIndex = !isNaN(Number(pathArray[i + 1]));
			nestedObj[key as keyof T] = nextIsIndex ? [] : {};
		}

		nestedObj = nestedObj[key] as Record<keyof T, unknown>;
	}

	return obj;
};
