import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class InvalidValidatorException extends ExtendedConfigException {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's validator is not an instance of ValidatorMethod or ValidatorClass`,
			{ identifier },
		);
	}
}
