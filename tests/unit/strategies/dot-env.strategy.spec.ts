import { dotEnvLoader } from '../../../lib';
import { join } from 'path';

describe('[Strategy] Dot Env', () => {
	it('dotEnvLoader() should retrieve all variables with an empty options object', () => {
		const variables = dotEnvLoader();
		expect(variables.PORT).toBeUndefined();
	});

	it('dotEnvLoader() should retrieve all variables from .env', () => {
		const variables = dotEnvLoader({
			path: join(__dirname, '.env'),
		});

		expect(variables.PORT).toBe('3000');
		expect(variables.BASE_URL).toBe('http://127.0.0.1:${PORT}');
	});

	it('dotEnvLoader() should retrieve all variables from path array with UTF-8 encoding', () => {
		const variables = dotEnvLoader({
			path: [join(__dirname, '.env')],
			encoding: 'UTF-8',
		});

		expect(variables.PORT).toBe('3000');
		expect(variables.BASE_URL).toBe('http://127.0.0.1:${PORT}');
	});

	it('dotEnvLoader() should retrieve all variables from .env and expand it', () => {
		const variables = dotEnvLoader({
			path: join(__dirname, '.env'),
			expandVariables: true,
		});

		expect(variables.PORT).toBe('3000');
		expect(variables.BASE_URL).toBe('http://127.0.0.1:3000');
	});
});
