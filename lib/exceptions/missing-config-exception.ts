export class MissingConfigException extends Error {
	constructor(readonly path: string) {
		super(`Configuration value "${path}" is not defined`);
		this.name = 'MissingConfigException';
	}
}
