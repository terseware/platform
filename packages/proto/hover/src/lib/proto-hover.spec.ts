import { By } from '@angular/platform-browser';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ProtoHover } from './proto-hover';

describe('ProtoHover', () => {
  describe('pointer hover', () => {
    it('should set data-hover on mouse pointerenter', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-hover');

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');
    });

    it('should remove data-hover on mouse pointerleave', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');

      button.dispatchEvent(
        new PointerEvent('pointerleave', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should not have data-hover initially', async () => {
      await render(`<button protoHover>Hover me</button>`, { imports: [ProtoHover] });

      expect(screen.getByRole('button')).not.toHaveAttribute('data-hover');
    });
  });

  describe('mouse events fallback', () => {
    it('should track hover with mouseenter/mouseleave', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');

      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');

      button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });
  });

  describe('touch events', () => {
    it('should ignore touch pointer events', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'touch',
        }),
      );
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should ignore emulated mouse events after touch', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');

      // Simulate touch interaction
      fireEvent.touchStart(button);

      // Emulated mouseenter should be ignored
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });
  });

  describe('disabled state', () => {
    it('should not trigger hover when disabled', async () => {
      const { fixture } = await render(
        `<button protoHover [protoHoverDisabled]="true">Hover me</button>`,
        { imports: [ProtoHover] },
      );

      const button = screen.getByRole('button');

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should reset hover when becoming disabled while hovered', async () => {
      const { fixture, rerender } = await render(
        `<button protoHover [protoHoverDisabled]="isDisabled">Hover me</button>`,
        { imports: [ProtoHover], componentProperties: { isDisabled: false } },
      );

      const button = screen.getByRole('button');

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');

      await rerender({ componentProperties: { isDisabled: true } });
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-hover');
    });

    it('should allow hover after re-enabling', async () => {
      const { fixture, rerender } = await render(
        `<button protoHover [protoHoverDisabled]="isDisabled">Hover me</button>`,
        { imports: [ProtoHover], componentProperties: { isDisabled: true } },
      );

      const button = screen.getByRole('button');

      await rerender({ componentProperties: { isDisabled: false } });
      fixture.detectChanges();

      button.dispatchEvent(
        new PointerEvent('pointerenter', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        }),
      );
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');
    });
  });

  describe('element types', () => {
    it('should work with button elements', async () => {
      const { fixture } = await render(`<button protoHover>Button</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-hover', '');
    });

    it('should work with div elements', async () => {
      const { fixture } = await render(`<div protoHover tabindex="0">Custom</div>`, {
        imports: [ProtoHover],
      });

      const div = fixture.debugElement.query(By.css('div')).nativeElement;
      fireEvent.mouseEnter(div);
      fixture.detectChanges();
      expect(div).toHaveAttribute('data-hover', '');
    });

    it('should work with anchor elements', async () => {
      const { fixture } = await render(`<a protoHover href="#">Link</a>`, {
        imports: [ProtoHover],
      });

      const link = fixture.debugElement.query(By.css('a')).nativeElement;
      fireEvent.mouseEnter(link);
      fixture.detectChanges();
      expect(link).toHaveAttribute('data-hover', '');
    });
  });

  describe('mouseenter/mouseleave sequence', () => {
    it('should handle multiple enter/leave cycles', async () => {
      const { fixture } = await render(`<button protoHover>Hover me</button>`, {
        imports: [ProtoHover],
      });

      const button = screen.getByRole('button');

      for (let i = 0; i < 3; i++) {
        fireEvent.mouseEnter(button);
        fixture.detectChanges();
        expect(button).toHaveAttribute('data-hover', '');

        fireEvent.mouseLeave(button);
        fixture.detectChanges();
        expect(button).not.toHaveAttribute('data-hover');
      }
    });
  });
});
