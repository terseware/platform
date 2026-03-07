import type { Type } from '@angular/core';
import type { MaybeFn } from './types';

/** Type guard for string values. */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Type guard for number values. */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/** Type guard for boolean values. */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Type guard for callable functions. */
export function isFunction(value: unknown): value is CallableFunction;
export function isFunction<T, A extends never>(value: MaybeFn<T, A>): value is (...args: A) => T;
export function isFunction<T, A extends never>(value: MaybeFn<T, A>): value is (...args: A) => T {
  return typeof value === 'function';
}

/** Type guard for arrays. */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for plain objects.
 * @remarks Excludes `null` and arrays, which also have `typeof === 'object'`.
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Type guard for undefined. */
export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

/** Type guard for null. */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard for null or undefined values.
 * @see {@link isNull}
 * @see {@link isUndefined}
 */
export function isNil(value: unknown): value is null | undefined {
  return isUndefined(value) || isNull(value);
}

/**
 * Type guard for not null or undefined values.
 * @see {@link isNil}
 */
export function notNil<T>(value: T | null | undefined): value is T {
  return !isNil(value);
}

/** Type guard for constructor functions (ES6 classes only). */
export function isClass(value: unknown): value is Type<object> {
  return isFunction(value) && /^\s*class[\s{]/.test(Function.prototype.toString.call(value));
}

/** Type guard for Node objects. */
export function isNode(value: unknown): value is Node {
  return value instanceof Node;
}

/**
 * Type guard for native `<button>` elements.
 *
 * @remarks
 * Only matches `<button>` tags—does not match `<input type="button|submit|reset">`.
 * Use this for semantic button detection; for ARIA button role detection, additional
 * checks are needed.
 */
export function isNativeButtonTag<const E extends Element>(
  element: E,
  { types = [] }: { types?: string[] } = {},
): element is E & { tagName: 'BUTTON' } {
  return (
    element.tagName === 'BUTTON' &&
    (types.length === 0 || types.includes((element as E & { type: string }).type))
  );
}

/**
 * Type guard for native `<input>` elements.
 */
export function isNativeInputTag<const E extends Element>(
  element: E,
  { types = [] }: { types?: string[] } = {},
): element is E & { tagName: 'INPUT' } {
  return (
    element.tagName === 'INPUT' &&
    (types.length === 0 || types.includes((element as E & { type: string }).type))
  );
}

/**
 * Type guard for native `<a>` elements.
 */
export function isNativeAnchorTag<const E extends Element>(
  element: E,
  { validLink = false }: { validLink?: boolean } = {},
): element is E & { tagName: 'A' } {
  return (
    element.tagName === 'A' &&
    (!validLink ||
      !!(element as E & { href: string }).href ||
      !!(element as { routerLink?: unknown }).routerLink)
  );
}

/**
 * Type guard for elements supporting the native `disabled` attribute.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled | MDN: disabled attribute}
 */
export function supportsDisabledAttribute<const E extends Element>(
  element: E,
): element is E & { disabled: boolean } {
  return element instanceof HTMLElement && 'disabled' in element;
}

/**
 * Type guard for elements supporting the native `required` attribute.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/required | MDN: required attribute}
 */
export function supportsRequiredAttribute<const E extends Element>(
  element: E,
): element is E & { required: boolean } {
  return element instanceof HTMLElement && 'required' in element;
}
