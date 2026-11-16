import { formatIdentifier } from '../util/identifier.util';

export class ProcessEnvAssignmentException extends Error {
	constructor(reason: string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's variables cannot be stored on process.env (cache disabled) due "${reason}"`,
		);
	}
}
