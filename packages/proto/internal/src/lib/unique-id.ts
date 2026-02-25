const uniqueIdMap = new Map<string, number>();

/** Generate a unique id for an element. */
export function uniqueId(prefix: string): string {
  const id = uniqueIdMap.get(prefix) ?? 0;
  uniqueIdMap.set(prefix, id + 1);
  return `proto-${prefix}-${id}`;
}
