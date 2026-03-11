# Proto Library Expansion Plan

A prioritized plan for adding new primitives to `@terseware/proto`. Each primitive follows the established two-tier pattern: a `@Behavior()` state class for headless logic + a thin `Proto*` directive for template usage.

---

## Existing Primitives (Reference)

| Package     | State Class    | Directive                                                                       | Purpose                              |
| ----------- | -------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| `anchor`    | `Anchor`       | --                                                                              | CSS anchor positioning               |
| `button`    | `Button`       | `ProtoButton`                                                                   | Accessible button behavior           |
| `focus`     | `Focus`        | `ProtoFocus`                                                                    | Focus origin tracking                |
| `hover`     | `Hover`        | `ProtoHover`                                                                    | Pointer hover tracking               |
| `interact`  | `Interact`     | `ProtoInteract`                                                                 | Disabled/focusable state             |
| `press`     | `Press`        | `ProtoPress`                                                                    | Press/active tracking                |
| `forms`     | `FieldContext` | `ProtoFormField`, `ProtoFieldLabel`, `ProtoFieldDescription`, `ProtoFieldError` | Signal forms accessibility           |
| `scrolling` | `Intersect`    | `ProtoIntersect`, `ProtoLazyScrollable`                                         | Scroll/intersection                  |
| `tooltip`   | --             | `ProtoTooltip`, `ProtoTooltipTrigger`, `ProtoTooltipArrow`                      | Tooltips with CSS anchor positioning |

---

## Priority 1: Foundation Primitives

These are blocking for most higher-level components. Build these first.

### 1.1 Overlay / Popover

**Package:** `packages/proto/overlay`

**Rationale:** Dialog, Select, Menu, Combobox, and Popover all need a shared overlay layer. The tooltip already demonstrates overlay creation via `ViewContainerRef.createEmbeddedView` and CSS anchor positioning. Extract and generalize this into a reusable primitive.

**Components:**

| Export                 | Type        | Responsibility                                           |
| ---------------------- | ----------- | -------------------------------------------------------- |
| `Overlay`              | State class | Manages open/close state, positioning strategy, backdrop |
| `ProtoOverlayTrigger`  | Directive   | Opens/closes overlay on interaction, manages anchor      |
| `ProtoOverlayContent`  | Directive   | The overlay panel itself, positioned relative to trigger |
| `ProtoOverlayBackdrop` | Directive   | Optional backdrop with click-to-close                    |

**State management:**

```typescript
@Behavior()
export class Overlay {
  readonly open = bindable(false);
  readonly modal = bindable(false); // traps focus when true
  readonly closeOnEscape = bindable(true);
  readonly closeOnOutsideClick = bindable(true);
  readonly side = bindable<OverlaySide>('bottom');
  readonly alignment = bindable<OverlayAlign>('start');
}
```

**Accessibility requirements:**

- `aria-expanded` on trigger
- `aria-controls` linking trigger to content
- `aria-haspopup` on trigger (value depends on content role)
- Focus trap when `modal` is true (use CDK `FocusTrap`)
- Return focus to trigger on close
- Escape key closes overlay
- Follows WAI-ARIA [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) patterns

**Key decisions:**

- Reuse `Anchor` for CSS anchor positioning (already proven in tooltip)
- Use Angular CDK `Overlay` for fallback positioning, or go pure CSS anchor positioning
- Support both template-based (`TemplateRef`) and component-based (`Type`) content projection

---

### 1.2 Listbox / Collection

**Package:** `packages/proto/listbox`

**Rationale:** Menu, Select, Combobox, Tabs, and Radio Group all share the concept of a collection of selectable items with keyboard navigation. Build the collection primitive first and compose it into higher-level patterns.

**Components:**

| Export             | Type        | Responsibility                                      |
| ------------------ | ----------- | --------------------------------------------------- |
| `Listbox`          | State class | Manages selection, active item, keyboard navigation |
| `ListboxItem`      | State class | Individual item state (selected, active, disabled)  |
| `ProtoListbox`     | Directive   | Collection container with keyboard handling         |
| `ProtoListboxItem` | Directive   | Individual selectable item                          |

