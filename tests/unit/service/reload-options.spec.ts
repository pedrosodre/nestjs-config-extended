import { Logger } from '@nestjs/common';
import {
	ConfigLoaderStrategy,
	ExtendedConfigService,
	InvalidReloadIntervalException,
	LoadingException,
} from '../../../lib';
import { parseDuration } from '../../../lib/util/duration.util';
import { retrieveVariablesByStrategy } from '../../../lib/util/loader.util';

const scheduler = () => ({
	validate: jest.fn().mockReturnValue(true),
	schedule: jest.fn().mockReturnValue({ destroy: jest.fn() }),
});

const createService = (strategies: ConfigLoaderStrategy[]) =>
	new ExtendedConfigService<any>(
		{ strategies },
		scheduler() as any,
		new Logger(),
	);

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('parseDuration', () => {
	it.each([
		[1500, 1500],
		['500ms', 500],
		['30s', 30000],
		['5m', 300000],
		['1h', 3600000],
		['1.5s', 1500],
		[' 2 d ', 172800000],
		[0, undefined],
		[-1, undefined],
		['0s', undefined],
		['10', undefined],
		['5 minutes', undefined],
	])('parseDuration(%p) === %p', (input, expected) => {
		expect(parseDuration(input)).toBe(expected);
	});
});

describe('reloadInterval', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('should reload at the configured interval and stop on destroy', async () => {
		jest.useFakeTimers('modern');
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: '1' })
			.mockResolvedValueOnce({ KEY: '2' })
			.mockResolvedValue({ KEY: '3' });
		const service = createService([
			{ identifier: 'A', loader, reloadable: true, reloadInterval: '5s' },
		]);

		await service.load();
		expect(service.get('KEY')).toBe('1');

		jest.advanceTimersByTime(5000);
		jest.useRealTimers();
		await flushPromises();
		expect(service.get('KEY')).toBe('2');
		expect(loader).toHaveBeenCalledTimes(2);

		jest.useFakeTimers('modern');
		service.onModuleDestroy();
		jest.advanceTimersByTime(20000);
		expect(loader).toHaveBeenCalledTimes(2);
	});

	it('should not schedule non-reloadable strategies', async () => {
		const setIntervalSpy = jest.spyOn(global, 'setInterval');
		const service = createService([
			{ loader: () => ({}), reloadInterval: '5s' },
		]);
		await service.load();
		expect(setIntervalSpy).not.toHaveBeenCalled();
		setIntervalSpy.mockRestore();
	});

	it('should reject invalid intervals and schedule + interval together', async () => {
		await expect(
			createService([
				{ loader: () => ({}), reloadable: true, reloadInterval: 'soon' },
			]).load(),
		).rejects.toThrow(InvalidReloadIntervalException);

		await expect(
			createService([
				{
					loader: () => ({}),
					reloadable: true,
					reloadInterval: '5s',
					schedule: '* * * * *',
				},
			]).load(),
		).rejects.toThrow('schedule and reloadInterval cannot be used together');
	});
});

describe('retry', () => {
	it('should retry a failing loader with exponential backoff', async () => {
		const timeoutSpy = jest.spyOn(global, 'setTimeout');
		const loader = jest
			.fn()
			.mockRejectedValueOnce(new Error('1'))
			.mockRejectedValueOnce(new Error('2'))
			.mockResolvedValueOnce({ KEY: 'ok' });

		const variables = await retrieveVariablesByStrategy({
			loader,
			retry: { retries: 3, delay: 1, factor: 3 },
		});

		expect(variables).toEqual({ KEY: 'ok' });
		expect(loader).toHaveBeenCalledTimes(3);
		const delays = timeoutSpy.mock.calls.map(call => call[1]);
		expect(delays).toEqual([1, 3]);
		timeoutSpy.mockRestore();
	});

	it('should cap the delay with maxDelay and throw after the last retry', async () => {
		const timeoutSpy = jest.spyOn(global, 'setTimeout');
		const loader = jest.fn().mockRejectedValue(new Error('down'));

		await expect(
			retrieveVariablesByStrategy({
				identifier: 'A',
				loader,
				retry: { retries: 3, delay: 2, factor: 10, maxDelay: 5 },
			}),
		).rejects.toThrow(LoadingException);

		expect(loader).toHaveBeenCalledTimes(4);
		expect(timeoutSpy.mock.calls.map(call => call[1])).toEqual([2, 5, 5]);
		timeoutSpy.mockRestore();
	});

	it('should not retry without retry options', async () => {
		const loader = jest.fn().mockRejectedValue(new Error('down'));
		await expect(retrieveVariablesByStrategy({ loader })).rejects.toThrow(
			LoadingException,
		);
		expect(loader).toHaveBeenCalledTimes(1);
	});
});

describe('overlapping reloads', () => {
	it('should join an in-flight reload of the same strategy', async () => {
		let resolveLoad: (value: Record<string, any>) => void = () => undefined;
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: '1' })
			.mockImplementationOnce(
				() => new Promise(resolve => (resolveLoad = resolve)),
			);
		const service = createService([
			{ identifier: 'A', loader, reloadable: true },
		]);
		await service.load();

		const first = service.reload('A');
		const second = service.reload('A');
		await flushPromises();
		resolveLoad({ KEY: '2' });
		await Promise.all([first, second]);

		expect(loader).toHaveBeenCalledTimes(2);
		expect(service.get('KEY')).toBe('2');
	});
});
