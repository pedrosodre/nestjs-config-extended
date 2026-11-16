import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class InvalidReloadIntervalException extends ExtendedConfigException {
	constructor(reason: string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's reload interval is invalid due "${reason}"`,
			{ identifier },
		);
	}
}
