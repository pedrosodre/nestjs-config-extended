// Runtime smoke test of the built CommonJS entry against the installed NestJS.
// Run with `npm run test:compat` after `npm run build`.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
	ExtendedConfigModule,
	ExtendedConfigService,
} = require('../../dist/index.js');

class AppModule {}
Module({
	imports: [
		ExtendedConfigModule.forRoot({
			strategies: [{ loader: () => ({ PORT: 3000, db: { host: 'h' } }) }],
		}),
	],
})(AppModule);

(async () => {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: false,
	});
	const config = app.get(ExtendedConfigService);
	assert.equal(config.get('PORT'), 3000);
	assert.equal(config.get('db.host'), 'h');
	await app.close();

	const nest = require('@nestjs/core/package.json').version;
	console.log(`CommonJS runtime OK with @nestjs/core ${nest}`);
})().catch(error => {
	console.error(error);
	process.exit(1);
});
