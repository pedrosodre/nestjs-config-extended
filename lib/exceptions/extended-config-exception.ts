export interface ExtendedConfigExceptionOptions {
	/**
	 * Original error that caused this one (loader, validator or transformer error).
	 */
	cause?: unknown;

	/**
	 * Identifier of the strategy involved, if any.
	 */
	identifier?: string | symbol;
}

/**
 * Base class of every error thrown by this module, so applications can catch
 * them with a single `instanceof ExtendedConfigException` check.
 */
export abstract class ExtendedConfigException extends Error {
	declare readonly cause?: unknown;

	/**
	 * Identifier of the strategy involved, if any.
	 */
	readonly identifier?: string | symbol;

	protected constructor(
		message: string,
		options: ExtendedConfigExceptionOptions = {},
	) {
		super(message);
		this.name = new.target.name;

		if (options.cause !== undefined) {
			// Same shape as the native `new Error(message, { cause })`.
			Object.defineProperty(this, 'cause', {
				value: options.cause,
				writable: true,
				configurable: true,
				enumerable: false,
			});
		}

		if (options.identifier !== undefined) {
			this.identifier = options.identifier;
		}
	}
}
