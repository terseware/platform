import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { resolve } from '@terseware/proto';
import { onChange, signalBind } from '@terseware/utils';
import { fireEvent, render, screen } from '@testing-library/angular';
import { PressProto } from './press.proto';

@Directive({
  selector: '[protoPress]',
  exportAs: 'protoPress',
})
class ProtoPress {
  readonly press = resolve(PressProto);

  readonly disabled = input<boolean, BooleanInput>(this.press.disabled(), {
    transform: booleanAttribute,
    alias: 'protoPressDisabled',
  });

  readonly pressStart = output<void>({ alias: 'protoPressStart' });
  readonly pressEnd = output<void>({ alias: 'protoPressEnd' });
  readonly pressChange = output<boolean>({ alias: 'protoPressChange' });
  readonly isPressed = this.press.isPressed;

  constructor() {
    signalBind(this.press.disabled, this.disabled);

    onChange(this.isPressed, isPressed => {
      if (isPressed) {
        this.pressChange.emit(true);
        this.pressStart.emit();
      } else {
        this.pressChange.emit(false);
        this.pressEnd.emit();
      }
    });
  }

  setDisabled(disabled: boolean): void {
    this.press.disabled.set(disabled);
  }
}

describe('ProtoPress', () => {
  describe('press state', () => {
    it('should set data-press when pressed', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-press');

      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');
    });

    it('should remove data-press on pointerup', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      fireEvent.pointerUp(document);
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should not have data-press initially', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      expect(screen.getByRole('button')).not.toHaveAttribute('data-press');
    });
  });

  describe('disabled state', () => {
    it('should not trigger press when disabled', async () => {
      await render(`<button protoPress [protoPressDisabled]="true">Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should not show data-press when disabled after being pressed', async () => {
      const { rerender, fixture } = await render(
        `<button protoPress [protoPressDisabled]="isDisabled">Press me</button>`,
        { imports: [ProtoPress], componentProperties: { isDisabled: false } },
      );

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-press');
    });
  });

  describe('pointer move outside element', () => {
    it('should reset press when pointer moves outside element', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      fireEvent.pointerMove(document.body, { target: document.body });
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should keep press when pointer moves within element', async () => {
      await render(`<button protoPress><span>Nested</span></button>`, { imports: [ProtoPress] });

      const button = screen.getByRole('button');
      const span = button.querySelector('span')!;

      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      // Moving to a child element should keep press active
      fireEvent.pointerMove(span, { target: span });
      expect(button).toHaveAttribute('data-press', '');
    });
  });

  describe('pointer cancel', () => {
    it('should reset press on pointer cancel', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      fireEvent.pointerCancel(document);
      expect(button).not.toHaveAttribute('data-press');
    });
  });

  describe('rapid interactions', () => {
    it('should handle rapid press/release cycles', async () => {
      await render(`<button protoPress>Press me</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');

      for (let i = 0; i < 5; i++) {
        fireEvent.pointerDown(button);
        expect(button).toHaveAttribute('data-press', '');
        fireEvent.pointerUp(button);
        expect(button).not.toHaveAttribute('data-press');
      }
    });
  });

  describe('element types', () => {
    it('should work with button elements', async () => {
      await render(`<button protoPress>Button</button>`, {
        imports: [ProtoPress],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');
    });

    it('should work with div elements', async () => {
      const container = await render(`<div protoPress tabindex="0">Custom</div>`, {
        imports: [ProtoPress],
      });

      const div = container.debugElement.query(By.css('div')).nativeElement;
      fireEvent.pointerDown(div);
      expect(div).toHaveAttribute('data-press', '');
    });

    it('should work with anchor elements', async () => {
      const container = await render(`<a protoPress href="#">Link</a>`, {
        imports: [ProtoPress],
      });

      const link = container.debugElement.query(By.css('a')).nativeElement;
      fireEvent.pointerDown(link);
      expect(link).toHaveAttribute('data-press', '');
    });
  });
});
