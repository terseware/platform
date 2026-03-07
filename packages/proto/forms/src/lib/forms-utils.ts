import type { FieldState, FieldTree } from '@angular/forms/signals';

export function getRootFieldTree<T>(state: FieldState<T>): FieldTree<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (state as any).structure.root.fieldProxy as FieldTree<T>;
}
