import { processEnvLoader } from '../../../lib';

describe('[Strategy] Process Env', () => {
	let envBackup: any;

	beforeEach(async () => {
		process.env.PORT = '3000';
	});

	afterEach(async () => {
		envBackup = process.env;
		process.env = envBackup;
	});

	it('processEnvLoader() should retrieve all variables from process.env', () => {
		expect(processEnvLoader().PORT).toBe('3000');
	});
});
