import { NOT_IDENTIFIED } from '../config.constants';

export class InvalidValidatorException extends Error {
	constructor(identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's validator is not an instance of ValidatorMethod or ValidatorClass`,
		);
	}
}