**State management:**

```typescript
@Behavior()
export class Listbox<T> {
  readonly disabled = bindable(false);
  readonly selectionMode = bindable<'single' | 'multiple'>('single');
  readonly orientation = bindable<'horizontal' | 'vertical'>('vertical');
  readonly loop = bindable(true);
  readonly activeItem = signal<ListboxItem<T> | null>(null);
  readonly selectedItems = signal<Set<ListboxItem<T>>>(new Set());
}

@Behavior({ inherit: false })
export class ListboxItem<T> {
  readonly value = bindable<T>(undefined!);
  readonly disabled = bindable(false);
  readonly isSelected = computed(/* ... */);
  readonly isActive = computed(/* ... */);
}
```

**Accessibility requirements:**

- `role="listbox"` on container
- `role="option"` on items
- `aria-selected` on items
- `aria-activedescendant` or roving tabindex for focus management
- Arrow key navigation (up/down for vertical, left/right for horizontal)
- Home/End jump to first/last item
- Type-ahead selection
- Multi-select: Space toggles, Shift+Click range selects
- Follows WAI-ARIA [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) pattern

---

### 1.3 Toggle / Switch

**Package:** `packages/proto/toggle`

**Rationale:** Simple, self-contained, and high-demand. Good for establishing the forms integration pattern alongside `FieldContext`.

**Components:**

| Export        | Type        | Responsibility                       |
| ------------- | ----------- | ------------------------------------ |
| `Toggle`      | State class | Manages checked state, indeterminate |
| `ProtoToggle` | Directive   | Toggle/switch behavior               |

**State management:**

```typescript
@Behavior()
export class Toggle {
  readonly disabled = bindable(false);
  readonly checked = bindable(false);
  readonly indeterminate = bindable(false);
  readonly role = bindable<'switch' | 'checkbox'>('switch');
}
```

**Accessibility requirements:**

- `role="switch"` (for toggle) or `role="checkbox"` (for checkbox)
- `aria-checked` reflecting state (`true`, `false`, `mixed` for indeterminate)
- Space key toggles
- `aria-disabled` when disabled
- Integrate with `FieldContext` for `aria-labelledby` and `aria-describedby`
- Follows WAI-ARIA [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) pattern

---

## Priority 2: Composite Components

These compose Priority 1 primitives and the existing interaction layer.

### 2.1 Dialog / Modal

**Package:** `packages/proto/dialog`

**Rationale:** Among the most requested UI patterns. Composes `Overlay` with focus trapping and specific ARIA semantics.

**Components:**

| Export                   | Type        | Responsibility              |
| ------------------------ | ----------- | --------------------------- |
| `Dialog`                 | State class | Open/close, modal behavior  |
| `ProtoDialog`            | Directive   | Dialog container            |
| `ProtoDialogTrigger`     | Directive   | Opens the dialog            |
| `ProtoDialogContent`     | Directive   | Dialog panel                |
| `ProtoDialogTitle`       | Directive   | Links to `aria-labelledby`  |
| `ProtoDialogDescription` | Directive   | Links to `aria-describedby` |
| `ProtoDialogClose`       | Directive   | Close button behavior       |

**Accessibility requirements:**

- `role="dialog"` or `role="alertdialog"`
- `aria-modal="true"` when modal
- `aria-labelledby` linked to title
- `aria-describedby` linked to description
- Focus trap within dialog (CDK `FocusTrap`)
- Focus first focusable element on open (or `[protoDialogAutoFocus]`)
- Return focus to trigger on close
- Escape key closes (unless `alertdialog`)
- Inert background when modal (use `inert` attribute on siblings)
- Follows WAI-ARIA [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) pattern

**Composition:** Dialog = Overlay (modal: true) + Focus trap + ARIA labeling (reuse FieldContext pattern from forms)

---

### 2.2 Menu

**Package:** `packages/proto/menu`

**Rationale:** Navigation menus, context menus, and dropdown menus are fundamental. Composes Overlay + Listbox.

