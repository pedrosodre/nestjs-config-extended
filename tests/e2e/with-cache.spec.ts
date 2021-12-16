import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('With cache', () => {
	let app: INestApplication;
	let envBackup: NodeJS.ProcessEnv;
	const variables: Record<string, any> = { test: 'cache' };

	beforeAll(() => {
		envBackup = process.env;
	});

	it(`should store and retrieve variables from cache`, async () => {
		const cache = true;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withCache(cache, variables)],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service: ExtendedConfigService = app.get(ExtendedConfigService);
		expect(service.get('invalid')).toBeUndefined();

		for (const key of Object.keys(variables)) {
			expect(service.has(key)).toBe(true);
			expect(service.get(key)).toBe(variables[key]);
			expect(process.env[key]).not.toBe(variables[key]);
		}
	});

	it(`should store and retrieve variables from process.env`, async () => {
		const cache = false;
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule.withCache(cache, variables)],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		const service: ExtendedConfigService = app.get(ExtendedConfigService);
		expect(service.get('invalid')).toBeUndefined();

		for (const key of Object.keys(variables)) {
			expect(service.has(key)).toBe(true);
			expect(service.get(key)).toBe(variables[key]);
			expect(process.env[key]).toBe(variables[key]);
		}
	});

	afterEach(async () => {
		process.env = envBackup;
		await app.close();
	});
});
