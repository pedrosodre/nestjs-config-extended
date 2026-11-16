import { Logger } from '@nestjs/common';
import { ExtendedConfigService, MissingConfigException } from '../../../lib';

interface Config {
	PORT: number;
	db: { host: string; options?: { ssl: boolean } };
}

const createService = <K>(variables: Record<string, any>) =>
	new ExtendedConfigService<K>(
		{ strategies: [{ loader: () => variables }] },
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		new Logger(),
	);

describe('Typed paths', () => {
	it('should resolve dotted paths with inferred types', async () => {
		const service = createService<Config>({
			PORT: 3000,
			db: { host: 'h', options: { ssl: true } },
		});
		await service.load();

		const port: number | undefined = service.get('PORT');
		const host: string | undefined = service.get('db.host');
		const ssl: boolean | undefined = service.get('db.options.ssl');
		const withDefault: number = service.get('PORT', 1);

		expect([port, host, ssl, withDefault]).toEqual([3000, 'h', true, 3000]);
		expect(service.has('db.options.ssl')).toBe(true);

		// @ts-expect-error unknown path is rejected for typed services
		expect(service.get('db.missing')).toBeUndefined();
		// @ts-expect-error inferred type is number, not string
		const wrong: string | undefined = service.get('PORT');
		expect(wrong).toBe(3000);
	});

	it('should keep explicit type arguments working (legacy style)', async () => {
		const service = createService<Record<string, any>>({ KEY: 'v' });
		await service.load();

		const value: string | undefined = service.get<string>('KEY');
		const fallback: number = service.get<number>('NOPE', 7) as number;
		expect(value).toBe('v');
		expect(fallback).toBe(7);
	});

	it('getOrThrow() should return defined values and throw for missing ones', async () => {
		const service = createService<Config>({ PORT: 0, db: { host: 'h' } });
		await service.load();

		const port: number = service.getOrThrow('PORT');
		expect(port).toBe(0);
		expect(service.getOrThrow('db.host')).toBe('h');
		expect(() => service.getOrThrow('db.options.ssl')).toThrow(
			MissingConfigException,
		);
		expect(() => service.getOrThrow('db.options.ssl')).toThrow(
			'Configuration value "db.options.ssl" is not defined',
		);
	});
});
