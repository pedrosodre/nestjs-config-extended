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
