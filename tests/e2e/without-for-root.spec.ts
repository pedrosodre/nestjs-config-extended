import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigModule, ExtendedConfigService } from '../../lib';

describe('Importing ExtendedConfigModule without forRoot()', () => {
	it('should provide an empty in-memory configuration', async () => {
		@Module({ imports: [ExtendedConfigModule] })
		class AppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		const app = moduleRef.createNestApplication();
		await app.init();

		const service = app.get(ExtendedConfigService);
		expect(service.get('PATH')).toBeUndefined();
		expect(service.getStatus()).toEqual({ loaded: true, strategies: [] });

		await app.close();
	});

	it('should still use the options given to forRoot()', async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ExtendedConfigModule.forRoot({
					strategies: [{ loader: () => ({ KEY: 'v' }) }],
				}),
			],
		}).compile();
		const app = moduleRef.createNestApplication();
		await app.init();

		expect(app.get(ExtendedConfigService).get('KEY')).toBe('v');
		await app.close();
	});
});
