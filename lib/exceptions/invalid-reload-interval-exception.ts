import { NOT_IDENTIFIED } from '../config.constants';

export class InvalidReloadIntervalException extends Error {
	constructor(reason: string, identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's reload interval is invalid due "${reason}"`,
		);
		this.name = 'InvalidReloadIntervalException';
	}
}
