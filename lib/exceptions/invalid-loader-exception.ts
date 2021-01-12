import { NOT_IDENTIFIED } from '../config.constants';

export class InvalidLoaderException extends Error {
	constructor(identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's loader is not an instance of LoaderMethod or LoaderClass`,
		);
	}
}
