import { Directive, inject } from '@angular/core';
import { FieldCtx } from './field-ctx';

@Directive({
  selector: '[proto][formField]',
  exportAs: 'protoFormField',
})
export class ProtoFormField<T> {
  readonly context = inject(FieldCtx<T>, { host: true });
}
