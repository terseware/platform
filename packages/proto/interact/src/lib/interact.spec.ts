import { Directive, inject, InjectionToken } from '@angular/core';
import { By } from '@angular/platform-browser';
import { resolve } from '@terseware/proto';
import { render, screen } from '@testing-library/angular';
import { Interact } from './interact';

@Directive({
  selector: '[testInteract]',
})
class TestInteract {
  readonly state = resolve(Interact);
}

describe('ProtoInteract', () => {
  describe('on native button', () => {
    it('should set disabled attribute when disabled', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, {
        imports: [DisabledBtn],
      });
      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should not set disabled attribute when not disabled', async () => {
      await render(`<button testInteract>Test</button>`, { imports: [TestInteract] });
      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('should not set disabled when focusableWhenDisabled is true', async () => {
      @Directive({ selector: '[focusableBtn]' })
      class FocusableBtn {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
          this.state.focusableWhenDisabled.set(true);
        }
      }

      await render(`<button focusableBtn>Test</button>`, { imports: [FocusableBtn] });
      const btn = screen.getByRole('button');
      expect(btn).not.toHaveAttribute('disabled');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).toHaveAttribute('data-disabled-focusable', '');
    });
  });

  describe('on non-native element', () => {
    it('should set aria-disabled instead of disabled', async () => {
      const MY_TOKEN = new InjectionToken('MY_TOKEN');
      @Directive({
        selector: '[disabledDiv]',
        providers: [{ provide: MY_TOKEN, useValue: 'MY_VALUE' }],
      })
      class DisabledDiv {
        readonly myState = inject(MY_TOKEN);
        readonly state = resolve(Interact);
        constructor() {
          console.log('state', this.myState);
          this.state.disabled.set(true);
        }
      }

      await render(`<div disabledDiv role="button">Test</div>`, {
        imports: [DisabledDiv],
      });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('aria-disabled', 'true');
    });

    it('should set tabindex to -1 when disabled', async () => {
      @Directive({ selector: '[disabledDiv]' })
      class DisabledDiv {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<div disabledDiv role="button">Test</div>`, { imports: [DisabledDiv] });
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('data-disabled attribute', () => {
    it('should set data-disabled when disabled', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, { imports: [DisabledBtn] });
      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', '');
    });

    it('should not set data-disabled when not disabled', async () => {
      await render(`<button testInteract>Test</button>`, { imports: [TestInteract] });
      expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
    });
  });

  describe('keyboard event blocking', () => {
    it('should block non-Tab keydown when disabled', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, { imports: [DisabledBtn] });
      const btn = screen.getByRole('button');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const stopSpy = vi.spyOn(enterEvent, 'stopImmediatePropagation');
      const preventSpy = vi.spyOn(enterEvent, 'preventDefault');

      btn.dispatchEvent(enterEvent);
      expect(stopSpy).toHaveBeenCalled();
      expect(preventSpy).toHaveBeenCalled();
    });

    it('should allow Tab key when disabled (no focus trap)', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, { imports: [DisabledBtn] });
      const btn = screen.getByRole('button');

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      const preventSpy = vi.spyOn(tabEvent, 'preventDefault');

      btn.dispatchEvent(tabEvent);
      expect(preventSpy).not.toHaveBeenCalled();
    });

    it('should not block keyboard when not disabled', async () => {
      await render(`<button testInteract>Test</button>`, { imports: [TestInteract] });
      const btn = screen.getByRole('button');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const stopSpy = vi.spyOn(enterEvent, 'stopImmediatePropagation');

      btn.dispatchEvent(enterEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('returned state', () => {
    it('should return the props as state', async () => {
      @Directive({ selector: '[stateDir]' })
      class StateDir {
        readonly state = resolve(Interact);
        constructor() {
          this.state.disabled.set(true);
          this.state.tabIndex.set(5);
        }
      }

      const { fixture } = await render(`<button stateDir>Test</button>`, {
        imports: [StateDir],
      });

      const dir = fixture.debugElement.query(By.directive(StateDir)).injector.get(StateDir);
      expect(dir.state.disabled()).toBe(true);
      expect(dir.state.tabIndex()).toBe(5);
      expect(dir.state.focusableWhenDisabled()).toBe(false);
    });
  });
});
