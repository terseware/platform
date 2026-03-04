import { Directive, inject } from '@angular/core';
import { FieldContext } from './field-context';

@Directive({
  selector: '[proto][formField]',
  exportAs: 'protoFormField',
})
export class ProtoFormField<T> {
  readonly context = inject(FieldContext<T>);
}
