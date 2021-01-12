import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('With debug', () => {
	let app: INestApplication;
	const variables: Record<string, any> = { test: 'debug' };
	let logSpy: jest.SpyInstance;

	beforeEach(() => {
		logSpy = jest.spyOn(Logger, 'debug');
	});

	it(`should print debug messages`, async () => {
		const debug = true;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withDebug(debug, variables)],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(logSpy).toHaveBeenCalled();
	});

	it(`should not print debug messages`, async () => {
		const debug = false;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withDebug(debug, variables)],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(logSpy).not.toHaveBeenCalled();
	});

	afterEach(async () => {
		logSpy.mockRestore();
		await app.close();
	});
});
