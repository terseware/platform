# Proto Library Readiness Checklist

What must be fixed, standardized, and documented before expanding the proto library with new primitives.

---

## 1. Critical Bugs

These are public API defects that will break consumers. Fix before any new primitive work.

### 1.1 Naming typo: `hoverChange` in ProtoHover and ProtoPress

**Files:**

- `packages/proto/hover/src/lib/proto-hover.ts` line 29
- `packages/proto/press/src/lib/proto-press.ts` line 30

**Problem:** The output property is named `hoverChange` (missing "r"). In ProtoPress it should be `pressChange`, not `hoverChange` -- it was likely copy-pasted from ProtoHover.

**Fix:**

```typescript
// proto-hover.ts
readonly hoverChange = output<boolean>({ alias: 'protoHoverChange' });

// proto-press.ts
readonly pressChange = output<boolean>({ alias: 'protoPressChange' });
```

### 1.2 Broken equality function in FieldContext

**File:** `packages/proto/forms/src/lib/field-context.ts` lines 56-58, 67-68

**Problem:** `Array.prototype.sort()` mutates the cached computed value in place. The check also does not compare array lengths, so `['id-1']` would equal `['id-1', 'id-2']`.

**Fix:**

```typescript
equal: (a, b) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
};
```

This appears in both the `#labels` computed (line 56) and the `#descriptions`/`#errors` computed (line 67). Fix both.

### 1.3 Remove debug leftover in ProtoFieldError

**File:** `packages/proto/forms/src/lib/field-error.ts` line 22

**Problem:** `readonly test = signal(0);` is a stray debug signal exported as part of the public API.

**Fix:** Delete the line. Also remove `signal` from the import if it becomes unused.

### 1.4 Press does not guard pointerdown against disabled state

**File:** `packages/proto/press/src/lib/press.ts` lines 38-49

**Problem:** The `pointerdown` listener unconditionally sets `#isPressed` to `true` and registers global document listeners even when `disabled()` is true. The `data-press` attribute is hidden by the `isomorphicEffect`, but the internal state is wrong and consumers reading `isPressed` programmatically will see `true` on a disabled element.

**Fix:** Add a disabled guard:

```typescript
renderer.listen(el, 'pointerdown', () => {
  if (this.disabled()) return;
  // ... existing logic
});
```

This matches how `Hover` guards every listener callback with `!this.disabled()`.

### 1.5 Inconsistent `providers` on ProtoPress

**File:** `packages/proto/press/src/lib/proto-press.ts` line 11

**Problem:** `ProtoPress` declares `providers: [Press]` in its decorator, but no other directive does this. `Press` is already decorated with `@Resolvable()`, which handles DI resolution. The explicit `providers` entry creates a new instance per directive, breaking the shared resolution pattern that `Focus`, `Hover`, and `Interact` rely on.

**Fix:** Remove `providers: [Press]` from the directive decorator.

---

## 2. Infrastructure Improvements

### 2.1 Add tests for `@terseware/utils`

**Current state:** Only `deep-merge` has tests (19 tests). The following utilities have zero test coverage:

| Utility                  | File                                         | Risk                                               |
| ------------------------ | -------------------------------------------- | -------------------------------------------------- |
| `bindable`               | `packages/utils/src/lib/bindable.ts`         | High -- core abstraction used by every state class |
| `scoped`                 | `packages/utils/src/lib/scoped.ts`           | High -- uses private Angular internals             |
| `dispose` / `disposable` | `packages/utils/src/lib/dispose.ts`          | Medium -- cleanup correctness                      |
| `ElementRenderer`        | `packages/utils/src/lib/element-renderer.ts` | Medium -- DOM manipulation layer                   |
| `signal-helpers`         | `packages/utils/src/lib/signal-helpers.ts`   | Medium -- `onChange`/`onBoolChange`                |
| `signal-weak-map`        | `packages/utils/src/lib/signal-weak-map.ts`  | Medium -- reactive map                             |
| `inject-helpers`         | `packages/utils/src/lib/inject-helpers.ts`   | Low -- thin wrappers                               |
| `isomorphic`             | `packages/utils/src/lib/isomorphic.ts`       | Medium -- SSR behavior                             |
| `unwrap`                 | `packages/utils/src/lib/unwrap.ts`           | Low -- simple function                             |
| `validators`             | `packages/utils/src/lib/validators.ts`       | Low -- type guards                                 |

