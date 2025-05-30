export function isUndefined(obj: unknown): obj is undefined {
	return typeof obj === 'undefined';
}
