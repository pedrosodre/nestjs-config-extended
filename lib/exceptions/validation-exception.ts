import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class ValidationException extends ExtendedConfigException {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loaded variables cannot be validated by validator due "${reason}"`,
			{ cause: reason instanceof Error ? reason : undefined, identifier },
		);
	}
}
