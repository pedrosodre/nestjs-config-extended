import { formatIdentifier } from '../util/identifier.util';

export class InvalidScheduleException extends Error {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's schedule is not a valid cron syntax`,
		);
	}
}
