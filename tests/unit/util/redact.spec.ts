import { Logger } from '@nestjs/common';
import { inspect } from 'util';
import { ExtendedConfigService, redactConfig } from '../../../lib';

describe('redactConfig', () => {
	it('should mask default sensitive keys at any depth', () => {
		expect(
			redactConfig({
				PORT: 3000,
				DB_PASSWORD: 'p',
				db: { user: 'u', passwd: 'p', apiKey: 'k', API_KEY: 'k' },
				list: [{ token: 't', name: 'n' }],
				JWT_SECRET: 's',
				AUTHOR: 'not a secret',
			}),
		).toEqual({
			PORT: 3000,
			DB_PASSWORD: '[REDACTED]',
			db: {
				user: 'u',
				passwd: '[REDACTED]',
				apiKey: '[REDACTED]',
				API_KEY: '[REDACTED]',
			},
			list: [{ token: '[REDACTED]', name: 'n' }],
			JWT_SECRET: '[REDACTED]',
			AUTHOR: 'not a secret',
		});
	});

	it('should mask credentials embedded in URLs', () => {
		expect(
			redactConfig({
				DATABASE_URL: 'postgres://user:s3cr3t@db:5432/app',
				PLAIN_URL: 'https://example.com/path',
			}),
		).toEqual({
			DATABASE_URL: 'postgres://user:[REDACTED]@db:5432/app',
			PLAIN_URL: 'https://example.com/path',
		});
	});

	it('should support custom keys and replacement without mutating the input', () => {
		const input = { INTERNAL_ID: 'x', other: { iban: 'y' }, KEEP: 'z' };
		expect(
			redactConfig(input, {
				keys: ['internal_id', /^iban$/i],
				replacement: '***',
			}),
		).toEqual({ INTERNAL_ID: '***', other: { iban: '***' }, KEEP: 'z' });
		expect(input.INTERNAL_ID).toBe('x');
	});
});

describe('ExtendedConfigService redaction', () => {
	const createService = (redact?: any) =>
		new ExtendedConfigService<any>(
			{
				strategies: [
					{ loader: () => ({ PORT: 1, DB_PASSWORD: 'p' }) },
					{ loader: () => ({ token: 't' }), registerAs: 'auth' },
				],
				redact,
			},
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			new Logger(),
		);

	it('toJSON(), JSON.stringify and util.inspect should mask secrets', async () => {
		const service = createService();
		await service.load();

		const expected = {
			PORT: 1,
			DB_PASSWORD: '[REDACTED]',
			auth: { token: '[REDACTED]' },
		};
		expect(service.toJSON()).toEqual(expected);
		expect(JSON.parse(JSON.stringify(service))).toEqual(expected);
		expect(inspect(service)).not.toContain("'p'");
		expect(inspect(service)).toContain('[REDACTED]');
		expect(service.get('DB_PASSWORD')).toBe('p');
	});

	it('redact: false should return the raw configuration copy', async () => {
		const service = createService(false);
		await service.load();

		const json = service.toJSON();
		expect(json).toEqual({ PORT: 1, DB_PASSWORD: 'p', auth: { token: 't' } });
		json.auth.token = 'changed';
		expect(service.get('auth.token')).toBe('t');
	});

	it('debug logs should list key names only', async () => {
		const logger = new Logger();
		const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});
		const service = new ExtendedConfigService<any>(
			{
				strategies: [{ loader: () => ({ DB_PASSWORD: 'super-secret' }) }],
				debug: true,
			},
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			logger,
		);
		await service.load();

		const messages = debugSpy.mock.calls.map(call => String(call[0]));
		expect(
			messages.some(message => message.includes('Loaded keys: DB_PASSWORD')),
		).toBe(true);
		expect(messages.some(message => message.includes('super-secret'))).toBe(
			false,
		);
	});
});
