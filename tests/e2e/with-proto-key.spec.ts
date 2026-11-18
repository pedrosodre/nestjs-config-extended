import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExtendedConfigService } from '../../lib';
import { AppModule } from '../src/app.module';

describe('With an own __proto__ key in loaded configuration', () => {
	let app: INestApplication;

	afterEach(async () => {
		await app?.close();
	});

	it.each([false, true])(
		'should not let it replace prototypes or disable masking (preload: %s)',
		async preload => {
			const moduleRef = await Test.createTestingModule({
				imports: [
					AppModule.withStrategy(
						[
							{
								identifier: 'JSON',
								// JSON.parse keeps "__proto__" as an own data property.
								loader: () => JSON.parse('{"__proto__":{"x":1},"token":"t"}'),
								registerAs: 'app',
							},
						],
						{ preload },
					),
				],
			}).compile();

			app = moduleRef.createNestApplication();
			await app.init();

			const service = app.get<ExtendedConfigService>(ExtendedConfigService);
			expect(service.get('app.token')).toBe('t');
			expect(service.get('app.x')).toBeUndefined();
			expect(service.toJSON()).toEqual({ app: { token: '[REDACTED]' } });
		},
	);
});
