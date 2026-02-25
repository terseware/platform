import { Directive, inject } from '@angular/core';
import { AnchorOrigin } from '@terseware/proto';

@Directive({
  selector: '[protoTooltipTrigger]',
  providers: [AnchorOrigin],
})
export class ProtoTooltipTrigger {
  readonly origin = inject(AnchorOrigin);
}
