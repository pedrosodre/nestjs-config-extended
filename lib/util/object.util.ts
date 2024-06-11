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

	let nestedObj = obj;
	for (let i = 0; i < pathArray.length; i++) {
		let key: string | number = pathArray[i];

		if (nestedObj[key] === undefined) {
			const isIndex = isNaN(Number(pathArray[i + 1]));
			nestedObj[key as keyof T] = isIndex ? {} : [];
		}

		if (i === pathArray.length - 1) {
			nestedObj[key as keyof T] = value;
		}

		nestedObj = nestedObj[key] as Record<keyof T, unknown>;
	}

	return obj;
};
