import type { Signal } from '@angular/core';
import type {
  Prettify,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export type Fn<T, A extends Args = Args> = Args extends never ? () => T : (...args: A) => T;

export type MaybeFn<T, A extends Args = Args> = T | Fn<T, A>;

export type MaybeFnMap<T extends object> = {
  [K in keyof T]: MaybeFn<T[K]>;
};

export type SignalLike<T> = T | (() => T);

export type UnArray<T> = T extends (infer U)[] ? U : T;

export type MapToSignals<T> = { [K in keyof T]: Signal<T[K]> };
export type MapToSignalLike<T> = { [K in keyof T]: SignalLike<T[K]> };

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type OmitPrivate<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

export type SignalStoreParam<Input extends SignalStoreFeatureResult> = Prettify<
  StateSignals<Input['state']> &
    Input['props'] &
    Input['methods'] &
    WritableStateSource<Input['state']>
>;

export type SignalStoreBindings<Input extends SignalStoreFeatureResult, Bindings extends object> = (
  store: Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Input['state']>
  >,
) => Bindings;

export type PrefixKeys<T extends object, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K];
};
