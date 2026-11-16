import { formatIdentifier } from '../util/identifier.util';

export class TransformationException extends Error {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's transformer was not able to transform variables due "${reason}"`,
		);
	}
}
