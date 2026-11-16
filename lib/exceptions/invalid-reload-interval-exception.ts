import { formatIdentifier } from '../util/identifier.util';

export class InvalidReloadIntervalException extends Error {
	constructor(reason: string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's reload interval is invalid due "${reason}"`,
		);
		this.name = 'InvalidReloadIntervalException';
	}
}
