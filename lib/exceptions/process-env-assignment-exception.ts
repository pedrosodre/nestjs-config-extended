import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class ProcessEnvAssignmentException extends ExtendedConfigException {
	constructor(reason: string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's variables cannot be stored on process.env (cache disabled) due "${reason}"`,
			{ identifier },
		);
	}
}
