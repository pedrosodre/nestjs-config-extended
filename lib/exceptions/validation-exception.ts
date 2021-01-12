import { NOT_IDENTIFIED } from '../config.constants';

export class ValidationException extends Error {
	constructor(reason: Error | string, identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's loaded variables cannot be validated by validator due "${reason}"`,
		);
	}
}
