import { isClass } from './validators';

describe('validators', () => {
  describe('isConstructor', () => {
    it('should return true for constructor functions', () => {
      class TestClass {}
      expect(isClass(TestClass)).toBe(true);
    });
    it('should return false for reference functions', () => {
      function refFn() {
        return '';
      }
      expect(isClass(refFn)).toBe(false);
    });
    it('should return false for arrow functions', () => {
      const arrowFn = () => '';
      expect(isClass(arrowFn)).toBe(false);
    });
    it('should return false for object literals', () => {
      const obj = {
        name: 'Test',
      };
      expect(isClass(obj)).toBe(false);
    });
    it('should return false for array literals', () => {
      const arr = [1, 2, 3];
      expect(isClass(arr)).toBe(false);
    });
  });
});
