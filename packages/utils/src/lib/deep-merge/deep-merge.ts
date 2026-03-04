/**
 * Copied from https://github.com/voodoocreation/ts-deepmerge
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

type TAllKeys<T> = T extends any ? keyof T : never;

type TIndexValue<T, K extends PropertyKey, D = never> = T extends any
  ? K extends keyof T
    ? T[K]
    : D
  : never;

type TPartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>> extends infer O
  ? { [P in keyof O]: O[P] }
  : never;

type TFunction = (...a: any[]) => any;

type TPrimitives = string | number | boolean | bigint | symbol | Date | TFunction;

type TMerged<T> = [T] extends [any[]]
  ? { [K in keyof T]: TMerged<T[K]> }
  : [T] extends [TPrimitives]
    ? T
    : [T] extends [object]
      ? TPartialKeys<{ [K in TAllKeys<T>]: TMerged<TIndexValue<T, K>> }, never>
      : T;

// istanbul ignore next
const isObject = (obj: any) => {
  if (typeof obj === 'object' && obj !== null) {
    if (typeof Object.getPrototypeOf === 'function') {
      const prototype = Object.getPrototypeOf(obj);
      return prototype === Object.prototype || prototype === null;
    }

    return Object.prototype.toString.call(obj) === '[object Object]';
  }

  return false;
};

type IObject = Record<string, any>;

export type DeepMergeOptions = {
  /**
   * When `true`, values explicitly provided as `undefined` will override existing values, though properties that are simply omitted won't affect anything.
   * When `false`, values explicitly provided as `undefined` won't override existing values.
   *
   * Default: `true`
   */
  allowUndefinedOverrides: boolean;

  /**
   * When `true` it will merge array properties.
   * When `false` it will replace array properties with the last instance entirely instead of merging their contents.
   *
   * Default: `true`
   */
  mergeArrays: boolean;

  /**
   * When `true` it will ensure there are no duplicate array items.
   * When `false` it will allow duplicates when merging arrays.
   *
   * Default: `true`
   */
  uniqueArrayItems: boolean;
};

const defaultOptions: Readonly<DeepMergeOptions> = Object.freeze({
  allowUndefinedOverrides: true,
  mergeArrays: true,
  uniqueArrayItems: true,
});

/**
 * Internal implementation that accepts options as a parameter to avoid global state.
 */
function deepMergeWithOptions<T extends IObject[]>(
  options: DeepMergeOptions,
  ...objects: T
): TMerged<T[number]> {
  return objects.reduce((result, current) => {
    if (current === undefined) {
      return result;
    }

    if (Array.isArray(current)) {
      throw new TypeError('Arguments provided to ts-deepmerge must be objects, not arrays.');
    }

    Object.keys(current).forEach(key => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        return;
      }

      if (Array.isArray(result[key]) && Array.isArray(current[key])) {
        result[key] = options.mergeArrays
          ? options.uniqueArrayItems
            ? Array.from(new Set((result[key] as unknown[]).concat(current[key])))
            : [...result[key], ...current[key]]
          : current[key];
      } else if (isObject(result[key]) && isObject(current[key])) {
        result[key] = deepMergeWithOptions(
          options,
          result[key] as IObject,
          current[key] as IObject,
        );
      } else if (!isObject(result[key]) && isObject(current[key])) {
        result[key] = deepMergeWithOptions(options, current[key], undefined);
      } else {
        result[key] =
          current[key] === undefined
            ? options.allowUndefinedOverrides
              ? current[key]
              : result[key]
            : current[key];
      }
    });

    return result;
  }, {}) as any;
}

/**
 * Deep merges multiple objects together.
 * Uses default options - for custom options use `deepMerge.withOptions()`.
 */
export const deepMerge = <T extends IObject[]>(...objects: T): TMerged<T[number]> =>
  deepMergeWithOptions(defaultOptions, ...objects);

/**
 * Deep merges objects with custom options.
 * This is now the preferred way to use custom merge options as it avoids global state mutation.
 */
deepMerge.withOptions = <T extends IObject[]>(
  options: Partial<DeepMergeOptions>,
  ...objects: T
): TMerged<T[number]> => {
  const mergedOptions: DeepMergeOptions = {
    ...defaultOptions,
    ...options,
  };
  return deepMergeWithOptions(mergedOptions, ...objects);
};
