import { Logger } from '@nestjs/common';
import {
	ConfigChangeEvent,
	ExtendedConfigModuleOptions,
	ExtendedConfigService,
} from '../../../lib';
import { isDeepEqual } from '../../../lib/util/deep-equal.util';

const createService = (
	options: ExtendedConfigModuleOptions,
	logger = new Logger(),
) =>
	new ExtendedConfigService<any>(
		options,
		{ validate: jest.fn(), schedule: jest.fn() } as any,
		logger,
	);

describe('Change notifications', () => {
	it('watch() should emit the current value and then only distinct changes', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ db: { host: 'a' }, OTHER: '1' })
			.mockResolvedValueOnce({ db: { host: 'a' }, OTHER: '2' })
			.mockResolvedValueOnce({ db: { host: 'b' }, OTHER: '2' });
		const service = createService({
			strategies: [{ identifier: 'A', loader, reloadable: true }],
		});

		const values: unknown[] = [];
		const subscription = service.watch('db.host').subscribe(value => {
			values.push(value);
		});

		await service.load();
		await service.reload('A');
		await service.reload('A');
		subscription.unsubscribe();

		expect(values).toEqual([undefined, 'a', 'b']);
	});

	it('changes() and onChange should receive changed keys with the reason', async () => {
		const onChange = jest.fn();
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEEP: '1', CHANGE: '1', REMOVE: '1' })
			.mockResolvedValueOnce({ KEEP: '1', CHANGE: '2', ADD: '1' })
			.mockResolvedValueOnce({ KEEP: '1', CHANGE: '2', ADD: '1' });
		const service = createService({
			strategies: [{ identifier: 'A', loader, reloadable: true }],
			onChange,
		});

		const events: ConfigChangeEvent[] = [];
		service.changes().subscribe(event => events.push(event));

		await service.load();
		await service.reload('A');
		await service.reload('A'); // no changes, no event

		expect(events).toEqual([
			{
				reason: 'load',
				identifier: 'A',
				changedKeys: ['KEEP', 'CHANGE', 'REMOVE'],
			},
			{
				reason: 'reload',
				identifier: 'A',
				changedKeys: ['CHANGE', 'REMOVE', 'ADD'],
			},
		]);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith(events[1]);
	});

	it('should log onChange hook errors without failing the load', async () => {
		const logger = new Logger();
		const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
		const service = createService(
			{
				strategies: [{ identifier: 'A', loader: () => ({ KEY: 'v' }) }],
				onChange: () => {
					throw new Error('hook failed');
				},
			},
			logger,
		);

		await service.load();
		await new Promise(resolve => setImmediate(resolve));

		expect(service.get('KEY')).toBe('v');
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('onChange hook failed'),
			expect.stringContaining('hook failed'),
		);
	});

	it('onReloadError should be called when reload() fails, and the error rethrown', async () => {
		const onReloadError = jest.fn();
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ KEY: 'v' })
			.mockRejectedValueOnce(new Error('down'));
		const service = createService({
			strategies: [{ identifier: 'A', loader, reloadable: true }],
			onReloadError,
		});

		await service.load();
		await expect(service.reload('A')).rejects.toThrow('down');

		expect(onReloadError).toHaveBeenCalledWith(expect.any(Error), 'A');
		expect(service.get('KEY')).toBe('v');
	});

	it('onReloadError should be called when a scheduled reload fails', async () => {
		const onReloadError = jest.fn();
		const scheduler = {
			validate: jest.fn().mockReturnValue(true),
			schedule: jest.fn().mockReturnValue({ destroy: jest.fn() }),
		};
		const logger = new Logger();
		jest.spyOn(logger, 'error').mockImplementation(() => {});
		const service = new ExtendedConfigService(
			{
				strategies: [
					{
						identifier: 'A',
						loader: jest
							.fn()
							.mockResolvedValueOnce({})
							.mockRejectedValueOnce(new Error('down')),
						reloadable: true,
						schedule: '* * * * *',
					},
				],
				onReloadError,
			},
			scheduler as any,
			logger,
		);

		await service.load();
		await scheduler.schedule.mock.calls[0][1]();

		expect(onReloadError).toHaveBeenCalledWith(expect.any(Error), 'A');
	});

	it('should complete observables on module destroy', async () => {
		const service = createService({ strategies: [] });
		const complete = jest.fn();
		service.changes().subscribe({ complete });
		service.watch('X').subscribe({ complete });

		service.onModuleDestroy();
		expect(complete).toHaveBeenCalledTimes(2);
	});
});

describe('isDeepEqual', () => {
	it.each([
		[1, 1, true],
		['a', 'b', false],
		[{ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, true],
		[{ a: 1 }, { a: 1, b: undefined }, false],
		[[1, 2], { 0: 1, 1: 2 }, false],
		[new Date(1), new Date(1), true],
		[null, {}, false],
		[NaN, NaN, true],
	])('isDeepEqual(%p, %p) === %p', (a, b, expected) => {
		expect(isDeepEqual(a, b)).toBe(expected);
	});
});
