import type { FieldState, FieldTree } from '@angular/forms/signals';

export function getRootFieldState<T>(state: FieldState<T>): FieldState<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((state as any).structure.root.fieldProxy as FieldTree<T>)();
}
