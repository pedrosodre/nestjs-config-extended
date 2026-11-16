import { Logger } from '@nestjs/common';
import { ExtendedConfigService } from '../../../lib';

describe('getProxyOf()', () => {
	it('should return a live proxy that supports keys, spread and JSON', async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ app: { name: 'a' } })
			.mockResolvedValueOnce({ app: { name: 'b', debug: true } });
		const service = new ExtendedConfigService<any>(
			{ strategies: [{ identifier: 'A', loader, reloadable: true }] },
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			new Logger(),
		);
		await service.load();

		const app = service.getProxyOf('app');
		expect({ ...app }).toEqual({ name: 'a' });

		await service.reload('A');
		expect(app.name).toBe('b');
		expect(Object.keys(app)).toEqual(['name', 'debug']);
		expect(JSON.stringify(app)).toBe('{"name":"b","debug":true}');
	});

	it('should return non-object values directly', async () => {
		const service = new ExtendedConfigService<any>(
			{ strategies: [{ loader: () => ({ PORT: 1 }) }] },
			{ validate: jest.fn(), schedule: jest.fn() } as any,
			new Logger(),
		);
		await service.load();
		expect(service.getProxyOf('PORT')).toBe(1);
	});
});
