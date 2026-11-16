import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class TransformationException extends ExtendedConfigException {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's transformer was not able to transform variables due "${reason}"`,
			{ cause: reason instanceof Error ? reason : undefined, identifier },
		);
	}
}