**Components:**

| Export               | Type        | Responsibility               |
| -------------------- | ----------- | ---------------------------- |
| `Menu`               | State class | Menu state, manages items    |
| `MenuItem`           | State class | Individual menu item         |
| `ProtoMenu`          | Directive   | Menu container               |
| `ProtoMenuTrigger`   | Directive   | Opens menu on click/keyboard |
| `ProtoMenuItem`      | Directive   | Individual menu item         |
| `ProtoMenuSeparator` | Directive   | Visual separator             |
| `ProtoMenuGroup`     | Directive   | Labeled group of items       |
| `ProtoMenuSub`       | Directive   | Sub-menu support             |

**Accessibility requirements:**

- `role="menu"` on container
- `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"` on items
- Arrow key navigation (up/down within menu, right to open sub-menu, left to close)
- Home/End for first/last item
- Type-ahead matching
- `aria-expanded` on sub-menu triggers
- `aria-disabled` on disabled items
- Follows WAI-ARIA [Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) pattern

**Composition:** Menu = Overlay + Listbox (orientation: vertical) + Hover (for sub-menu open delay)

---

### 2.3 Select

**Package:** `packages/proto/select`

**Rationale:** Drop-down select is essential for forms. Composes Overlay + Listbox + Forms integration.

**Components:**

| Export               | Type        | Responsibility             |
| -------------------- | ----------- | -------------------------- |
| `Select`             | State class | Selected value, open state |
| `ProtoSelect`        | Directive   | Select container           |
| `ProtoSelectTrigger` | Directive   | Trigger/display area       |
| `ProtoSelectContent` | Directive   | Dropdown panel             |
| `ProtoSelectItem`    | Directive   | Individual option          |
| `ProtoSelectValue`   | Directive   | Displays selected value    |
| `ProtoSelectGroup`   | Directive   | `optgroup` equivalent      |

**Accessibility requirements:**

