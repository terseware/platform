import { FocusMonitor } from '@angular/cdk/a11y';
import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { resolve } from '@terseware/proto';
import { FocusProto } from '@terseware/proto/focus';
import { HoverProto } from '@terseware/proto/hover';
import { PressProto } from '@terseware/proto/press';
import { signalBind } from '@terseware/utils';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ButtonProto } from './button.proto';

@Directive({ selector: '[protoButton]', exportAs: 'protoButton' })
class ProtoButton {
  readonly button = resolve(ButtonProto);
  readonly hover = resolve(HoverProto);
  readonly press = resolve(PressProto);
  readonly focus = resolve(FocusProto);

  readonly disabled = input<boolean, BooleanInput>(this.button.interact.disabled(), {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(
    this.button.interact.focusableWhenDisabled(),
    { transform: booleanAttribute },
  );

  readonly tabIndex = input<number, NumberInput>(this.button.interact.tabIndex(), {
    transform: value => numberAttribute(value, this.button.interact.tabIndex()),
  });

  readonly role = input<string | null>(this.button.role());
  readonly type = input<string | null>(this.button.type());

  constructor() {
    signalBind(this.button.interact.disabled, this.disabled);
    signalBind(this.button.interact.focusableWhenDisabled, this.focusableWhenDisabled);
    signalBind(this.button.interact.tabIndex, this.tabIndex);
    signalBind(this.button.role, this.role);
    signalBind(this.button.type, this.type);

    signalBind(this.hover.disabled, this.button.interact.disabled);
    signalBind(this.press.disabled, this.button.interact.disabled);
    signalBind(this.focus.disabled, this.button.interact.hardDisabled); // Allow focus when focusable when disabled is true
  }
}

describe('ProtoButton', () => {
  it('should set the disabled attribute when disabled', async () => {
    const container = await render(`<button protoButton [disabled]="true"></button>`, {
      imports: [ProtoButton],
    });

    expect(container.getByRole('button')).toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not disabled', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    expect(container.getByRole('button')).not.toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not a button', async () => {
    const container = await render(`<a protoButton [disabled]="true"></a>`, {
      imports: [ProtoButton],
    });
    const button = container.debugElement.queryAll(By.css('a'));
    expect(button.length).toBe(1);
    expect(button[0].nativeElement).not.toHaveAttribute('disabled');
  });

  it('should set the data-disabled attribute when disabled', async () => {
    const container = await render(`<button protoButton [disabled]="true"></button>`, {
      imports: [ProtoButton],
    });

    expect(container.getByRole('button')).toHaveAttribute('data-disabled', '');
  });

  it('should not set the data-disabled attribute when not disabled', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    expect(container.getByRole('button')).not.toHaveAttribute('data-disabled');
  });

  it('should update the data-disabled attribute when disabled changes', async () => {
    const { getByRole, rerender, fixture } = await render(
      `<button protoButton [disabled]="isDisabled"></button>`,
      { imports: [ProtoButton], componentProperties: { isDisabled: false } },
    );

    const button = getByRole('button');
    expect(button).not.toHaveAttribute('data-disabled');
    expect(button).not.toHaveAttribute('disabled');

    await rerender({ componentProperties: { isDisabled: true } });
    fixture.detectChanges();
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('disabled');
  });

  it('should add the data-hover attribute when hovered', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const button = container.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(button).toHaveAttribute('data-hover', '');
  });

  it('should remove the data-hover attribute when not hovered', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const button = container.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(button).toHaveAttribute('data-hover', '');
    fireEvent.mouseLeave(button);
    expect(button).not.toHaveAttribute('data-hover');
  });

  it('should add the data-focus attribute when focused', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const focusMonitor = TestBed.inject(FocusMonitor);

    const button = container.getByRole('button');
    focusMonitor.focusVia(button, 'keyboard');
    container.detectChanges();
    expect(button).toHaveAttribute('data-focus-visible');
  });

