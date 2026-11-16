import { formatIdentifier } from '../util/identifier.util';

export class InvalidLoaderException extends Error {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loader is not an instance of LoaderMethod or LoaderClass`,
		);
	}
}
