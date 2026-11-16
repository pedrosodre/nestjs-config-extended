import { formatIdentifier } from '../util/identifier.util';

export class ValidationException extends Error {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loaded variables cannot be validated by validator due "${reason}"`,
		);
	}
}
