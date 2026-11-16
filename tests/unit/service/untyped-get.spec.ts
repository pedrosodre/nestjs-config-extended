import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigModule, ExtendedConfigService } from '../../../lib';

interface Config {
	db: { host: string; extra: unknown };
}

describe('Untyped and unknown configuration types', () => {
	it('should accept any path when Nest infers the service type as unknown', async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ExtendedConfigModule.forRoot({
					strategies: [{ loader: () => ({ PORT: 3000, db: { host: 'h' } }) }],
				}),
			],
		}).compile();
		const app = moduleRef.createNestApplication();
		await app.init();

		// No annotation: app.get() infers ExtendedConfigService<unknown>.
		const config = app.get(ExtendedConfigService);
		const port: number = config.get('PORT');
		expect(port).toBe(3000);
		expect(config.getOrThrow('db.host')).toBe('h');
		expect(config.has('db')).toBe(true);

		await app.close();
	});

	it('should allow any sub-path below unknown values of a typed configuration', async () => {
		const service = new ExtendedConfigService<Config>(
			{
				strategies: [
					{ loader: () => ({ db: { host: 'h', extra: { a: { b: 1 } } } }) },
				],
			},
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			new Logger(),
		);
		await service.load();

		expect(service.get('db.extra.a.b')).toBe(1);
		// @ts-expect-error typed parts of the configuration are still checked
		expect(service.get('db.nope')).toBeUndefined();
	});
});
