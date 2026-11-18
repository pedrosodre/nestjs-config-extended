import {
	cloneConfigValue,
	copyConfigEntries,
} from '../../../lib/util/clone.util';

describe('cloneConfigValue', () => {
	it('should drop own __proto__ keys instead of replacing the prototype', () => {
		// JSON.parse and yaml.parse create "__proto__" as an own data property.
		const source = JSON.parse(
			'{"db":{"__proto__":{"isAdmin":true},"host":"h"},"list":[{"__proto__":{"x":1}}]}',
		);

		const copy = cloneConfigValue(source);

		expect(Object.getPrototypeOf(copy.db)).toBe(Object.prototype);
		expect(Object.getPrototypeOf(copy.list[0])).toBe(Object.prototype);
		expect(copy.db.isAdmin).toBeUndefined();
		expect(copy.list[0].x).toBeUndefined();
		expect(copy).toEqual({ db: { host: 'h' }, list: [{}] });
		expect(({} as any).isAdmin).toBeUndefined();
	});
});

describe('copyConfigEntries', () => {
	it('should copy own keys without letting __proto__ replace the prototype', () => {
		const source = JSON.parse('{"__proto__":{"x":1},"token":"t"}');

		const copy = copyConfigEntries(source);

		expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
		expect(copy).toEqual({ token: 't' });
		expect(copy.x).toBeUndefined();
	});
});
