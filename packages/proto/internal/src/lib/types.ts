// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export type Fn<T, A extends Args = Args> = Args extends never ? () => T : (...args: A) => T;

export type MaybeFn<T, A extends Args = Args> = T | Fn<T, A>;

export type UnArray<T> = T extends (infer U)[] ? U : T;

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends (infer U)[]
        ? DeepPartial<U>[]
        : T[P] extends object | undefined
          ? DeepPartial<T[P]>
          : T[P];
    }
  : T;

export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: T[P] extends (infer U)[]
        ? DeepRequired<U>[]
        : T[P] extends object | undefined
          ? DeepRequired<T[P]>
          : T[P];
    }
  : T;
