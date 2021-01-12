import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SampleStrategyService } from '../src/sample-strategy.service';

describe('With strategy using class', () => {
	let app: INestApplication;
	let strategy: any;

	beforeEach(() => {
		strategy = new SampleStrategyService();
	});

	it(`should load, validate and transform variables from strategy using class`, async () => {
		const loaderSpy = jest.spyOn(strategy, 'load');
		const transformerSpy = jest.spyOn(strategy, 'transform');
		const validatorSpy = jest.spyOn(strategy, 'validate');

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_CLASS',
						loader: strategy,
						validator: strategy,
						transformer: strategy,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loaderSpy).toHaveBeenCalledTimes(1);
		expect(transformerSpy).toHaveBeenCalledTimes(1);
		expect(validatorSpy).toHaveBeenCalledTimes(1);
	});

	afterEach(async () => {
		await app.close();
	});
});
