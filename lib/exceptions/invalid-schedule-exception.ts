import { NOT_IDENTIFIED } from '../config.constants';

export class InvalidScheduleException extends Error {
	constructor(identifier?: string | Symbol) {
		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's schedule is not a valid cron syntax`,
		);
	}
}
