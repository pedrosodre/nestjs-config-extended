import { formatIdentifier } from '../util/identifier.util';

export class LoadingException extends Error {
	constructor(reason: Error | string, identifier?: string | symbol) {
		super(
			`${formatIdentifier(identifier)} strategy's loader was not able to load variables due "${reason}"`,
		);
	}
}
