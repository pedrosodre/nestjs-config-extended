import { isUndefined } from '../../../lib/util/is-undefined.util';

describe('isUndefined', () => {
	it('should return true for undefined', () => {
		expect(isUndefined(undefined)).toBe(true);
	});

	it('should return false for null', () => {
		expect(isUndefined(null)).toBe(false);
	});

	it('should return false for number', () => {
		expect(isUndefined(0)).toBe(false);
		expect(isUndefined(123)).toBe(false);
		expect(isUndefined(NaN)).toBe(false);
	});

	it('should return false for string', () => {
		expect(isUndefined('')).toBe(false);
		expect(isUndefined('undefined')).toBe(false);
	});

	it('should return false for boolean', () => {
		expect(isUndefined(true)).toBe(false);
		expect(isUndefined(false)).toBe(false);
	});

	it('should return false for object', () => {
		expect(isUndefined({})).toBe(false);
		expect(isUndefined([])).toBe(false);
	});

	it('should return false for function', () => {
		expect(isUndefined(() => {})).toBe(false);
	});

	it('should return false for symbol', () => {
		expect(isUndefined(Symbol())).toBe(false);
	});
});