- Trigger: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-activedescendant`
- Content: `role="listbox"`
- Items: `role="option"`, `aria-selected`
- Groups: `role="group"`, `aria-labelledby`
- Arrow keys to navigate, Enter/Space to select, Escape to close
- Type-ahead search
- Integrate with `FieldContext` for form field labeling
- Follows WAI-ARIA [Listbox (Collapsible)](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) pattern

**Composition:** Select = Overlay + Listbox + Interact + FieldContext integration

---

### 2.4 Tabs

**Package:** `packages/proto/tabs`

**Rationale:** Tab interfaces are pervasive. This is a variant of Listbox with specific ARIA roles and panel association.

**Components:**

| Export          | Type        | Responsibility           |
| --------------- | ----------- | ------------------------ |
| `Tabs`          | State class | Active tab, orientation  |
| `TabItem`       | State class | Individual tab state     |
| `ProtoTabList`  | Directive   | Tab strip container      |
| `ProtoTab`      | Directive   | Individual tab trigger   |
| `ProtoTabPanel` | Directive   | Associated content panel |

**Accessibility requirements:**

- `role="tablist"` on container
- `role="tab"` on tabs, `role="tabpanel"` on panels
- `aria-selected` on active tab
- `aria-controls` linking tab to panel, `aria-labelledby` linking panel to tab
- Arrow keys to navigate tabs (respecting orientation)
- Home/End for first/last tab
- Automatic or manual activation modes
- Follows WAI-ARIA [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) pattern

**Composition:** Tabs = Listbox (orientation: horizontal, single selection) + focus management

---

## Priority 3: Advanced Components

These have more complex interaction patterns and benefit from the foundation laid by Priority 1 and 2.

### 3.1 Combobox

**Package:** `packages/proto/combobox`

**Rationale:** Autocomplete/combobox is the most complex ARIA widget. Building it after Overlay, Listbox, and Select means most of the infrastructure is in place.

**Components:**

| Export                 | Type        | Responsibility                          |
| ---------------------- | ----------- | --------------------------------------- |
| `Combobox`             | State class | Input value, filtered items, open state |
| `ProtoCombobox`        | Directive   | Combobox container                      |
| `ProtoComboboxInput`   | Directive   | Text input with autocomplete            |
| `ProtoComboboxContent` | Directive   | Dropdown with options                   |
| `ProtoComboboxItem`    | Directive   | Individual option                       |
| `ProtoComboboxEmpty`   | Directive   | Shown when no results match             |

**Accessibility requirements:**

- Input: `role="combobox"`, `aria-autocomplete`, `aria-expanded`, `aria-activedescendant`, `aria-controls`
- Content: `role="listbox"`
- Items: `role="option"`, `aria-selected`
- Inline autocomplete vs list autocomplete vs both
- Arrow keys navigate options, Enter selects, Escape closes
- Input filtering must announce result count via live region
- Follows WAI-ARIA [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) pattern

**Key challenge:** Combobox has 4 interaction modes (`none`, `list`, `inline`, `both`). Start with `list` autocomplete, then add `inline` and `both`.

**Composition:** Combobox = Overlay + Listbox + text input handling + FieldContext

---

### 3.2 Accordion / Disclosure

**Package:** `packages/proto/accordion`

**Rationale:** Accordion is a series of disclosures. Disclosure is a single expandable section. Simple to implement once Overlay patterns are established.

**Components:**

| Export                  | Type        | Responsibility                          |
| ----------------------- | ----------- | --------------------------------------- |
| `Accordion`             | State class | Manages which items are expanded        |
| `AccordionItem`         | State class | Individual item expand/collapse         |
| `ProtoAccordion`        | Directive   | Container with multi/single expand mode |
| `ProtoAccordionItem`    | Directive   | Individual section                      |
| `ProtoAccordionTrigger` | Directive   | Toggle button                           |
| `ProtoAccordionContent` | Directive   | Collapsible panel                       |

**Accessibility requirements:**

- Trigger: `<button>` or `role="button"`, `aria-expanded`, `aria-controls`
- Content: `role="region"`, `aria-labelledby` (linked to trigger)
- Enter/Space toggles
- Optional: arrow key navigation between triggers
- Follows WAI-ARIA [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) pattern

---

### 3.3 Radio Group

**Package:** `packages/proto/radio-group`

**Rationale:** Specialized variant of Listbox with radio semantics. Needed for forms.

**Components:**

| Export            | Type        | Responsibility              |
| ----------------- | ----------- | --------------------------- |
| `RadioGroup`      | State class | Selected value, orientation |
| `RadioItem`       | State class | Individual radio state      |
| `ProtoRadioGroup` | Directive   | Container                   |
| `ProtoRadioItem`  | Directive   | Individual radio            |

**Accessibility requirements:**

- Container: `role="radiogroup"`, `aria-labelledby`
- Items: `role="radio"`, `aria-checked`
- Arrow key roving tabindex (only selected/first item in tab order)
- Space selects focused item
- Integrate with `FieldContext`
- Follows WAI-ARIA [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) pattern

**Composition:** RadioGroup = Listbox (single selection, roving tabindex) + FieldContext

---

### 3.4 Checkbox

**Package:** `packages/proto/checkbox`

**Rationale:** While `Toggle` (Priority 1) covers the switch pattern, a checkbox primitive adds indeterminate state handling, group behavior, and form integration.

**Components:**

| Export               | Type        | Responsibility                |
| -------------------- | ----------- | ----------------------------- |
| `Checkbox`           | State class | Checked, indeterminate state  |
| `ProtoCheckbox`      | Directive   | Individual checkbox           |
| `ProtoCheckboxGroup` | Directive   | Group with select-all support |

**Accessibility requirements:**

- `role="checkbox"`, `aria-checked` (`true`, `false`, `mixed`)
- Space key toggles
- Group: parent checkbox shows `mixed` when children partially selected
- Integrate with `FieldContext`
- Follows WAI-ARIA [Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) pattern

**Composition:** Checkbox = Toggle (role: checkbox) + optional group management

---

## Priority 4: Enhancement Primitives

These are useful but not blocking for core component libraries.

### 4.1 Toast / Notification

**Package:** `packages/proto/toast`

Managed notification stack with auto-dismiss, swipe-to-dismiss, and ARIA live regions. Follows a service-based pattern rather than the Behavior pattern since toasts are not tied to a specific DOM element at creation time.

### 4.2 Toolbar

**Package:** `packages/proto/toolbar`

Manages focus within a horizontal or vertical toolbar using roving tabindex. Composes Listbox with `role="toolbar"`.

### 4.3 Slider

**Package:** `packages/proto/slider`

Range input with single or dual thumbs. Requires pointer tracking (reuse Press), ARIA `role="slider"`, and `aria-valuemin`/`aria-valuemax`/`aria-valuenow`.

### 4.4 Progress

**Package:** `packages/proto/progress`

Determinate and indeterminate progress indicators. `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

