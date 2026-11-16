import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
	ExtendedConfigModule,
	ExtendedConfigService,
	getConfigToken,
	InjectConfig,
} from '../../lib';

interface DatabaseConfig {
	host: string;
	port: number;
}

@Injectable()
class DatabaseService {
	constructor(@InjectConfig('database') readonly config: DatabaseConfig) {}
}

@Module({
	imports: [ExtendedConfigModule.forFeature('database')],
	providers: [DatabaseService],
})
class DatabaseModule {}

describe('With @InjectConfig and forFeature()', () => {
	const createApp = async () => {
		const loader = jest
			.fn()
			.mockResolvedValueOnce({ host: 'a', port: 1 })
			.mockResolvedValueOnce({ host: 'b', port: 2 });

		const moduleRef = await Test.createTestingModule({
			imports: [
				ExtendedConfigModule.forRoot({
					isGlobal: true,
					strategies: [
						{
							identifier: 'DB',
							loader,
							registerAs: 'database',
							reloadable: true,
						},
					],
				}),
				DatabaseModule,
			],
		}).compile();

		const app = moduleRef.createNestApplication();
		await app.init();
		return app;
	};

	it('should inject the namespace without preload and reflect reloads', async () => {
		const app = await createApp();
		const { config } = app.get(DatabaseService);

		expect(config.host).toBe('a');
		expect({ ...config }).toEqual({ host: 'a', port: 1 });
		expect(JSON.parse(JSON.stringify(config))).toEqual({ host: 'a', port: 1 });
		expect(Object.keys(config)).toEqual(['host', 'port']);
		expect('port' in config).toBe(true);

		await app.get(ExtendedConfigService).reload('DB');
		expect(config.host).toBe('b');
		expect(config.port).toBe(2);

		await app.close();
	});

	it('should expose the namespace token and keep the proxy read-only', async () => {
		const app = await createApp();
		const config = app.get<DatabaseConfig>(getConfigToken('database'));

		expect(() => {
			'use strict';
			(config as any).host = 'changed';
		}).toThrow(TypeError);
		expect(config.host).toBe('a');

		await app.close();
	});
});
