import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class LoadingException extends ExtendedConfigException {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loader was not able to load variables due "${reason}"`,
			{ cause: reason instanceof Error ? reason : undefined, identifier },
		);
	}
}
