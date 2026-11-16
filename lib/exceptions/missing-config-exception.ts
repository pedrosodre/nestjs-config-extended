import { ExtendedConfigException } from './extended-config-exception';
export class MissingConfigException extends ExtendedConfigException {
	constructor(readonly path: string) {
		super(`Configuration value "${path}" is not defined`);
	}
}
