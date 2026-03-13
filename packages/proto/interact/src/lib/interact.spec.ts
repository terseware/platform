import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  Directive,
  inject,
  InjectionToken,
  input,
  numberAttribute,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { resolve } from '@terseware/proto';
import { signalBind } from '@terseware/utils';
import { render, screen } from '@testing-library/angular';
import { InteractProto } from './interact.proto';

describe('InteractProto', () => {
  @Directive({ selector: '[testInteract]' })
  class TestInteract {
    readonly state = resolve(InteractProto);
  }

  describe('on native button', () => {
    it('should set disabled attribute when disabled', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(InteractProto);
        constructor() {
          this.state.disabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, { imports: [DisabledBtn] });
      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should not set disabled attribute when not disabled', async () => {
      await render(`<button testInteract>Test</button>`, { imports: [TestInteract] });
      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('should not set disabled when focusableWhenDisabled is true', async () => {
      @Directive({ selector: '[focusableBtn]' })
      class FocusableBtn {
        readonly state = resolve(InteractProto);
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
        readonly state = resolve(InteractProto);
        constructor() {
          console.log('state', this.myState);
          this.state.disabled.set(true);
        }
      }

      await render(`<div disabledDiv role="button">Test</div>`, { imports: [DisabledDiv] });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('aria-disabled', 'true');
    });

    it('should set tabindex to -1 when disabled', async () => {
      @Directive({ selector: '[disabledDiv]' })
      class DisabledDiv {
        readonly state = resolve(InteractProto);
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
        readonly state = resolve(InteractProto);
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
    it('should block non-Tab keydown when disabled and focusable', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(InteractProto);
        constructor() {
          this.state.disabled.set(true);
          this.state.focusableWhenDisabled.set(true);
        }
      }

      await render(`<button disabledBtn>Test</button>`, { imports: [DisabledBtn] });
      const btn = screen.getByRole('button');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const preventSpy = vi.spyOn(enterEvent, 'preventDefault');

      btn.dispatchEvent(enterEvent);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('should allow Tab key when disabled (no focus trap)', async () => {
      @Directive({ selector: '[disabledBtn]' })
      class DisabledBtn {
        readonly state = resolve(InteractProto);
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
        readonly state = resolve(InteractProto);
        constructor() {
          this.state.disabled.set(true);
          this.state.tabIndex.set(5);
        }
      }

      const { fixture } = await render(`<button stateDir>Test</button>`, { imports: [StateDir] });

      const dir = fixture.debugElement.query(By.directive(StateDir)).injector.get(StateDir);
      expect(dir.state.disabled()).toBe(true);
      expect(dir.state.tabIndex()).toBe(5);
      expect(dir.state.focusableWhenDisabled()).toBe(false);
    });
  });

  describe('Full directive', () => {
    @Directive({ selector: '[protoInteract]' })
    class ProtoInteract {
      readonly #interact = resolve(InteractProto);

      readonly disabled = input<boolean, BooleanInput>(this.#interact.disabled(), {
        transform: booleanAttribute,
      });

      readonly focusableWhenDisabled = input<boolean, BooleanInput>(
        this.#interact.focusableWhenDisabled(),
        { transform: booleanAttribute },
      );

      readonly tabIndex = input<number, NumberInput>(this.#interact.tabIndex(), {
        transform: value => numberAttribute(value, this.#interact.tabIndex()),
      });

      constructor() {
        signalBind(this.#interact.disabled, this.disabled);
        signalBind(this.#interact.focusableWhenDisabled, this.focusableWhenDisabled);
        signalBind(this.#interact.tabIndex, this.tabIndex);
      }

      setDisabled(disabled: boolean): void {
        this.#interact.disabled.set(disabled);
      }

      setFocusableWhenDisabled(focusableWhenDisabled: boolean): void {
        this.#interact.focusableWhenDisabled.set(focusableWhenDisabled);
      }

      setTabIndex(tabIndex: number): void {
        this.#interact.tabIndex.set(tabIndex);
      }
    }

    describe('disabled state', () => {
      describe('native button', () => {
        it('should set the disabled attribute when disabled', async () => {
          await render(`<button protoInteract [disabled]="true">Click me</button>`, {
            imports: [ProtoInteract],
          });

          expect(screen.getByRole('button')).toHaveAttribute('disabled');
        });

        it('should not set the disabled attribute when not disabled', async () => {
          await render(`<button protoInteract>Click me</button>`, { imports: [ProtoInteract] });

          expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
        });

        it('should update disabled attribute when disabled changes', async () => {
          const { rerender, fixture } = await render(
            `<button protoInteract [disabled]="isDisabled">Click me</button>`,
            { imports: [ProtoInteract], componentProperties: { isDisabled: false } },
          );

          const button = screen.getByRole('button');
          expect(button).not.toHaveAttribute('disabled');

          await rerender({ componentProperties: { isDisabled: true } });
          fixture.detectChanges();
          expect(button).toHaveAttribute('disabled');

          await rerender({ componentProperties: { isDisabled: false } });
          fixture.detectChanges();
          expect(button).not.toHaveAttribute('disabled');
        });
      });

      describe('non-native element', () => {
        it('should not set the disabled attribute on non-button elements', async () => {
          const container = await render(`<a protoInteract [disabled]="true">Link</a>`, {
            imports: [ProtoInteract],
          });

          const anchor = container.debugElement.queryAll(By.css('a'));
          expect(anchor.length).toBe(1);
          expect(anchor[0].nativeElement).not.toHaveAttribute('disabled');
        });

        it('should not set the disabled attribute on div elements', async () => {
          const container = await render(`<div protoInteract [disabled]="true">Custom</div>`, {
            imports: [ProtoInteract],
          });

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement).not.toHaveAttribute('disabled');
        });
      });
    });

    describe('data-disabled attribute', () => {
      it('should set data-disabled when disabled', async () => {
        await render(`<button protoInteract [disabled]="true">Click me</button>`, {
          imports: [ProtoInteract],
        });

        expect(screen.getByRole('button')).toHaveAttribute('data-disabled', '');
      });

      it('should not set data-disabled when not disabled', async () => {
        await render(`<button protoInteract>Click me</button>`, { imports: [ProtoInteract] });

        expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
      });

      it('should set data-disabled on non-native elements when disabled', async () => {
        const container = await render(`<div protoInteract [disabled]="true">Custom</div>`, {
          imports: [ProtoInteract],
        });

        const div = container.debugElement.query(By.css('div'));
        expect(div.nativeElement).toHaveAttribute('data-disabled', '');
      });
    });

    describe('focusable', () => {
      it('should set data-disabled-focusable when disabled and focusable', async () => {
        await render(
          `<button protoInteract [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
          { imports: [ProtoInteract] },
        );

        expect(screen.getByRole('button')).toHaveAttribute('data-disabled-focusable', '');
      });

      it('should not set native disabled when focusable is true', async () => {
        await render(
          `<button protoInteract [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
          { imports: [ProtoInteract] },
        );

        expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
      });
    });

    describe('tabIndex behavior', () => {
      describe('non-native elements', () => {
        it('should adjust tabIndex to -1 when disabled and not focusable', async () => {
          const container = await render(
            `<div protoInteract [disabled]="true" tabIndex="0">Custom</div>`,
            { imports: [ProtoInteract] },
          );

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement.tabIndex).toBe(-1);
        });

        it('should keep tabIndex at 0 when disabled and focusable', async () => {
          const container = await render(
            `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true" tabIndex="0">Custom</div>`,
            { imports: [ProtoInteract] },
          );

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement.tabIndex).toBe(0);
        });

        it('should preserve custom tabIndex when disabled and focusable', async () => {
          const container = await render(
            `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true" tabIndex="2">Custom</div>`,
            { imports: [ProtoInteract] },
          );

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement.tabIndex).toBe(2);
        });

        it('should keep tabIndex at 0 when not disabled and focusable', async () => {
          const container = await render(
            `<div protoInteract [disabled]="false" [focusableWhenDisabled]="true">Custom</div>`,
            { imports: [ProtoInteract] },
          );

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement.tabIndex).toBe(0);
        });

        it('should keep tabIndex at 0 when disabled and focusable', async () => {
          const container = await render(
            `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true">Custom</div>`,
            { imports: [ProtoInteract] },
          );

          const div = container.debugElement.query(By.css('div'));
          expect(div.nativeElement.tabIndex).toBe(0);
        });
      });

      describe('native elements', () => {
        it('should keep tabIndex at 0 when disabled and focusable', async () => {
          const container = await render(
            `<button protoInteract [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
            { imports: [ProtoInteract] },
          );

          const button = container.debugElement.query(By.css('button'));
          expect(button.nativeElement.tabIndex).toBe(0);
        });

        it('should preserve custom tabIndex when disabled and focusable', async () => {
          const container = await render(
            `<button protoInteract [disabled]="true" [focusableWhenDisabled]="true" tabIndex="2">Click me</button>`,
            { imports: [ProtoInteract] },
          );

          const button = container.debugElement.query(By.css('button'));
          expect(button.nativeElement.tabIndex).toBe(2);
        });
      });

      it('should keep tabIndex at -1 when not disabled and focusable', async () => {
        const container = await render(
          `<button protoInteract [disabled]="false" [focusableWhenDisabled]="true" tabIndex="-1">Click me</button>`,
          { imports: [ProtoInteract] },
        );

        const button = container.debugElement.query(By.css('button'));
        expect(button.nativeElement.tabIndex).toBe(-1);
      });

      it('should keep tabIndex at 0 when disabled and focusable is false', async () => {
        const container = await render(
          `<button protoInteract [disabled]="true" [focusableWhenDisabled]="false">Click me</button>`,
          { imports: [ProtoInteract] },
        );

        const button = container.debugElement.query(By.css('button'));
        expect(button.nativeElement.tabIndex).toBe(0);
      });
    });

    describe('aria-disabled', () => {
      it('should set aria-disabled on non-native elements when disabled', async () => {
        const container = await render(`<div protoInteract [disabled]="true">Custom</div>`, {
          imports: [ProtoInteract],
        });

        const div = container.debugElement.query(By.css('div'));
        expect(div.nativeElement).toHaveAttribute('aria-disabled', 'true');
      });

      it('should not set aria-disabled on native buttons (native disabled is sufficient)', async () => {
        await render(`<button protoInteract [disabled]="true">Click me</button>`, {
          imports: [ProtoInteract],
        });

        expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
      });

      it('should set aria-disabled on native buttons when focusable', async () => {
        await render(
          `<button protoInteract [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
          { imports: [ProtoInteract] },
        );

        expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
      });
    });

    describe('keydown event blocking', () => {
      it('should block Enter key when disabled and focusable', async () => {
        const container = await render(
          `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true">Custom</div>`,
          { imports: [ProtoInteract] },
        );

        const div = container.debugElement.query(By.css('div'));
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        const preventSpy = vi.spyOn(event, 'preventDefault');

        div.nativeElement.dispatchEvent(event);
        expect(preventSpy).toHaveBeenCalled();
      });

      it('should allow Tab key when disabled (prevent focus trap)', async () => {
        const container = await render(
          `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true">Custom</div>`,
          { imports: [ProtoInteract] },
        );

        const div = container.debugElement.query(By.css('div'));
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        const stopSpy = vi.spyOn(event, 'preventDefault');

        div.nativeElement.dispatchEvent(event);
        expect(stopSpy).not.toHaveBeenCalled();
      });
    });

    describe('tab navigation', () => {
      it('should set tabIndex to -1 for disabled non-native element', async () => {
        const container = await render(
          `<div protoInteract [disabled]="true" tabIndex="0">Disabled</div>`,
          { imports: [ProtoInteract] },
        );

        const div = container.debugElement.query(By.css('div'));
        expect(div.nativeElement.tabIndex).toBe(-1);
      });

      it('should keep tabIndex for focusable disabled element', async () => {
        const container = await render(
          `<div protoInteract [disabled]="true" [focusableWhenDisabled]="true" tabIndex="0">Disabled Focusable</div>`,
          { imports: [ProtoInteract] },
        );

        const div = container.debugElement.query(By.css('div'));
        expect(div.nativeElement.tabIndex).toBe(0);
      });
    });

    describe('with different element types', () => {
      it('should work with button elements', async () => {
        await render(`<button protoInteract>Button</button>`, { imports: [ProtoInteract] });

        const button = screen.getByRole('button');
        expect(button.tagName).toBe('BUTTON');
      });

      it('should work with anchor elements', async () => {
        const container = await render(`<a protoInteract href="#">Link</a>`, {
          imports: [ProtoInteract],
        });

        const link = container.debugElement.query(By.css('a'));
        expect(link.nativeElement.tagName).toBe('A');
      });

      it('should work with div elements', async () => {
        const container = await render(`<div protoInteract>Custom</div>`, {
          imports: [ProtoInteract],
        });

        const div = container.debugElement.query(By.css('div'));
        expect(div.nativeElement.tagName).toBe('DIV');
      });

      it('should work with input elements', async () => {
        await render(`<input protoInteract type="text" />`, { imports: [ProtoInteract] });

        const inp = screen.getByRole('textbox');
        expect(inp.tagName).toBe('INPUT');
      });
    });
  });
});