### 4.5 Pagination

**Package:** `packages/proto/pagination`

Page navigation controls with proper `aria-label`, `aria-current="page"`, and keyboard navigation.

---

## Composition Diagram

Shows how new primitives build on existing ones:

```
                    @terseware/utils
                    (bindable, scoped, dispose, ElementRenderer, isomorphicEffect)
                          |
                    @terseware/proto
                    (Behavior)
                          |
          +------+--------+--------+-------+
          |      |        |        |       |
        Focus  Hover  Interact   Press  Anchor
          |      |        |        |       |
          +------+--------+--------+-------+
                          |
                        Button
                          |
          +---------------+----------------+
          |               |                |
       Overlay         Toggle         Listbox
          |               |                |
     +----+----+     Checkbox    +---------+---------+
     |    |    |         |       |         |         |
  Dialog Menu Select  RadioGroup Tabs   Combobox  Accordion
```

---

## Implementation Approach for Each Primitive

Follow this checklist for every new primitive:

1. **Create the package structure** matching the pattern in `READINESS_CHECKLIST.md` section 3.2
2. **Add path mapping** in `tsconfig.base.json` under `paths`
3. **Implement the state class** with `@Behavior()`, using `bindable()` for inputs, `signal()` for internal state, `computed()` for derived state
4. **Implement DOM effects** via `isomorphicEffect()` + `ElementRenderer` -- never write to the DOM outside of effects
5. **Implement the directive** as a thin wrapper that forwards `input()` signals to the state class
6. **Write tests** using `@testing-library/angular` with `screen` queries and accessibility assertions
7. **Verify accessibility** with manual testing against the relevant WAI-ARIA Authoring Practices pattern
8. **Export from index.ts** -- only export what consumers need
9. **Update `package.json`** peer deps if new Angular packages are required

---

## Suggested Build Order

| Phase | Primitive                                    | Depends On                     | Estimated Complexity |
| ----- | -------------------------------------------- | ------------------------------ | -------------------- |
| 1a    | Overlay                                      | Anchor, Focus, Hover           | High                 |
| 1b    | Toggle                                       | Interact, Focus                | Low                  |
| 1c    | Listbox                                      | Interact, Focus                | High                 |
| 2a    | Dialog                                       | Overlay                        | Medium               |
| 2b    | Menu                                         | Overlay, Listbox, Hover        | High                 |
| 2c    | Select                                       | Overlay, Listbox, FieldContext | High                 |
| 2d    | Tabs                                         | Listbox (adapted)              | Medium               |
| 3a    | Combobox                                     | Overlay, Listbox, FieldContext | Very High            |
| 3b    | Accordion                                    | -- (standalone disclosure)     | Low                  |
| 3c    | Radio Group                                  | Listbox, FieldContext          | Medium               |
| 3d    | Checkbox                                     | Toggle, FieldContext           | Low                  |
| 4     | Toast, Toolbar, Slider, Progress, Pagination | Various                        | Varies               |

**Recommendation:** Start with Overlay + Toggle + Listbox in parallel. Overlay and Listbox are the two foundational primitives that unlock the most downstream components. Toggle is a quick win that establishes the FieldContext integration pattern.
