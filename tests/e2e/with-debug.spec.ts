import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('With debug', () => {
	let app: INestApplication;
	const variables: Record<string, any> = { test: 'debug' };

	const logger = {
		debug: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it(`should print debug messages`, async () => {
		const debug = true;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withDebug(debug, variables)],
		})
			.overrideProvider(Logger)
			.useValue(logger)
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(logger.debug).toHaveBeenCalled();
	});

	it(`should not print debug messages`, async () => {
		const debug = false;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withDebug(debug, variables)],
		})
			.overrideProvider(Logger)
			.useValue(logger)
			.compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(logger.debug).not.toHaveBeenCalled();
	});

	afterEach(async () => {
		await app.close();
	});
});
