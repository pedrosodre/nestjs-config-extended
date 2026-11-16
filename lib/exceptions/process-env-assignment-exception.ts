import { NOT_IDENTIFIED } from '../config.constants';

export class ProcessEnvAssignmentException extends Error {
	constructor(reason: string, identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's variables cannot be stored on process.env (cache disabled) due "${reason}"`,
		);
	}
}
