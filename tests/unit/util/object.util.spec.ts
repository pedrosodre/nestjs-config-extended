import { setOn } from '../../../lib/util/object.util';

test('should allow setting nested paths', () => {
	const obj = {};
	setOn(obj, 'a.b.c', 1);
	// @ts-expect-error
	expect(obj.a.b.c).toEqual(1);
});

test('should allow setting nested array paths', () => {
	const obj = {};
	setOn(obj, 'a.b[0].c', 1);
	setOn(obj, 'a.b[1].c', 2);
	// @ts-expect-error
	expect(obj.a.b).toEqual([{ c: 1 }, { c: 2 }]);
});

test.each(['__proto__.polluted', 'constructor.prototype.polluted', [
	'__proto__',
	'polluted',
]])('should ignore prototype-polluting path %p', path => {
	const obj = {};
	setOn(obj, path as string | string[], 'yes');
	expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
});

test('should replace primitive intermediate values instead of throwing', () => {
	const obj: Record<string, any> = { DB: 'x', N: null };
	setOn(obj, 'DB.HOST', 'h');
	setOn(obj, 'N.a', 1);
	expect(obj).toEqual({ DB: { HOST: 'h' }, N: { a: 1 } });
});

test('should keep existing sibling values on nested objects', () => {
	const obj: Record<string, any> = { db: { port: 1 } };
	setOn(obj, 'db.host', 'h');
	expect(obj).toEqual({ db: { port: 1, host: 'h' } });
});