**Priority:** Test `bindable`, `scoped`, and `dispose` first. These are the foundations that every new primitive will depend on.

### 2.2 Reduce reliance on Angular private internals in `scoped`

**File:** `packages/utils/src/lib/scoped.ts`

**Problem:** Imports from `@angular/core/primitives/signals` (`getActiveConsumer`, `ReactiveNode`) and hard-codes `tViewInjectorIndex = 9`. These are internal APIs that Angular does not guarantee across versions.

**Action items:**

- Add a comment documenting the Angular version this was tested against
- Add a unit test that verifies the `tViewInjectorIndex` assumption (will fail loudly on upgrade)
- Track Angular's `effect()` API evolution -- if/when `effect` provides injector access natively, migrate to the public API
- Consider whether `scoped` can be replaced by passing `injector` explicitly at call sites

### 2.3 Fix `sideEffects` declaration for hover

**File:** `packages/proto/package.json` -- declares `"sideEffects": false`

**Problem:** `packages/proto/hover/src/lib/hover.ts` registers global `pointerup` and `touchend` listeners at module import time (lines 27-33). This is a genuine side effect. Tree-shakers that trust the `sideEffects: false` declaration could strip these listeners.

**Options:**

1. Add `"sideEffects": ["./hover/**"]` to the package.json
2. Move the global listener setup into an `APP_INITIALIZER` or a lazily-invoked init function
3. Document the side effect for consumers

### 2.4 Fix `try/catch` injection context detection

**Files:**

- `packages/utils/src/lib/bindable.ts` lines 87-93 (`getCallerInjector`)
- `packages/utils/src/lib/dispose.ts` lines 63-68 (`tryGetInjector`)

**Problem:** Using `try/catch` around `inject()` to detect injection context masks real DI errors and is flagged as an anti-pattern by Angular core contributors.

**Recommendation:** Consider whether these call sites can be restructured so the injector is always passed explicitly when outside injection context.

### 2.5 Align peer dependency versions

**File:** `packages/proto/package.json`

```json
"@angular/core": "^21.1.0",    // allows 21.1.x
"@angular/common": "^21.2.0",  // requires 21.2.x+
"@angular/cdk": "^21.2.0",
"@angular/forms": "^21.2.0"
```

A consumer on Angular 21.1.x would satisfy the `core` peer dep but fail `common`, `cdk`, and `forms`. Align all `@angular/*` peer deps to the same minimum version.

---

## 3. Patterns to Standardize

Before building new primitives, codify these patterns so every contributor follows the same structure.

### 3.1 Directive input aliasing convention

**Current inconsistency:**

| Directive        | Input       | Aliased?                  |
| ---------------- | ----------- | ------------------------- |
| `ProtoFocus`     | `disabled`  | Yes: `protoFocusDisabled` |
| `ProtoHover`     | `disabled`  | Yes: `protoHoverDisabled` |
| `ProtoPress`     | `disabled`  | Yes: `protoPressDisabled` |
| `ProtoInteract`  | `disabled`  | **No alias**              |
| `ProtoButton`    | `disabled`  | **No alias**              |
| `ProtoIntersect` | `threshold` | **No alias**              |

**Decision needed:** Pick one convention and apply it everywhere. Aliased inputs (e.g., `protoFocusDisabled`) are safer when the directive is used as a `hostDirective` because they avoid name collisions. Un-aliased inputs (e.g., `disabled`) are more natural for direct template use.

**Recommendation:** Use aliased inputs on interaction primitives that are commonly used as `hostDirectives` (Focus, Hover, Press, Interact). Higher-level directives like ProtoButton that consumers use directly can keep un-aliased inputs.

### 3.2 Standard file structure for new primitives

Every new primitive package should follow this structure:

```
packages/proto/<primitive>/
  README.md                         # Package description
  ng-package.json                   # Secondary entry point config
  src/
    index.ts                        # Public API exports
    lib/
      <primitive>.ts                # @Resolvable() state class
      proto-<primitive>.ts          # Angular directive (thin wrapper)
      proto-<primitive>.spec.ts     # Tests for the directive
```

