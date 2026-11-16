export interface ConfigChangeEvent {
	/**
	 * "load" for the first load (or preload), "reload" afterwards.
	 */
	reason: 'load' | 'reload';

	/**
	 * Identifier of the strategy whose result triggered the change.
	 */
	identifier?: string | Symbol;

	/**
	 * Top-level keys whose value was added, changed or removed.
	 */
	changedKeys: string[];
}
