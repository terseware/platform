/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InjectOptions, Type, WritableSignal } from '@angular/core';
import type {
  FieldContext,
  MetadataKey,
  PathKind,
  SchemaPath,
  SchemaPathRules,
} from '@angular/forms/signals';
import { createMetadataKey, metadata, MetadataReducer } from '@angular/forms/signals';
import type { Exact, OmitNever, Pretty } from '@terseware/utils';

export type ResolverEntry = {
  type: Type<unknown>;
  propMemos: Record<string, MetadataKey<any, any, any>>;
  opts: Omit<InjectOptions, 'optional'>;
};

export const RESOLVER = createMetadataKey(MetadataReducer.list<ResolverEntry>());

export type ResolverProps<T, TValue extends string | number, TPathKind extends PathKind> = Pretty<
  Partial<
    OmitNever<{
      [K in keyof T]: T[K] extends WritableSignal<infer U>
        ? (ctx: FieldContext<TValue, TPathKind>) => U
        : never;
    }>
  >
>;

export function resolver<
  T extends object,
  P extends ResolverProps<T, TValue, TPathKind>,
  TValue extends string | number = string | number,
  TPathKind extends PathKind = PathKind.Root,
>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  type: Type<T>,
  props: Exact<P, ResolverProps<T, TValue, TPathKind>>,
  opts: Omit<InjectOptions, 'optional'> = {},
): void {
  const propMemos: Record<string, MetadataKey<any, any, any>> = {};
  for (const [key, fn] of Object.entries(props)) {
    propMemos[key] = metadata(path, createMetadataKey(), fn as any);
  }
  metadata(path, RESOLVER, () => ({ type, propMemos, opts }));
}
