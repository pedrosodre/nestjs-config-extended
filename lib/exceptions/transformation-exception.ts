import { NOT_IDENTIFIED } from '../config.constants';

export class TransformationException extends Error {
	constructor(reason: Error | string, identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's transformer was not able to transform variables due "${reason}"`,
		);
	}
}
