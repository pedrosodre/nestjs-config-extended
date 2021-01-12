import { NOT_IDENTIFIED } from '../config.constants';

export class LoadingException extends Error {
	constructor(reason: Error | string, identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's loader was not able to load variables due "${reason}"`,
		);
	}
}
