import { Directive, inject } from '@angular/core';
import { FieldResolver } from './field-resolver';

@Directive({
  selector: '[proto][formField]',
  exportAs: 'protoFormField',
})
export class ProtoFormField<T> {
  readonly context = inject(FieldResolver<T>, { host: true });
}
