import { Directive, inject } from '@angular/core';
import { AnchorTarget } from '@terseware/proto';

@Directive({
  selector: '[protoTooltip]',
  providers: [AnchorTarget],
})
export class ProtoTooltip {
  readonly target = inject(AnchorTarget);
}
