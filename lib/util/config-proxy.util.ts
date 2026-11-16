const asRecord = (value: unknown): Record<PropertyKey, unknown> =>
	value !== null && typeof value === 'object'
		? (value as Record<PropertyKey, unknown>)
		: {};

/**
 * Read-only proxy that always reflects the current value returned by the
 * getter, so injected or cached references see reloaded configuration.
 * Supports property access, "in", Object.keys, spreading and JSON.stringify.
 */
export const createConfigProxy = <T extends object>(getter: () => unknown): T =>
	new Proxy({} as T, {
		get: (_target, property) => asRecord(getter())[property as string],
		has: (_target, property) => property in asRecord(getter()),
		ownKeys: () => Reflect.ownKeys(asRecord(getter())),
		getOwnPropertyDescriptor: (_target, property) => {
			const current = asRecord(getter());
			if (!Object.prototype.hasOwnProperty.call(current, property)) {
				return undefined;
			}
			return {
				value: current[property as string],
				writable: false,
				enumerable: true,
				configurable: true,
			};
		},
		set: () => false,
		deleteProperty: () => false,
		defineProperty: () => false,
	});
