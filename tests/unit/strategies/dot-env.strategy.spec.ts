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

	it('dotEnvLoader() should not write expanded variables into process.env', () => {
		const before = { ...process.env };
		const variables = dotEnvLoader({
			path: join(__dirname, '.env'),
			expandVariables: true,
		});

		expect(variables.BASE_URL).toBe('http://127.0.0.1:3000');
		expect(process.env.PORT).toBe(before.PORT);
		expect(process.env.BASE_URL).toBe(before.BASE_URL);
		expect(process.env).toEqual(before);
	});

	it('dotEnvLoader() should still expand references to existing process.env values', () => {
		process.env.DOT_ENV_SPEC_HOST = 'example.com';
		const variables = dotEnvLoader({
			path: join(__dirname, '.env.process'),
			expandVariables: true,
		});
		delete process.env.DOT_ENV_SPEC_HOST;

		expect(variables.URL).toBe('https://example.com');
	});
});
