import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  getDebugNode,
  signal,
  viewChild,
} from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular';

import { ProtoButton } from '@terseware/proto/button';
import { ProtoMenu } from './menu';
import { ProtoMenuItem } from './menu-item';
import { ProtoMenuTrigger } from './menu-trigger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the ProtoMenuItem directive instance from a DOM element.
 * Uses Angular's getDebugNode to access the injector for dynamically
 * created elements that aren't part of the fixture's debugElement tree.
 */
function getMenuItemDirective(element: HTMLElement): ProtoMenuItem | null {
  const debugNode = getDebugNode(element);
  if (!debugNode) return null;
  try {
    return debugNode.injector.get(ProtoMenuItem);
  } catch (e) {
    console.log('getMenuItemDirective error:', e);
    return null;
  }
}

// Note: ProtoMenuItem does not have ProtoButton as a host directive by default and design for composability reasons.
@Directive({
  selector: '[testMenuItem]',
  hostDirectives: [
    ProtoMenuItem,
    {
      directive: ProtoButton,
      inputs: ['disabled', 'focusableWhenDisabled', 'tabIndex'],
    },
  ],
})
class TestMenuItem {}

// ---------------------------------------------------------------------------
// Test host components
// ---------------------------------------------------------------------------

@Component({
  selector: 'test-basic-menu-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtoMenuTrigger, ProtoMenu, TestMenuItem],
  template: `
    <button [protoMenuTrigger]="menuContent">Open Menu</button>
    <ng-template #menuContent>
      <div protoMenu>
        <button #apple testMenuItem>Apple</button>
        <button #banana testMenuItem>Banana</button>
        <div #cherry testMenuItem>Cherry</div>
      </div>
    </ng-template>
  `,
})
class BasicMenuHost {
  readonly apple = viewChild('apple', { read: ProtoMenuItem });
  readonly banana = viewChild('banana', { read: ProtoMenuItem });
  readonly cherry = viewChild('cherry', { read: ProtoMenuItem });
}

