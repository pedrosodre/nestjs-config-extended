import { NOT_IDENTIFIED } from '../config.constants';

export class InvalidTransformerException extends Error {
	constructor(identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's transformer is not an instance of TransformerClass or TransformerMethod`,
		);
	}
}
