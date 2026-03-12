import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { injectElement } from '@terseware/utils';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ProtoHost } from './proto-host';
import { Resolvable } from './proto-resolve';

describe('Proto', () => {
  @Resolvable()
  class InteractBehavior {
    readonly element = injectElement();

    readonly disabled = signal(false);
    readonly focusableWhenDisabled = signal(false);
    readonly tabIndex = signal(0);

    readonly hardDisabled = computed(() => this.disabled() && !this.focusableWhenDisabled());
    readonly softDisabled = computed(() => this.disabled() && this.focusableWhenDisabled());

    constructor() {
      const ctx = inject(ProtoHost);

      ctx.on('keydown', ({ event, next }) => {
        if (this.softDisabled() && event.key !== 'Tab') {
          event.preventDefault();
        }
        next(event);
      });
    }
  }

  @Resolvable()
  class ButtonBehavior {
    readonly interact = inject(InteractBehavior);

    readonly didKeyDownEvent = signal(false);

    constructor() {
      const ctx = inject(ProtoHost);

      ctx.on('keydown', ({ event, next }) => {
        if (this.interact.disabled()) {
          return;
        }

        this.didKeyDownEvent.set(true);
        next.event('keydown', event);
        if (event.protoHandlerPrevented) {
          return;
        }
      });
    }
  }

  @Directive({
    selector: '[testButton]',
    host: {
      '(keydown)': 'onKeyDown()',
    },
  })
  class TestButton {
    readonly didKeyDownEvent = signal(false);
    readonly button = inject(ButtonBehavior);

    onKeyDown() {
      this.didKeyDownEvent.set(true);
    }
  }

  @Component({
    selector: 'test-host',
    template: `<button testButton>Test</button>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TestButton],
  })
  class TestHost {
    readonly button = viewChild.required(TestButton);
  }

  it('should create an instance when injected via a directive', async () => {
    const { fixture } = await render(TestHost);
    expect(fixture.componentInstance).toBeInstanceOf(TestHost);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(fixture.componentInstance.button().button.didKeyDownEvent()).toBe(true);
  });

  it('should call handler when keydown event is triggered', async () => {
    const { fixture } = await render(TestHost);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(fixture.componentInstance.button().button.didKeyDownEvent()).toBe(true);
  });

  it('should not call handler when keydown event is triggered and disabled', async () => {
    const { fixture } = await render(TestHost);
    const interact = fixture.componentInstance.button().button.interact;
    interact.disabled.set(true);
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(fixture.componentInstance.button().button.didKeyDownEvent()).toBe(false);
  });

  describe('pipeline ordering', () => {
    it('should call handlers in registration order (first registered = outermost)', async () => {
      const order: string[] = [];

      @Resolvable()
      class AProto {
        constructor() {
          inject(ProtoHost).on('click', ({ event, next }) => {
            order.push('A:before');
            next.event('click', event);
            order.push('A:after');
          });
        }
      }

      @Resolvable()
      class BProto {
        readonly a = inject(AProto);
        constructor() {
          inject(ProtoHost).on('click', ({ event, next }) => {
            order.push('B:before');
            next.event('click', event);
            order.push('B:after');
          });
        }
      }

      @Directive({ selector: '[testA]' })
      class TestA {
        readonly b = inject(BProto);
      }

      @Component({
        template: `<button testA>click</button>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestA],
      })
      class Host {}

      await render(Host);
      fireEvent.click(screen.getByRole('button'));

      // A registered first → outermost
      expect(order).toEqual(['A:before', 'B:before', 'B:after', 'A:after']);
    });
  });

  describe('preventProtoHandler', () => {
    it('should stop downstream handlers when preventProtoHandler is called', async () => {
      const called: string[] = [];

      @Resolvable()
      class BlockerProto {
        constructor() {
          inject(ProtoHost).on('click', ({ event }) => {
            called.push('blocker');
            event.preventProtoHandler();
            // intentionally does NOT call next
          });
        }
      }

      @Resolvable()
      class DownstreamProto {
        readonly blocker = inject(BlockerProto);
        constructor() {
          inject(ProtoHost).on('click', ({ event, next }) => {
            called.push('downstream');
            next(event);
          });
        }
      }

      @Directive({ selector: '[testBlock]' })
      class TestBlock {
        readonly d = inject(DownstreamProto);
      }

      @Component({
        template: `<button testBlock>x</button>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestBlock],
      })
      class Host {}

      await render(Host);
      fireEvent.click(screen.getByRole('button'));
      expect(called).toEqual(['blocker']);
    });

    it('should not fire Angular host listener when preventProtoHandler is called', async () => {
      const hostListenerCalled = signal(false);

      @Resolvable()
      class BlockerProto {
        constructor() {
          inject(ProtoHost).on('click', ({ event, next }) => {
            event.preventProtoHandler();
            next(event);
          });
        }
      }

      @Directive({
        selector: '[testHostListener]',
        host: { '(click)': 'onClick($event)' },
      })
      class TestHostListener {
        readonly blocker = inject(BlockerProto);
        onClick(_e: Event) {
          hostListenerCalled.set(true);
        }
      }

      @Component({
        template: `<button testHostListener>x</button>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestHostListener],
      })
      class Host {}

      await render(Host);
      fireEvent.click(screen.getByRole('button'));
      expect(hostListenerCalled()).toBe(false);
    });
  });

  describe('cross-channel dispatch', () => {
    it('should dispatch click pipeline from keydown handler', async () => {
      const clickFired = signal(false);

      @Resolvable()
      class CrossProto {
        constructor() {
          const ctx = inject(ProtoHost);
          ctx.on('click', ({ event, next }) => {
            clickFired.set(true);
            next.event('click', event);
          });
          ctx.on('keydown', ({ event, next }) => {
            if (event.key === 'Enter') {
              next.event('click', event);
              return;
            }
            next.event('keydown', event);
          });
        }
      }

      @Directive({ selector: '[testCross]' })
      class TestCross {
        readonly c = inject(CrossProto);
      }

      @Component({
        template: `<div testCross>x</div>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestCross],
      })
      class Host {}

      await render(Host);
      fireEvent.keyDown(screen.getByText('x'), { key: 'Enter' });
      expect(clickFired()).toBe(true);
    });

    it('should not mutate handler order on repeated cross-channel dispatch', async () => {
      const callCounts = { click: 0 };

      @Resolvable()
      class RepeatProto {
        constructor() {
          const ctx = inject(ProtoHost);
          ctx.on('click', ({ event, next }) => {
            callCounts.click++;
            next.event('click', event);
          });
          ctx.on('keydown', ({ event, next }) => {
            next.event('click', event);
          });
        }
      }

      @Directive({ selector: '[testRepeat]' })
      class TestRepeat {
        readonly r = inject(RepeatProto);
      }

      @Component({
        template: `<div testRepeat>x</div>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestRepeat],
      })
      class Host {}

      await render(Host);
      const el = screen.getByText('x');

      // Fire keydown 3 times — click handler should fire exactly once per keydown
      fireEvent.keyDown(el, { key: 'a' });
      fireEvent.keyDown(el, { key: 'b' });
      fireEvent.keyDown(el, { key: 'c' });

      expect(callCounts.click).toBe(3);
    });
  });

  describe('per-element isolation', () => {
    it('should give each element its own ProtoHostContext and Proto instances', async () => {
      @Resolvable()
      class CounterProto {
        readonly count = signal(0);
        constructor() {
          inject(ProtoHost).on('click', ({ event, next }) => {
            this.count.update(c => c + 1);
            next.event('click', event);
          });
        }
      }

      @Directive({ selector: '[testCounter]' })
      class TestCounter {
        readonly counter = inject(CounterProto);
      }

      @Component({
        selector: 'test-host',
        template: `
          <button id="a" testCounter>A</button>
          <button id="b" testCounter>B</button>
        `,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestCounter],
      })
      class Host {
        readonly buttons = viewChildren(TestCounter);
      }

      const { fixture } = await render(Host);
      const [btnA, btnB] = fixture.debugElement
        .queryAll(el => el.name === 'button')
        .map(de => de.nativeElement as HTMLButtonElement);

      fireEvent.click(btnA);
      fireEvent.click(btnA);
      fireEvent.click(btnB);

      const counters = fixture.componentInstance.buttons();

      expect(counters[0].counter.count()).toBe(2);
      expect(counters[1].counter.count()).toBe(1);
    });
  });

  describe('disabled interaction', () => {
    it('should prevent default on keydown when softDisabled', async () => {
      @Directive({ selector: '[testInteract]' })
      class TestInteract {
        readonly interact = inject(InteractBehavior);
      }

      @Component({
        template: `<button testInteract>x</button>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestInteract],
      })
      class Host {
        readonly dir = viewChild.required(TestInteract);
      }

      const { fixture } = await render(Host);
      const interact = fixture.componentInstance.dir().interact;
      interact.disabled.set(true);
      interact.focusableWhenDisabled.set(true); // softDisabled = true

      const event = createKeyboardEvent('keydown', { key: 'a' });
      fireEvent(screen.getByRole('button'), event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should allow Tab through when softDisabled', async () => {
      @Directive({ selector: '[testTab]' })
      class TestTab {
        readonly interact = inject(InteractBehavior);
      }

      @Component({
        template: `<button testTab>x</button>`,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [TestTab],
      })
      class Host {
        readonly dir = viewChild.required(TestTab);
      }

      const { fixture } = await render(Host);
      const interact = fixture.componentInstance.dir().interact;
      interact.disabled.set(true);
      interact.focusableWhenDisabled.set(true);

      const event = createKeyboardEvent('keydown', { key: 'Tab' });
      fireEvent(screen.getByRole('button'), event);
      expect(event.defaultPrevented).toBe(false);
    });
  });
});

function createKeyboardEvent(type: string, init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
}