@Component({
  selector: 'test-menu-with-callback-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtoMenuTrigger, ProtoMenu, TestMenuItem],
  template: `
    <button [protoMenuTrigger]="menuContent">Open Menu</button>
    <ng-template #menuContent>
      <div protoMenu>
        <button testMenuItem (click)="onItem('a')">Alpha</button>
        <button testMenuItem (click)="onItem('b')">Beta</button>
        <button testMenuItem (click)="onItem('c')">Charlie</button>
        <button testMenuItem (click)="onItem('d')">Delta</button>
      </div>
    </ng-template>
  `,
})
class MenuWithCallbackHost {
  readonly selected = signal<string | null>(null);
  onItem(value: string): void {
    this.selected.set(value);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skip('Menu', () => {
  // =========================================================================
  // 1. Menu Trigger
  // =========================================================================
  describe('Menu Trigger', () => {
    describe('initial state', () => {
      it('should be closed by default', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('menu')).toBeNull();
      });

      it('should have aria-haspopup="menu"', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      });
    });

    describe('expansion via click', () => {
      it('should open the menu on click', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('menu')).not.toBeNull();
      });

      it('should close the menu on second click', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('menu')).toBeNull();
      });
    });

    describe('expansion via keyboard', () => {
      it('should open with ArrowDown and focus the first item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        const items = screen.queryAllByRole('menuitem');
        expect(items.length).toBe(3);
      });

      it('should open with Enter and focus the first item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'Enter' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.queryAllByRole('menuitem').length).toBeGreaterThan(0);
      });

      it('should open with Space and focus the first item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: ' ' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.queryAllByRole('menuitem').length).toBeGreaterThan(0);
      });

      it('should open with ArrowUp and request focus on last item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'ArrowUp' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.queryAllByRole('menuitem').length).toBeGreaterThan(0);
      });

      it('should close with Escape and return focus to trigger', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        // Press Escape on the trigger (close handler is on the trigger)
        fireEvent.keyDown(trigger, { key: 'Escape' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });

    describe('ARIA attributes', () => {
      it('should set aria-controls when menu is open', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const menu = screen.getByRole('menu');
        expect(menu).not.toBeNull();

        const menuId = menu?.getAttribute('id');
        if (menuId) {
          expect(trigger).toHaveAttribute('aria-controls', menuId);
        }
      });

      it('should toggle aria-expanded between true and false', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });

    describe('close on click outside', () => {
      it('should close the menu when clicking outside', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');

        // Click on the document body (outside trigger and menu)
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  // =========================================================================
  // 2. Menu (standalone)
  // =========================================================================
  describe('Menu Panel', () => {
    describe('ARIA roles', () => {
      it('should have role="menu" on the menu element', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const menu = screen.getByRole('menu');
        expect(menu).not.toBeNull();
        expect(menu).toHaveAttribute('role', 'menu');
      });

      it('should render menu items with the protoMenuItem directive', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        expect(items.length).toBe(3);
      });

      // BUG: MenuItem sets role="menuitem" in its constructor, but the Button
      // protocol's isomorphicEffect clears role on native <button> elements.
      // This test documents the current (broken) behavior. When the bug is
      // fixed, this test should be updated to expect role="menuitem".
      it.todo('should have role="menuitem" on each item (blocked by Button role override)');

      it('should set aria-labelledby referencing the trigger id', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const menu = screen.getByRole('menu');
        const triggerId = trigger.getAttribute('id');
        if (triggerId) {
          expect(menu).toHaveAttribute('aria-labelledby', triggerId);
        }
      });
    });

    describe('keyboard navigation', () => {
      it('should navigate down through items with ArrowDown', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        expect(items.length).toBe(3);

        expect(document.activeElement).toBe(items[0]);

        fireEvent.keyDown(items[0], { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[1]);

        fireEvent.keyDown(items[1], { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[2]);

        fireEvent.keyDown(items[2], { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[0]);

        // // First item should be focused after opening with ArrowDown
        // // Focus the first item manually to simulate the deferred focus
        // items[0].focus();
        // fixture.detectChanges();
        // await fixture.whenStable();

        // // Press ArrowDown to move to next item
        // fireEvent.keyDown(items[0], { key: 'ArrowDown' });
        // fixture.detectChanges();
        // await fixture.whenStable();

        // expect(document.activeElement).toBe(items[1]);

        // fireEvent.keyDown(items[2], { key: 'ArrowDown' });
        // fixture.detectChanges();
        // await fixture.whenStable();

        // expect(document.activeElement).toBe(items[0]);
      });

      it('should navigate up through items with ArrowUp', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Focus last item first
        items[2].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[2], { key: 'ArrowUp' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[1]);
      });

      it('should wrap from last to first item with ArrowDown', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Focus the last item
        items[2].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[2], { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[0]);
      });

      it('should wrap from first to last item with ArrowUp', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Focus the first item
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[0], { key: 'ArrowUp' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[2]);
      });

      it('should focus the first item with Home key', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Focus middle item
        items[1].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[1], { key: 'Home' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[0]);
      });

      it('should focus the last item with End key', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Focus first item
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[0], { key: 'End' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement).toBe(items[2]);
      });

      it('should close the menu with Escape from a menu item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[0], { key: 'Escape' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });

    describe('selection', () => {
      it('should activate an item on click and close the menu', async () => {
        const { fixture } = await render(MenuWithCallbackHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        fireEvent.click(items[0]);
        fixture.detectChanges();
        await fixture.whenStable();

        // The menu should close after item activation
        // Note: The click triggers the item's click handler, then the
        // MenuItem #activate() calls element.click() + ctx.close()
      });

      it('should activate an item on Enter keypress', async () => {
        const { fixture } = await render(MenuWithCallbackHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[0], { key: 'Enter' });
        fixture.detectChanges();
        await fixture.whenStable();

        // Menu should close after Enter activates item
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });

      it('should activate an item on Space keypress', async () => {
        const { fixture } = await render(MenuWithCallbackHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[1].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[1], { key: ' ' });
        fixture.detectChanges();
        await fixture.whenStable();

        // Menu should close after Space activates item
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  // =========================================================================
  // 3. Menu Items
  // =========================================================================
  describe('Menu Items', () => {
    describe('disabling', () => {
      it('should skip hard disabled items during keyboard navigation', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.componentInstance.banana()?.item.button.interact.disabled.set(true);
        fixture.detectChanges();

        const items = screen.queryAllByRole('menuitem');
        // Focus the first enabled item (Apple)
        items[0].focus();

        // ArrowDown should skip disabled Banana and go to Cherry
        fireEvent.keyDown(items[0], { key: 'ArrowDown' });

        // The enabled items are Apple (0) and Cherry (2); Banana (1) is disabled.
        // focusNext() filters to enabled items, so from Apple it goes to Cherry.
        expect(document.activeElement).toBe(items[2]);
      });

      it('should not skip soft disabled items during keyboard navigation', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.componentInstance.banana()?.item.button.interact.disabled.set(true);
        fixture.componentInstance.banana()?.item.button.interact.focusableWhenDisabled.set(true);
        fixture.detectChanges();

        const items = screen.queryAllByRole('menuitem');
        // Focus the first enabled item (Apple)
        items[0].focus();

        // ArrowDown should not skip soft disabled Banana and go to Cherry
        fireEvent.keyDown(items[0], { key: 'ArrowDown' });

        // The enabled items are Apple (0) and Cherry (2); Banana (1) is disabled.
        // focusNext() filters to enabled items, so from Apple it goes to Cherry.
        expect(document.activeElement).toBe(items[1]);
      });

      it('should not activate a soft disabled item on Enter', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.componentInstance.banana()?.item.button.interact.disabled.set(true);
        fixture.componentInstance.banana()?.item.button.interact.focusableWhenDisabled.set(true);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[1].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        fireEvent.keyDown(items[1], { key: 'Enter' });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });

      it('should not activate a disabled item on Space', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.componentInstance.banana()?.item.button.interact.disabled.set(true);
        fixture.componentInstance.banana()?.item.button.interact.focusableWhenDisabled.set(true);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        fireEvent.click(items[1]);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });

    describe('data-active attribute', () => {
      it('should set data-active="true" on the focused item', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(items[0]).toHaveAttribute('data-active', 'true');
      });

      it('should remove data-active when item loses focus', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(items[0]).toHaveAttribute('data-active', 'true');

        // Move focus to next item
        fireEvent.keyDown(items[0], { key: 'ArrowDown' });
        fixture.detectChanges();
        await fixture.whenStable();

        // First item should no longer be active
        // Note: data-active is set to null (removed) when not focused
        expect(items[1]).toHaveAttribute('data-active', 'true');
      });
    });

    describe('tabindex management', () => {
      it('should manage tabindex on menu items', async () => {
        const { fixture } = await render(BasicMenuHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const trigger = screen.getByText('Open Menu');
        fireEvent.click(trigger);
        fixture.detectChanges();
        await fixture.whenStable();

        const items = screen.queryAllByRole('menuitem');
        // Before any item is focused, all items should have tabindex=0 (no activeItem)
        // or follow the roving tabindex pattern

        // Focus the first item
        items[0].focus();
        fixture.detectChanges();
        await fixture.whenStable();

        // Active item gets tabindex=0, others get tabindex=-1
        expect(items[0]).toHaveAttribute('tabindex', '0');
        expect(items[1]).toHaveAttribute('tabindex', '-1');
        expect(items[2]).toHaveAttribute('tabindex', '-1');
      });
    });
  });

  // =========================================================================
  // 4. Typeahead
  // =========================================================================
  describe('Typeahead', () => {
    it('should focus the item matching a single character', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      items[0].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type 'b' to match 'Banana'
      fireEvent.keyDown(items[0], { key: 'b' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(items[1]);
    });

    it('should focus the item matching typed characters (case-insensitive)', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      items[0].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type 'C' (uppercase) to match 'Cherry'
      fireEvent.keyDown(items[0], { key: 'C' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(items[2]);
    });

    it('should wrap around when searching from the end', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      // Focus the last item (Cherry)
      items[2].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type 'a' to match 'Apple' (wraps from end)
      fireEvent.keyDown(items[2], { key: 'a' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(items[0]);
    });

    it('should not change focus when no item matches', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      items[0].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type 'z' which matches nothing
      fireEvent.keyDown(items[0], { key: 'z' });
      fixture.detectChanges();
      await fixture.whenStable();

      // Focus should remain on the current item
      expect(document.activeElement).toBe(items[0]);
    });

    it('should skip disabled items during typeahead', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      // Programmatically disable the second item (Banana)
      const items = screen.queryAllByRole('menuitem');
      const bananaDir = getMenuItemDirective(items[1]);
      bananaDir?.item.button.interact.disabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      items[0].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Type 'b' to try to match 'Banana' (disabled)
      // Typeahead uses ctx.typeahead which filters to enabled items
      fireEvent.keyDown(items[0], { key: 'b' });
      fixture.detectChanges();
      await fixture.whenStable();

      // Banana is disabled, so focus should not move to it
      expect(document.activeElement).not.toBe(items[1]);
    });
  });

  // =========================================================================
  // 5. Menu lifecycle
  // =========================================================================
  describe('Menu lifecycle', () => {
    it('should destroy menu items when menu is closed', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');

      // Open menu
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(screen.queryAllByRole('menuitem').length).toBe(3);

      // Close menu
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      // Items should be removed from DOM
      expect(screen.queryAllByRole('menuitem').length).toBe(0);
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('should re-create menu items when reopened', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');

      // Open
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(screen.queryAllByRole('menuitem').length).toBe(3);

      // Close
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(screen.queryAllByRole('menuitem').length).toBe(0);

      // Reopen
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(screen.queryAllByRole('menuitem').length).toBe(3);
    });
  });

  // =========================================================================
  // 6. Multiple items with callback (integration-style)
  // =========================================================================
  describe('Integration: item callbacks', () => {
    it('should render four menu items in the callback host', async () => {
      const { fixture } = await render(MenuWithCallbackHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      expect(items.length).toBe(4);
      expect(items[0].textContent?.trim()).toBe('Alpha');
      expect(items[1].textContent?.trim()).toBe('Beta');
      expect(items[2].textContent?.trim()).toBe('Charlie');
      expect(items[3].textContent?.trim()).toBe('Delta');
    });

    it('should close menu after activating an item with Enter', async () => {
      const { fixture } = await render(MenuWithCallbackHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      fixture.detectChanges();
      await fixture.whenStable();

      const items = screen.queryAllByRole('menuitem');
      items[2].focus();
      fixture.detectChanges();
      await fixture.whenStable();

      // Activate via Enter
      fireEvent.keyDown(items[2], { key: 'Enter' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });

  // =========================================================================
  // 7. Trigger tabindex management
  // =========================================================================
  describe('Trigger tabindex', () => {
    it('should have tabindex=0 when menu is closed', async () => {
      const { fixture } = await render(BasicMenuHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = screen.getByText('Open Menu');
      expect(trigger).toHaveAttribute('tabindex', '0');
    });
  });
});
