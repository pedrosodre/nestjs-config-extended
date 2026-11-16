// Runtime smoke test of the ESM entry (index.mjs) against the installed NestJS,
// including forFeature() injection, which needs a single shared Nest instance.
// Run with `npm run test:compat` after `npm run build`.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
	ExtendedConfigModule,
	ExtendedConfigService,
	getConfigToken,
} from '../../index.mjs';

class DatabaseService {
	constructor(db) {
		this.db = db;
	}
}
Injectable()(DatabaseService);
Inject(getConfigToken('db'))(DatabaseService, undefined, 0);

class DatabaseModule {}
Module({
	imports: [ExtendedConfigModule.forFeature('db')],
	providers: [DatabaseService],
})(DatabaseModule);

class AppModule {}
Module({
	imports: [
		ExtendedConfigModule.forRoot({
			isGlobal: true,
			strategies: [{ loader: () => ({ host: 'h' }), registerAs: 'db' }],
		}),
		DatabaseModule,
	],
})(AppModule);

const app = await NestFactory.createApplicationContext(AppModule, {
	logger: false,
});
assert.equal(app.get(ExtendedConfigService).get('db.host'), 'h');
assert.equal(app.get(DatabaseService).db.host, 'h');
await app.close();

const require = createRequire(import.meta.url);
const nest = require('@nestjs/core/package.json').version;
console.log(`ESM runtime OK with @nestjs/core ${nest}`);
