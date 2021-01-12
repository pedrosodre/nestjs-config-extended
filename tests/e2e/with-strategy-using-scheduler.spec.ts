import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigService } from '../../lib';
import { AppModule } from '../src/app.module';
import cron from 'node-cron';

jest.mock('node-cron', () => {
	return {
		schedule: jest
			.fn()
			.mockImplementation(
				(_schedule: string, task: () => void, _options: any) => {
					task();
				},
			),
		validate: jest.fn().mockImplementation((schedule: string) => {
            if (schedule === 'invalid') {
                return false;
            }

            return true;
        }),
	};
});

describe('With strategy using functions', () => {
	let app: INestApplication;
	const variables: Record<string, any> = { test: 'strategy-functions' };

	it(`should load from strategy using functions and schedule the reload with cron`, async () => {
		const loader = jest.fn();
		const schedule = '* * * * *';

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						schedule,
						reloadable: true,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		await app.init();

		expect(loader).toHaveBeenCalledTimes(2); // Should be called by scheduler aswell, to validate task function
		expect(cron.validate).toBeCalledWith(schedule);
		expect(cron.schedule).toBeCalledWith(schedule, expect.any(Function), {
			scheduled: true,
		});

		const service = app.get(ExtendedConfigService);
		for (const key of Object.keys(variables)) {
			expect(service.get(key)).toBe(variables[key]);
			expect(process.env[key]).not.toBe(variables[key]);
		}
	});

	it(`should throw an exception while trying to load due invalid cron syntax`, async () => {
		const loader = jest.fn();
		const schedule = 'invalid';

		const moduleRef = await Test.createTestingModule({
			imports: [
				AppModule.withStrategy([
					{
						identifier: 'LOADER_FUNCTION',
						loader: loader.mockResolvedValue(variables),
						schedule,
						reloadable: true,
					},
				]),
			],
		}).compile();

		app = moduleRef.createNestApplication();
		expect(app.init()).rejects.toThrow();
	});

	afterEach(async () => {
		await app.close();
	});
});
