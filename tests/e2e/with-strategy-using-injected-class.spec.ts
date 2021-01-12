import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('With strategy using injected class', () => {
	let app: INestApplication;

	it(`should load, validate and transform variables from strategy using injected class`, async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withInjectedStrategy()],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service = app.get(ExtendedConfigService);
		expect(service.get('test')).toBe('strategy-class');
	});

	afterEach(async () => {
		await app.close();
	});
});
