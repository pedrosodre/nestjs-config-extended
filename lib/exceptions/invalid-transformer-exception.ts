import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';

export class InvalidTransformerException extends ExtendedConfigException {
	constructor(identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's transformer is not an instance of TransformerClass or TransformerMethod`,
			{ identifier },
		);
	}
}
