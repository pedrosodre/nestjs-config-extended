import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class InvalidLoaderException extends ExtendedConfigException {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loader is not an instance of LoaderMethod or LoaderClass`,
			{ identifier },
		);
	}
}
