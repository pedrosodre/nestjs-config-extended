import { formatIdentifier } from '../util/identifier.util';

export class InvalidValidatorException extends Error {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's validator is not an instance of ValidatorMethod or ValidatorClass`,
		);
	}
}