- State class: `@Resolvable()`, uses `bindable()` for configurable properties, `injectElement()` for DOM access, `isomorphicEffect()` for DOM writes, `ElementRenderer` for safe DOM manipulation.
- Directive: `@Directive`, uses `inject(<StateClass>)`, forwards `input()` signals to state class via `state.prop.set(this.prop)`, exposes `output()` events via `onChange()`.

### 3.3 Standard data attributes

Every primitive should expose state via `data-*` attributes for styling:

| Attribute                 | Meaning                                        |
| ------------------------- | ---------------------------------------------- |
| `data-disabled`           | Element is disabled                            |
| `data-disabled-focusable` | Disabled but still focusable                   |
| `data-focus`              | Element is focused                             |
| `data-focus-visible`      | Element has visible focus                      |
| `data-focus-origin`       | Focus origin (keyboard, mouse, touch, program) |
| `data-hover`              | Element is hovered                             |
| `data-press`              | Element is pressed                             |
| `data-open`               | Overlay/disclosure is open                     |
| `data-selected`           | Item is selected                               |
| `data-checked`            | Checkbox/toggle is checked                     |
| `data-active`             | Active item in a collection                    |

New primitives should use these consistently. Document the full list in one place.

### 3.4 Establish a shared state composition pattern

The `Button` class demonstrates how to compose primitives:

```typescript
// From packages/proto/button/src/lib/button.ts
const interact = inject(Interact);
interact.disabled.set(this.disabled);
inject(Focus).disabled.set(interact.hardDisabled);
inject(Hover).disabled.set(interact.disabled);
inject(Press).disabled.set(interact.disabled);
```

This is the canonical way to compose state classes. Document it and ensure all composite primitives (Menu, Dialog, Select, etc.) follow it.

---

## 4. Cleanup

### 4.1 Delete or implement `form-root.ts`

**File:** `packages/proto/forms/src/lib/form-root.ts`

The entire file is commented out. It is not exported from `index.ts`. Either delete it or implement it. Dead files in a library package cause confusion.

### 4.2 Remove unused `setTimeout` calls without cleanup

**File:** `packages/proto/tooltip/src/lib/proto-tooltip-trigger.ts` lines 153, 158, 165, 171

Multiple bare `setTimeout(() => this.tooltipOpen.set(...))` calls without storing/clearing the timeout IDs. If the component is destroyed while a timeout is pending, this can cause errors. Wrap these in `disposable` or store and clear the IDs.

### 4.3 Replace infinite `requestAnimationFrame` loop in tooltip arrow

**File:** `packages/proto/tooltip/src/lib/proto-tooltip-arrow.ts` line 88

`#calculatePosition()` recursively schedules itself via `requestAnimationFrame` forever. Replace with `afterEveryRender` (already used by `ProtoTooltip`) or a `ResizeObserver` that only fires when layout changes.

---

## 5. Documentation Needs

Before adding new primitives, establish documentation for:

1. **Architecture overview** -- Explain the Resolvable + Directive two-tier pattern, when to use each, and how composition works
2. **Utils API reference** -- Document `bindable`, `scoped`, `disposable`, `ElementRenderer`, `isomorphicEffect`, and `onChange` with usage examples
3. **Contributor guide** -- The standard file structure (section 3.2), naming conventions (section 3.1), and data attribute conventions (section 3.3)
4. **Accessibility baseline** -- Document which ARIA patterns each primitive implements and link to the relevant WAI-ARIA Authoring Practices

The current README files are all boilerplate (`Secondary entry point of @terseware/proto`). Each package should have a README that shows basic usage.

---

## Summary: Priority Order

1. Fix the five critical bugs (section 1) -- these are public API defects
2. Standardize the directive input aliasing convention (section 3.1) -- this affects all future API design
3. Add tests for `bindable`, `scoped`, and `dispose` in utils (section 2.1) -- foundational confidence
4. Clean up dead code and tooltip issues (section 4) -- reduce tech debt before expanding
5. Write contributor guide and architecture docs (section 5) -- enable consistent contributions
6. Address infrastructure concerns (sections 2.2-2.5) -- reduce long-term risk
