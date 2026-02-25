import { Directive, inject } from '@angular/core';
import { AnchorRoot } from '@terseware/proto';

@Directive({
  selector: '[protoTooltipRoot]',
  providers: [AnchorRoot],
})
export class ProtoTooltipRoot {
  readonly root = inject(AnchorRoot);
}
