import type { Type } from '@angular/core';
import type { FieldContext, PathKind, SchemaPath, SchemaPathRules } from '@angular/forms/signals';
import { createMetadataKey, metadata, MetadataReducer } from '@angular/forms/signals';

export type ResolverEntry<T extends object = object> = {
  type: Type<T>;
  ctx: FieldContext<unknown, PathKind>;
  handler: (instance: T) => void;
};

export const RESOLVER = createMetadataKey(MetadataReducer.list<ResolverEntry>());

export function resolver<
  T extends object,
  TValue extends string | number = string | number,
  TPathKind extends PathKind = PathKind.Root,
>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  type: Type<T>,
  handler: NoInfer<(ctx: FieldContext<TValue, TPathKind> & { instance: T }) => void>,
): void {
  metadata(path, RESOLVER, ctx => ({
    type,
    ctx,
    handler: instance =>
      handler(
        Object.assign(ctx, { instance }) as FieldContext<TValue, TPathKind> & { instance: T },
      ),
  }));
}
