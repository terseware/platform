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
export function isFunction<T, A extends never>(value: MaybeFn<T, A>): value is (...args: A) => T;
export function isFunction(value: unknown): value is CallableFunction;
export function isFunction<T, A extends never>(value: MaybeFn<T, A>): value is (...args: A) => T {
  return typeof value === 'function';
}

/** Type guard for arrays. */
export function isArray(value: unknown): value is unknown[] {
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

/**
 * Type guard for string literal types.
 *
 * @remarks
 * Accepts either a literal string for direct comparison or a predicate function
 * for custom matching logic.
 *
 * @example
 * ```ts
 * type Status = 'active' | 'inactive';
 * if (isLiteral<Status>('active', value)) { ... }
 * if (isLiteral<Status>(s => s.startsWith('act'), value)) { ... }
 * ```
 */
export function isLiteral<T extends string = never>(lit: T, value: unknown): value is T;
export function isLiteral<T extends string = never>(
  compareFn: (v: string) => boolean,
  value: unknown,
): value is T;
export function isLiteral<T extends string = never>(
  compareFn: T | ((v: string) => boolean),
  value: unknown,
): value is T {
  return isString(compareFn) ? compareFn === value : compareFn(String(value));
}

/**
 * Type guard for native `<button>` elements.
 *
 * @remarks
 * Only matches `<button>` tags—does not match `<input type="button|submit|reset">`.
 * Use this for semantic button detection; for ARIA button role detection, additional
 * checks are needed.
 */
export function isNativeButtonTag(
  element: HTMLElement,
  { types = [] }: { types?: string[] } = {},
): element is HTMLButtonElement {
  return (
    element.tagName === 'BUTTON' &&
    (types.length === 0 || types.includes((element as HTMLButtonElement).type))
  );
}

/**
 * Type guard for native `<input>` elements.
 */
export function isNativeInputTag(
  element: Element,
  { types = [] }: { types?: string[] } = {},
): element is HTMLInputElement {
  return (
    element.tagName === 'INPUT' &&
    (types.length === 0 || types.includes((element as HTMLInputElement).type))
  );
}

/**
 * Type guard for native `<a>` elements.
 */
export function isNativeAnchorTag(
  element: HTMLElement,
  { validLink = false }: { validLink?: boolean } = {},
): element is HTMLAnchorElement {
  return (
    element.tagName === 'A' &&
    (!validLink ||
      !!(element as HTMLAnchorElement).href ||
      !!(element as { routerLink?: unknown }).routerLink)
  );
}

/**
 * Type guard for elements supporting the native `disabled` attribute.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled | MDN: disabled attribute}
 */

export function supportsDisabledAttribute(
  element: HTMLElement,
): element is HTMLElement & { disabled: boolean } {
  return element instanceof HTMLElement && 'disabled' in element;
}
