/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const uniqueIdMap = new Map<string, number>();

/** Generate a unique id for an element. */
export function uniqueId<const T extends string>(prefix: T) {
  const id = uniqueIdMap.get(prefix) ?? 0;
  uniqueIdMap.set(prefix, id + 1);
  return `${prefix}-${id}` as const;
}