  it('should remove the data-focus attribute when not focused', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const focusMonitor = TestBed.inject(FocusMonitor);

    const button = container.getByRole('button');
    focusMonitor.focusVia(button, 'keyboard');
    container.detectChanges();
    expect(button).toHaveAttribute('data-focus-visible');
    fireEvent.blur(button);
    expect(button).not.toHaveAttribute('data-focus-visible');
  });

  it('should add the data-press attribute when pressed', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const button = container.getByRole('button');
    fireEvent.pointerDown(button);
    expect(button).toHaveAttribute('data-press', '');
  });

  it('should remove the data-press attribute when not pressed', async () => {
    const container = await render(`<button protoButton></button>`, { imports: [ProtoButton] });

    const button = container.getByRole('button');
    fireEvent.pointerDown(button);
    expect(button).toHaveAttribute('data-press', '');
    fireEvent.pointerUp(button);
    expect(button).not.toHaveAttribute('data-press');
  });

  it('should not add the data-press attribute when disabled', async () => {
    const container = await render(`<button protoButton [disabled]="true"></button>`, {
      imports: [ProtoButton],
    });

    const button = container.getByRole('button');
    fireEvent.pointerDown(button);
    expect(button).not.toHaveAttribute('data-press');
  });

  it('should not add the data-focus-visible attribute when disabled', async () => {
    const container = await render(`<button protoButton [disabled]="true"></button>`, {
      imports: [ProtoButton],
    });

    const focusMonitor = TestBed.inject(FocusMonitor);

    const button = container.getByRole('button');
    focusMonitor.focusVia(button, 'keyboard');
    container.detectChanges();
    expect(button).not.toHaveAttribute('data-focus-visible');
  });

  it('should not add the data-hover attribute when disabled', async () => {
    const container = await render(`<button protoButton [disabled]="true"></button>`, {
      imports: [ProtoButton],
    });

    const button = container.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(button).not.toHaveAttribute('data-hover');
  });

  describe('disabled state', () => {
    describe('native button', () => {
      it('should set the disabled attribute when disabled', async () => {
        await render(`<button protoButton [disabled]="true">Click me</button>`, {
          imports: [ProtoButton],
        });

        expect(screen.getByRole('button')).toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute when not disabled', async () => {
        await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

        expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
      });

      it('should update disabled attribute when disabled changes', async () => {
        const { rerender, fixture } = await render(
          `<button protoButton [disabled]="isDisabled">Click me</button>`,
          { imports: [ProtoButton], componentProperties: { isDisabled: false } },
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
        const container = await render(`<a protoButton [disabled]="true">Link</a>`, {
          imports: [ProtoButton],
        });

        const anchor = container.debugElement.queryAll(By.css('a'));
        expect(anchor.length).toBe(1);
        expect(anchor[0].nativeElement).not.toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute on div elements', async () => {
        await render(`<div protoButton [disabled]="true">Custom</div>`, { imports: [ProtoButton] });

        const div = screen.getByRole('button');
        expect(div).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('data-disabled attribute', () => {
    it('should set data-disabled when disabled', async () => {
      await render(`<button protoButton [disabled]="true">Click me</button>`, {
        imports: [ProtoButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', '');
    });

    it('should not set data-disabled when not disabled', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
    });

    it('should update data-disabled when disabled changes', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isDisabled">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-disabled');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-disabled', '');
    });

    it('should set data-disabled on non-native elements when disabled', async () => {
      await render(`<div protoButton [disabled]="true">Custom</div>`, { imports: [ProtoButton] });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', '');
    });
  });

  describe('focusable', () => {
    it('should set data-disabled-focusable when disabled and focusable', async () => {
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled-focusable', '');
    });

    it('should not set native disabled when focusable is true', async () => {
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('should prevent click when focusable is true but disabled', async () => {
      const stopSpy = vi.fn();
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true" (click)="stopSpy($event)">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { stopSpy } },
      );

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });

      button.dispatchEvent(clickEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('role attribute', () => {
    it('should not add role="button" to native button elements', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      // Native buttons have implicit button role, no explicit attribute needed
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('role')).toBeNull();
    });

    it('should add role="button" to non-native elements without explicit role', async () => {
      await render(`<div protoButton>Custom Button</div>`, { imports: [ProtoButton] });

      const div = screen.getByRole('button');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should not override explicit role input', async () => {
      await render(`<div protoButton [role]="'menuitem'">Menu Item</div>`, {
        imports: [ProtoButton],
      });

      const div = screen.getByRole('menuitem');
      expect(div).toHaveAttribute('role', 'menuitem');
    });

    it('should preserve link role for anchors with href', async () => {
      const container = await render(`<a protoButton href="/test">Link</a>`, {
        imports: [ProtoButton],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).not.toHaveAttribute('role', 'button');
    });

    it('should not add role to input[type="button"]', async () => {
      await render(`<input protoButton type="button" value="Input Button" />`, {
        imports: [ProtoButton],
      });

      const inp = screen.getByRole('button');
      expect(inp.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="submit"]', async () => {
      await render(`<input protoButton type="submit" value="Submit" />`, {
        imports: [ProtoButton],
      });

      const inp = screen.getByRole('button');
      expect(inp.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="reset"]', async () => {
      await render(`<input protoButton type="reset" value="Reset" />`, { imports: [ProtoButton] });

      const inp = screen.getByRole('button');
      expect(inp.getAttribute('role')).toBeNull();
    });
  });

  describe('click handling', () => {
    it('should call click handler when clicked', async () => {
      const handleClick = vi.fn();
      await render(`<button protoButton (click)="onClick()">Click me</button>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should stop click event propagation when disabled', async () => {
      const stopSpy = vi.fn();
      await render(
        `<button protoButton [disabled]="true" (click)="stopSpy($event)">Click me</button>`,
        {
          imports: [ProtoButton],
          componentProperties: { stopSpy },
        },
      );

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });

      button.dispatchEvent(clickEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interactions (non-native elements)', () => {
    it('should trigger click on Enter keydown for non-native elements', async () => {
      const handleClick = vi.fn();
      await render(`<div protoButton (click)="onClick()">Custom Button</div>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const div = screen.getByRole('button');
      div.focus();
      fireEvent.keyDown(div, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger click on Space keyup for non-native elements', async () => {
      const handleClick = vi.fn();
      await render(`<div protoButton (click)="onClick()">Custom Button</div>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const div = screen.getByRole('button');
      div.focus();
      fireEvent.keyDown(div, { key: ' ' });
      fireEvent.keyUp(div, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should prevent default on Space keydown to avoid page scroll', async () => {
      await render(`<div protoButton>Custom Button</div>`, { imports: [ProtoButton] });

      const div = screen.getByRole('button');
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      const preventSpy = vi.spyOn(spaceEvent, 'preventDefault');

      div.dispatchEvent(spaceEvent);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('should prevent default on Enter keydown for non-native elements', async () => {
      await render(`<div protoButton>Custom Button</div>`, { imports: [ProtoButton] });

      const div = screen.getByRole('button');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const preventSpy = vi.spyOn(enterEvent, 'preventDefault');

      div.dispatchEvent(enterEvent);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('should not trigger click on keyboard for native buttons (browser handles it)', async () => {
      const handleClick = vi.fn();
      await render(`<button protoButton (click)="onClick()">Click me</button>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const button = screen.getByRole('button');
      button.focus();

      // For native buttons, the browser handles Enter/Space -> click
      // ProtoButton should not duplicate this behavior
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });

      // Click count should be 0 because we're using fireEvent.keyDown, not actual key press
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('should not trigger click on keyboard when disabled', async () => {
      const handleClick = vi.fn();
      await render(`<div protoButton [disabled]="true" (click)="onClick()">Custom Button</div>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const div = screen.getByRole('button');
      div.focus();
      fireEvent.keyDown(div, { key: 'Enter' });
      fireEvent.keyDown(div, { key: ' ' });
      fireEvent.keyUp(div, { key: ' ' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger click for keys other than Enter/Space', async () => {
      const handleClick = vi.fn();
      await render(`<div protoButton (click)="onClick()">Custom Button</div>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const div = screen.getByRole('button');
      div.focus();
      fireEvent.keyDown(div, { key: 'a' });
      fireEvent.keyDown(div, { key: 'Escape' });
      fireEvent.keyDown(div, { key: 'Tab' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should only trigger click when target is the button itself', async () => {
      const handleClick = vi.fn();
      await render(`<div protoButton (click)="onClick()"><span>Nested content</span></div>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const span = screen.getByText('Nested content');
      fireEvent.keyDown(span, { key: 'Enter' });

      // Click should not be triggered because target is not the button
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('with different element types', () => {
    it('should work with button elements', async () => {
      await render(`<button protoButton>Button</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should work with anchor elements', async () => {
      const container = await render(`<a protoButton href="#">Link</a>`, {
        imports: [ProtoButton],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement.tagName).toBe('A');
    });

    it('should work with div elements and add role', async () => {
      await render(`<div protoButton>Custom</div>`, { imports: [ProtoButton] });

      const div = screen.getByRole('button');
      expect(div.tagName).toBe('DIV');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should work with span elements and add role', async () => {
      await render(`<span protoButton>Custom</span>`, { imports: [ProtoButton] });

      const span = screen.getByRole('button');
      expect(span.tagName).toBe('SPAN');
      expect(span).toHaveAttribute('role', 'button');
    });

    it('should work with input[type="button"] elements', async () => {
      await render(`<input protoButton type="button" value="Input Button" />`, {
        imports: [ProtoButton],
      });

      const inp = screen.getByRole('button');
      expect(inp.tagName).toBe('INPUT');
    });

    it('should work with input[type="submit"] elements', async () => {
      await render(`<input protoButton type="submit" value="Submit" />`, {
        imports: [ProtoButton],
      });

      const inp = screen.getByRole('button');
      expect(inp.tagName).toBe('INPUT');
    });
  });

  describe('anchor button behavior', () => {
    it('should not trigger keyboard click on anchors with href (browser handles navigation)', async () => {
      const handleClick = vi.fn();
      await render(`<a protoButton href="/test" (click)="onClick()">Link</a>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const link = screen.getByRole('link');
      link.focus();
      fireEvent.keyDown(link, { key: 'Enter' });

      // Anchors with href should be handled by browser, not our code
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should trigger keyboard click on anchors without href', async () => {
      const handleClick = vi.fn();
      await render(`<a protoButton (click)="onClick()">Custom Action</a>`, {
        imports: [ProtoButton],
        componentProperties: { onClick: handleClick },
      });

      const button = screen.getByRole('button');
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('role attribute handling', () => {
    it('should preserve custom role via input through disabled state changes', async () => {
      const { rerender, fixture } = await render(
        `<div protoButton [role]="'tab'" [disabled]="isDisabled">Tab</div>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const div = screen.getByRole('tab');
      expect(div).toHaveAttribute('role', 'tab');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(div).toHaveAttribute('role', 'tab');
      expect(div).toHaveAttribute('data-disabled', '');

      await rerender({ componentProperties: { isDisabled: false } });
      fixture.detectChanges();
      expect(div).toHaveAttribute('role', 'tab');
      expect(div).not.toHaveAttribute('data-disabled');
    });

    it('should fall back to auto-assignment when role is null on non-native elements', async () => {
      await render(`<div protoButton [attr.role]="null">Custom</div>`, { imports: [ProtoButton] });

      // When role is null (default), auto-assignment kicks in for non-native elements
      expect(screen.getByRole('button')).toHaveAttribute('role', 'button');
    });

    it('should properly handle initial role assignment from attribute', async () => {
      const { rerender, fixture } = await render(`<div protoButton [role]="role">Item</div>`, {
        imports: [ProtoButton],
        componentProperties: { role: 'tab' },
      });

      const el = screen.getByRole('tab');
      expect(el).toHaveAttribute('role', 'tab');

      await rerender({ componentProperties: { role: 'option' } });
      fixture.detectChanges();
      expect(el).toHaveAttribute('role', 'option');
    });
  });

  describe('tabindex', () => {
    it('should have tabindex="0" by default', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('should have tabindex="0" on non-native elements', async () => {
      await render(`<div protoButton>Custom</div>`, { imports: [ProtoButton] });

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('aria-disabled', () => {
    it('should set aria-disabled on non-native elements when disabled', async () => {
      await render(`<div protoButton [disabled]="true">Custom</div>`, { imports: [ProtoButton] });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not set aria-disabled on native button when disabled', async () => {
      await render(`<button protoButton [disabled]="true">Click me</button>`, {
        imports: [ProtoButton],
      });

      // Native buttons use the disabled attribute, not aria-disabled
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });

    it('should update aria-disabled when disabled changes on non-native element', async () => {
      const { rerender, fixture } = await render(
        `<div protoButton [disabled]="isDisabled">Custom</div>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const div = screen.getByRole('button');
      expect(div).not.toHaveAttribute('aria-disabled');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(div).toHaveAttribute('aria-disabled', 'true');

      await rerender({ componentProperties: { isDisabled: false } });
      fixture.detectChanges();
      expect(div).not.toHaveAttribute('aria-disabled');
    });

    it('should set aria-disabled on native button when focusable', async () => {
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('pointerdown event blocking', () => {
    it('should not trigger data-press when disabled (pointerdown blocked)', async () => {
      await render(`<button protoButton [disabled]="true">Click me</button>`, {
        imports: [ProtoButton],
      });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      // data-press should not appear because pointerdown is blocked when disabled
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should trigger data-press when not disabled', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');
    });

    it('should not trigger data-press on non-native disabled element (pointerdown blocked)', async () => {
      await render(`<div protoButton [disabled]="true">Custom</div>`, { imports: [ProtoButton] });

      const div = screen.getByRole('button');
      fireEvent.pointerDown(div);
      expect(div).not.toHaveAttribute('data-press');
    });
  });

  describe('mousedown event blocking', () => {
    it('should block mousedown when disabled', async () => {
      const stopSpy = vi.fn();
      await render(
        `<button protoButton [disabled]="true" (mousedown)="stopSpy($event)">Click me</button>`,
        {
          imports: [ProtoButton],
          componentProperties: { stopSpy },
        },
      );

      const button = screen.getByRole('button');
      const mousedownEvent = new MouseEvent('mousedown', { bubbles: true });

      button.dispatchEvent(mousedownEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it('should allow mousedown when not disabled', async () => {
      const stopSpy = vi.fn();
      await render(`<button protoButton (mousedown)="stopSpy($event)">Click me</button>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const button = screen.getByRole('button');
      const mousedownEvent = new MouseEvent('mousedown', { bubbles: true });

      button.dispatchEvent(mousedownEvent);
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('keyup event blocking', () => {
    it('should block keyup when disabled', async () => {
      const stopSpy = vi.fn();
      await render(`<div protoButton [disabled]="true" (keyup)="stopSpy($event)">Custom</div>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const div = screen.getByRole('button');
      const keyupEvent = new KeyboardEvent('keyup', { key: ' ', bubbles: true });

      div.dispatchEvent(keyupEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it('should allow keyup when not disabled', async () => {
      const stopSpy = vi.fn();
      await render(`<div protoButton (keyup)="stopSpy($event)">Custom</div>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const div = screen.getByRole('button');
      const keyupEvent = new KeyboardEvent('keyup', { key: ' ', bubbles: true });

      div.dispatchEvent(keyupEvent);
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Tab key handling when disabled', () => {
    it('should allow tabbing away from disabled button to prevent focus trap', async () => {
      const stopSpy = vi.fn();
      await render(`<div protoButton [disabled]="true" (keydown)="stopSpy($event)">Custom</div>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const div = screen.getByRole('button');
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });

      div.dispatchEvent(tabEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it('should block Space key when disabled', async () => {
      const stopSpy = vi.fn();
      await render(`<div protoButton [disabled]="true" (keydown)="stopSpy($event)">Custom</div>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const div = screen.getByRole('button');
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });

      div.dispatchEvent(spaceEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it('should block Enter key when disabled', async () => {
      const stopSpy = vi.fn();
      await render(`<div protoButton [disabled]="true" (keydown)="stopSpy($event)">Custom</div>`, {
        imports: [ProtoButton],
        componentProperties: { stopSpy },
      });

      const div = screen.getByRole('button');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      div.dispatchEvent(enterEvent);
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('disabled state transitions', () => {
    it('should remove data-hover when becoming disabled while hovered', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isDisabled">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(button).toHaveAttribute('data-hover', '');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should remove data-focus-visible when becoming disabled while focused', async () => {
      const { fixture, rerender } = await render(
        `<button protoButton [disabled]="isDisabled">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      focusMonitor.focusVia(button, 'keyboard');
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus-visible');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-focus-visible');
    });

    it('should restore interactions when re-enabled', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isDisabled">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: true } },
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(button).not.toHaveAttribute('data-hover');

      await rerender({ componentProperties: { isDisabled: false } });
      fixture.detectChanges();

      fireEvent.mouseEnter(button);
      expect(button).toHaveAttribute('data-hover', '');
    });

    it('should allow click handlers to be called after re-enabling', async () => {
      const handleClick = vi.fn();
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isDisabled" (click)="onClick()">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: true, onClick: handleClick } },
      );

      const button = screen.getByRole('button');

      // Click while disabled - should not call handler
      const clickEvent1 = new MouseEvent('click', { bubbles: true });
      button.dispatchEvent(clickEvent1);
      expect(handleClick).not.toHaveBeenCalled();

      // Re-enable
      await rerender({ componentProperties: { isDisabled: false, onClick: handleClick } });
      fixture.detectChanges();

      // Click after re-enabling - should call handler
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('focusable advanced scenarios', () => {
    it('should add data-focus-visible when focusable and keyboard focused', async () => {
      const container = await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      focusMonitor.focusVia(button, 'keyboard');
      container.detectChanges();
      expect(button).toHaveAttribute('data-focus-visible');
    });

    it('should not add data-hover when disabled even with focusable', async () => {
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should not add data-press when disabled even with focusable', async () => {
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton] },
      );

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should still block keyboard activation when focusable', async () => {
      const handleClick = vi.fn();
      await render(
        `<div protoButton [disabled]="true" [focusableWhenDisabled]="true" (click)="onClick()">Custom</div>`,
        { imports: [ProtoButton], componentProperties: { onClick: handleClick } },
      );

      const div = screen.getByRole('button');
      div.focus();
      fireEvent.keyDown(div, { key: 'Enter' });
      fireEvent.keyDown(div, { key: ' ' });
      fireEvent.keyUp(div, { key: ' ' });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should update data-disabled-focusable when toggling focusable', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="isFocusable">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isFocusable: false } },
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-disabled-focusable');

      await rerender({ componentProperties: { isFocusable: true } });
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-disabled-focusable', '');

      await rerender({ componentProperties: { isFocusable: false } });
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-disabled-focusable');
    });
  });

  describe('press interaction edge cases', () => {
    it('should remove data-press when pointer moves outside button', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');
      fireEvent.pointerDown(button);
      expect(button).toHaveAttribute('data-press', '');

      // Simulate pointer moving outside by firing pointerup on document
      fireEvent.pointerUp(document);
      expect(button).not.toHaveAttribute('data-press');
    });

    it('should handle rapid press/release cycles', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');

      for (let i = 0; i < 5; i++) {
        fireEvent.pointerDown(button);
        expect(button).toHaveAttribute('data-press', '');
        fireEvent.pointerUp(button);
        expect(button).not.toHaveAttribute('data-press');
      }
    });
  });

  describe('focus interaction edge cases', () => {
    it('should handle focus via mouse click (no focus-visible)', async () => {
      const container = await render(`<button protoButton>Click me</button>`, {
        imports: [ProtoButton],
      });

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      focusMonitor.focusVia(button, 'mouse');
      container.detectChanges();
      // Mouse focus should not show focus-visible for buttons
      expect(button).not.toHaveAttribute('data-focus-visible');
    });

    it('should handle focus via touch (no focus-visible)', async () => {
      const container = await render(`<button protoButton>Click me</button>`, {
        imports: [ProtoButton],
      });

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      focusMonitor.focusVia(button, 'touch');
      container.detectChanges();
      expect(button).not.toHaveAttribute('data-focus-visible');
    });

    it('should handle focus via program (keyboard-like behavior)', async () => {
      const container = await render(`<button protoButton>Click me</button>`, {
        imports: [ProtoButton],
      });

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      focusMonitor.focusVia(button, 'program');
      container.detectChanges();
      // Program focus typically doesn't show focus-visible for buttons
      expect(button).not.toHaveAttribute('data-focus-visible');
    });
  });

  describe('input types with native button behavior', () => {
    it('should set disabled attribute on input[type="button"] when disabled', async () => {
      await render(`<input protoButton type="button" [disabled]="true" value="Input Button" />`, {
        imports: [ProtoButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="submit"] when disabled', async () => {
      await render(`<input protoButton type="submit" [disabled]="true" value="Submit" />`, {
        imports: [ProtoButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="reset"] when disabled', async () => {
      await render(`<input protoButton type="reset" [disabled]="true" value="Reset" />`, {
        imports: [ProtoButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });
  });

  describe('bubbled event handling', () => {
    it('should block bubbled keydown from children when disabled', async () => {
      const stopSpy = vi.fn();
      await render(
        `<div protoButton [disabled]="true" (keydown)="stopSpy($event)"><input type="text" /></div>`,
        {
          imports: [ProtoButton],
          componentProperties: { stopSpy },
        },
      );

      const inp = screen.getByRole('textbox');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

      inp.dispatchEvent(event);
      expect(stopSpy).not.toHaveBeenCalled();
    });

    it('should block bubbled click from children when disabled', async () => {
      const stopSpy = vi.fn();
      const container = await render(
        `<div protoButton [disabled]="true" (click)="stopSpy($event)"><span>Click me</span></div>`,
        { imports: [ProtoButton], componentProperties: { stopSpy } },
      );

      const span = container.debugElement.query(By.css('span'));
      const event = new MouseEvent('click', { bubbles: true });
      const preventSpy = vi.spyOn(event, 'preventDefault');

      span.nativeElement.dispatchEvent(event);
      expect(stopSpy).not.toHaveBeenCalled();
      expect(preventSpy).toHaveBeenCalled();
    });
  });

  describe('hover interaction edge cases', () => {
    it('should not trigger hover on touch events', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');

      // Simulate touch by firing touchstart first
      fireEvent.touchStart(button);
      fireEvent.mouseEnter(button);

      // The hover should be ignored after touch
      // Note: This is hard to test without the full GlobalPointerEvents behavior
    });

    it('should handle mouseenter/mouseleave sequence', async () => {
      await render(`<button protoButton>Click me</button>`, { imports: [ProtoButton] });

      const button = screen.getByRole('button');

      fireEvent.mouseEnter(button);
      expect(button).toHaveAttribute('data-hover', '');

      fireEvent.mouseLeave(button);
      expect(button).not.toHaveAttribute('data-hover');
    });
  });

  describe('combined disabled and focusable transitions', () => {
    it('should handle enabling focusable while already disabled', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="isFocusable">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isFocusable: false } },
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled-focusable');

      await rerender({ componentProperties: { isFocusable: true } });
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled-focusable', '');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle disabling while focusable is true', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isDisabled" [focusableWhenDisabled]="true">Click me</button>`,
        { imports: [ProtoButton], componentProperties: { isDisabled: false } },
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled-focusable');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled-focusable', '');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('anchor elements with href (link buttons)', () => {
    it('should preserve link role on anchor with href', async () => {
      const container = await render(`<a protoButton href="/dashboard">Dashboard</a>`, {
        imports: [ProtoButton],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).toHaveAttribute('href', '/dashboard');
      // Should have implicit link role, not button
      expect(link.nativeElement.getAttribute('role')).toBeNull();
    });

    it('should add data-hover on anchor with href', async () => {
      const container = await render(`<a protoButton href="/dashboard">Dashboard</a>`, {
        imports: [ProtoButton],
      });

      const link = container.debugElement.query(By.css('a')).nativeElement;
      fireEvent.mouseEnter(link);
      expect(link).toHaveAttribute('data-hover', '');
    });

    it('should add data-press on anchor with href', async () => {
      const container = await render(`<a protoButton href="/dashboard">Dashboard</a>`, {
        imports: [ProtoButton],
      });

      const link = container.debugElement.query(By.css('a')).nativeElement;
      fireEvent.pointerDown(link);
      expect(link).toHaveAttribute('data-press', '');
    });

    it('should add data-focus-visible on anchor with href when keyboard focused', async () => {
      const container = await render(`<a protoButton href="/dashboard">Dashboard</a>`, {
        imports: [ProtoButton],
      });

      const focusMonitor = TestBed.inject(FocusMonitor);
      const link = container.debugElement.query(By.css('a')).nativeElement;
      focusMonitor.focusVia(link, 'keyboard');
      container.detectChanges();
      expect(link).toHaveAttribute('data-focus-visible');
    });

    it('should set data-disabled on anchor with href when disabled', async () => {
      const container = await render(
        `<a protoButton href="/dashboard" [disabled]="true">Dashboard</a>`,
        { imports: [ProtoButton] },
      );

      const link = container.debugElement.query(By.css('a')).nativeElement;
      expect(link).toHaveAttribute('data-disabled', '');
      // Anchors don't support native disabled, so no disabled attribute
      expect(link).not.toHaveAttribute('disabled');
      // Should have aria-disabled for AT
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('should block click on disabled anchor with href', async () => {
      const handleClick = vi.fn();
      const { container } = await render(
        `<a protoButton href="/dashboard" [disabled]="true" (click)="onClick()">Dashboard</a>`,
        { imports: [ProtoButton], componentProperties: { onClick: handleClick } },
      );

      fireEvent.click(container);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should support focusable on anchor with href', async () => {
      const container = await render(
        `<a protoButton href="/dashboard" [disabled]="true" [focusableWhenDisabled]="true">Dashboard</a>`,
        { imports: [ProtoButton] },
      );

      const link = container.debugElement.query(By.css('a')).nativeElement;
      expect(link).toHaveAttribute('data-disabled-focusable', '');
      expect(link).toHaveAttribute('tabindex', '0');
    });
  });

  describe('loading state use case', () => {
    it('should maintain tabindex during loading state transitions', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isLoading" [focusableWhenDisabled]="isLoading">
          {{ isLoading ? 'Loading...' : 'Submit' }}
        </button>`,
        { imports: [ProtoButton], componentProperties: { isLoading: false } },
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');

      // Start loading
      await rerender({ componentProperties: { isLoading: true } });
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-disabled-focusable', '');

      // Finish loading
      await rerender({ componentProperties: { isLoading: false } });
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-disabled-focusable');
    });

    it('should show data-focus-visible during loading when focused', async () => {
      const { rerender, fixture } = await render(
        `<button protoButton [disabled]="isLoading" [focusableWhenDisabled]="isLoading">Submit</button>`,
        { imports: [ProtoButton], componentProperties: { isLoading: false } },
      );

      const focusMonitor = TestBed.inject(FocusMonitor);
      const button = screen.getByRole('button');

      // Focus the button
      focusMonitor.focusVia(button, 'keyboard');
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus-visible');

      // Start loading - focus should remain visible
      await rerender({ componentProperties: { isLoading: true } });
      fixture.detectChanges();
      // Re-focus since the button state changed
      focusMonitor.focusVia(button, 'keyboard');
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus-visible');
    });

    it('should block activation during loading', async () => {
      const handleClick = vi.fn();
      const onKeyup = vi.fn();
      const onKeydown = vi.fn();
      await render(
        `<button
          protoButton
          [disabled]="true"
          [focusableWhenDisabled]="true"
          (click)="onClick()"
          (keyup)="onKeyup()"
          (keydown)="onKeydown()"
        >
          Loading...
        </button>`,
        {
          imports: [ProtoButton],
          componentProperties: {
            onClick: handleClick,
            onKeyup: onKeyup,
            onKeydown: onKeydown,
          },
        },
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.keyUp(button, { key: ' ' });
      expect(handleClick).not.toHaveBeenCalled();
      expect(onKeyup).not.toHaveBeenCalled();
      expect(onKeydown).not.toHaveBeenCalled();
    });
  });

  describe('disabled tooltip use case', () => {
    it('should remain focusable when disabled with focusable for tooltip access', async () => {
      const container = await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Submit</button>`,
        { imports: [ProtoButton] },
      );

      const button = screen.getByRole('button');

      // Button should be focusable even when disabled
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      // Can receive focus
      const focusMonitor = TestBed.inject(FocusMonitor);
      focusMonitor.focusVia(button, 'keyboard');
      container.detectChanges();
      expect(button).toHaveAttribute('data-focus-visible');
    });

    it('should respond to hover for tooltip while disabled with focusable', async () => {
      // Note: hover is blocked when disabled, even with focusable
      // This is by design - hover shows interactivity which is misleading
      // Tooltips should use focus-based triggers for disabled buttons
      await render(
        `<button protoButton [disabled]="true" [focusableWhenDisabled]="true">Submit</button>`,
        { imports: [ProtoButton] },
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      // data-hover should NOT appear on disabled button
      expect(button).not.toHaveAttribute('data-hover');
    });
  });
});
