# Proto Forms: Design Document

A comprehensive plan for building a headless forms accessibility layer on top of Angular Signal Forms.

---

## Table of Contents

- [Current State](#current-state)
- [Research Findings](#research-findings)
- [Critical Features to Implement](#critical-features-to-implement)

---

## Current State

### What Exists Today

The proto forms package (`packages/proto/forms/`) provides a minimal but working accessibility wiring layer for Angular Signal Forms. It consists of five exports:

**`FieldContext`** (`field-context.ts`) -- The central `@Resolvable()` state class. Injected via the `FORM_FIELD` token from `@angular/forms/signals`, it reads the `FormField` instance to access the host element and field state. It manages three `SignalSet` collections (labels, descriptions, errors) and wires them to the DOM via `aria-labelledby`, `aria-describedby`, and `aria-invalid` attributes using `isomorphicEffect` and `ElementRenderer`.

**`ProtoFieldLabel`** (`field-label.ts`) -- A directive applied to label elements. Accepts a `FieldTree` via the `[for]` input. Generates a unique ID, detects whether it is on a native `<label>` element (via `HOST_TAG_NAME`), and if so sets the `for` attribute to point at the field's element ID. Registers itself with `FieldContext.addLabel()` inside a `scoped()` effect so cleanup happens automatically when the label is removed from the DOM.

**`ProtoFieldDescription`** (`field-description.ts`) -- A directive for help text. Accepts a `FieldTree` via `[protoFieldDescription]`. Generates a unique ID and registers with `FieldContext.addDescription()`.

**`ProtoFieldError`** (`field-error.ts`) -- A directive for validation error messages. Accepts a `ValidationError.WithFieldTree` via `[protoFieldError]`. Generates a unique ID, sets `role="alert"` and `aria-live="polite"` on the host, and registers with `FieldContext.addError()`.

**`ProtoFormField`** (`form-field.ts`) -- A thin directive with selector `[proto][formField]` that injects `FieldContext` and exposes it. Serves as the bridge that triggers `FieldContext` creation on any element with both `proto` and `formField` attributes.

**`ProtoFormRoot`** (`form-root.ts`) -- Entirely commented out. Was intended to wrap Angular's `FormRoot` directive as a host directive but is not functional.

### How the Wiring Works

The registration pattern is the most interesting aspect. Here is the flow:

1. A consumer writes `<input proto [formField]="form.name" />`. The `proto` attribute triggers `ProtoFormField`, which injects `FieldContext`. Since `FieldContext` is `@Resolvable()`, it auto-creates on the element if not already present.

2. `FieldContext` constructor injects `FORM_FIELD` (the Angular `FormField` directive instance), reads its `element` property for DOM access, and sets up `isomorphicEffect` watchers to manage `aria-invalid`.

3. Elsewhere in the template, `<label protoFieldLabel [for]="form.name">` invokes an `effect()` that calls `this.field()().formFieldBindings()` to find all DOM elements bound to that field. For each binding, it resolves the `FieldContext` from that element's injector and calls `context.addLabel(this)`.

4. The `addLabel` / `addDescription` / `addError` methods use `disposable()` to auto-cleanup when the directive is destroyed. The `FieldContext` recomputes its `aria-labelledby` / `aria-describedby` attribute values reactively via `computed()` signals.

This is a decoupled registration pattern -- labels, descriptions, and errors can be anywhere in the template and they find their field via the `FieldTree` reference. This is architecturally correct and matches how Base UI and Radix approach the problem.

### What Works Well

- The decoupled registration via `FieldTree` references. Labels, descriptions, and errors do not need to be DOM children of the field.
- Automatic cleanup via `disposable()` / `scoped()` when directives are destroyed.
- Native `<label>` detection with `HOST_TAG_NAME` and automatic `for` attribute wiring.
- Reactive `aria-invalid` based on `state().invalid() && state().touched()` -- shows only after user interaction.
- `role="alert"` and `aria-live="polite"` on error elements for screen reader announcements.
- The pattern is SSR-compatible via `isomorphicEffect`.
- Multiple labels/descriptions/errors per field are supported via `SignalSet`.

### What Is Missing

1. **No data attributes for form field state** -- Unlike every other proto primitive, the form field does not set `data-*` attributes for CSS styling (e.g., `data-invalid`, `data-touched`, `data-dirty`, `data-pristine`, `data-pending`, `data-disabled`, `data-readonly`, `data-required`).

2. **No error visibility strategy** -- The library wires `aria-describedby` but provides no mechanism for controlling when errors should be shown. Consumers must manually write `@if (field().touched() && field().invalid())` logic.

3. **No `FormRoot` integration** -- The `ProtoFormRoot` is commented out. There is no proto-level submission handling, form-level state attributes, or form-level error aggregation.

4. **No `aria-required` wiring** -- When a field has a `required()` validator, the input should have `aria-required="true"`. This is not implemented.

5. **No `aria-errormessage` support** -- While `aria-describedby` includes error IDs, the more specific `aria-errormessage` attribute (which has better screen reader support for error scenarios) is not used.

6. **No form-level error summary** -- No component for rendering an accessible error summary (common pattern: a list of all errors at the top of the form, each linking to the invalid field).

7. **No field grouping primitives** -- No `<fieldset>`/`<legend>` equivalent for grouping related fields with `role="group"`.

8. **No custom control integration helpers** -- No proto-level utilities for building custom form controls that implement `FormValueControl` or `FormCheckboxControl`.

9. **No validation display strategy configuration** -- Libraries like Base UI support `validationMode: 'onSubmit' | 'onBlur' | 'onChange'`. Proto has no equivalent.

10. **Buggy equality function** -- As noted in `READINESS_CHECKLIST.md`, the `computed()` equality functions in `FieldContext` mutate arrays with `.sort()` and do not check lengths.

11. **Stray debug code** -- `ProtoFieldError` has a `readonly test = signal(0)` that should not be in production.

---

## Research Findings

### Angular Signal Forms (v21.2)

Angular's new signal-based forms system is a fundamental shift from reactive forms. The key concepts:

**`form()` function** -- Takes a signal model and an optional schema function. Returns a `FieldTree` with dot-notation access to fields. Each field, when called as a function, returns a `FieldState` with reactive signals: `value()`, `valid()`, `invalid()`, `touched()`, `dirty()`, `pending()`, `errors()`, `disabled()`, `hidden()`, `readonly()`.

**Schema-based validation** -- Validators are declared in a schema function, not on the control. Built-in validators include `required()`, `email()`, `minLength()`, `maxLength()`, `min()`, `max()`, `pattern()`. Custom validators use `validate()` with a `FieldContext` providing `value`, `valueOf()` (cross-field), and `stateOf()`. Cross-field validation uses `validateTree()`. Async validation uses `validateHttp()`.

**`FormField` directive** -- Binds a `FieldTree` to a DOM element. Provides `FORM_FIELD` injection token. Exposes `element`, `state`, `injector`, `errors`, and `focus()`. Supports native inputs, `FormValueControl`, `FormCheckboxControl`, and legacy `ControlValueAccessor`.

**`FormRoot` directive** -- Binds a `FieldTree` to a `<form>`. Disables browser validation (`novalidate`), intercepts `submit` events, and delegates to the field tree's `submit()` function.

**`submit()` function** -- Marks all fields as touched, runs validation, and if valid, executes an async action callback. The action can return `TreeValidationResult` to apply server-side errors.

**State propagation** -- Field state aggregates upward. If any child is invalid, the parent is invalid. Hidden/disabled fields do not participate in parent validation.

**Array fields** -- `FieldTree` supports arrays with `@for (field of form.items; track field)`.

**Custom controls** -- Implement `FormValueControl<T>` (with `value = model<T>()`) or `FormCheckboxControl` (with `checked = model<boolean>()`). Optional properties: `touched`, `dirty`, `disabled`, `errors`, `valid`, `invalid`, `pending`, `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`.

**What this means for proto:** The proto forms layer should NOT replicate Angular Signal Forms. It should sit on top of it and provide the accessibility wiring, state-driven CSS attributes, and error display strategies that Angular's forms system intentionally leaves to component libraries.

### Base UI (base-ui.com)

Base UI's `Field` component is the gold standard for headless form field accessibility. Key patterns:

**Composable sub-components:** `Field.Root`, `Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`, `Field.Validity`. The root orchestrates ARIA wiring between children.

**Validation mode configuration:** `validationMode: 'onSubmit' | 'onBlur' | 'onChange'` on `Field.Root` controls when errors appear. `validationDebounceTime` throttles `onChange` validation.

**`Field.Error` with `match` prop:** Errors conditionally render based on validity state keys (`valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, etc.) or custom validation functions. This lets you write one `Field.Error` per error kind.

**Rich data attributes:** `data-valid`, `data-invalid`, `data-dirty`, `data-touched`, `data-filled`, `data-focused`, `data-disabled`, `data-pending`. These cascade to all sub-components.

**`Field.Validity` render prop:** Exposes the raw `ValidityState` for custom rendering without pre-built components.

**Native constraint validation integration:** Leverages the browser's `ValidityState` API alongside custom validators.

**What to adopt:** The `match` pattern for `Field.Error`, the comprehensive data attributes, the validation mode configuration, and the overall composable architecture.

### Spartan UI (spartan.ng)

Spartan's form-field is simpler than Base UI. Key patterns:

**Helm + Brain architecture:** Brain components handle accessibility and state; Helm components add Tailwind styling. However, the form-field does not have a dedicated Brain component -- it is primarily a Helm-layer concern.

**`ErrorStateMatcher` pattern:** A provider-based strategy for controlling when errors are shown. The default shows errors when `invalid && (touched || submitted)`. `ShowOnDirtyErrorStateMatcher` shows when `invalid && dirty`. This is configurable at the component or provider level.

**Reactive forms integration:** Currently built for reactive forms with `FormControl` and `Validators`. Signal Forms support is listed as "coming soon."

**What to adopt:** The `ErrorStateMatcher` strategy pattern is elegant. It separates the "when to show" decision from the component, making it configurable per field, per form, or globally.

### Angular Primitives (ng-primitives)

Angular Primitives offers a form-field package with five directives:

**`NgpFormField`** -- Container wrapper. **`NgpLabel`** -- Label directive. **`NgpDescription`** -- Description directive. **`NgpError`** -- Error directive with `ngpErrorValidator` input for matching specific validators. **`NgpFormControl`** -- Base form control directive.

**Data attributes:** `data-invalid`, `data-valid`, `data-touched`, `data-pristine`, `data-dirty`, `data-pending`, `data-disabled`. These are set on all form-field sub-components, enabling CSS-only state-driven styling.

**`ngpErrorValidator` input:** Similar to Base UI's `match` prop. The error directive only renders (or gets `data-validator="fail"`) when a specific validator fails.

**What to adopt:** The consistent data attribute propagation to all sub-components, and the validator-specific error matching.

### Radix UI

Radix Form adds two patterns not seen in the others:

**Server-side validation support:** `serverInvalid` boolean on `Field` marks fields as invalid from server responses. `onClearServerErrors` callback clears server errors before resubmission. Message components reuse with `forceMatch` for server errors.

**Automatic focus to first invalid field:** On submit failure, focus automatically moves to the first field with errors.

**What to adopt:** The server-side validation integration pattern (which maps directly to Angular Signal Forms' `submit()` action returning `TreeValidationResult`), and the auto-focus-on-error behavior.

---

## Critical Features to Implement

Prioritized by impact on library consumers.

### Priority 1: Data Attributes for State-Driven Styling

**What:** Set data attributes on form field elements reflecting their current state, matching the pattern used by every other proto primitive.

**Why:** This is the most fundamental missing feature. Without data attributes, consumers cannot style form fields based on state using CSS selectors. Every other proto primitive (Focus, Hover, Press, Interact) provides `data-*` attributes. The forms package breaks this convention.

**Attributes to add:**

| Attribute       | Condition                       | Set on        |
| --------------- | ------------------------------- | ------------- |
| `data-dirty`    | `state().dirty()`               | field element |
| `data-disabled` | `state().disabled()`            | field element |
| `data-invalid`  | `state().invalid()`             | field element |
| `data-pending`  | `state().pending()`             | field element |
| `data-pristine` | `!state().dirty()`              | field element |
| `data-readonly` | `state().readonly()`            | field element |
| `data-required` | field has `required` constraint | field element |
| `data-touched`  | `state().touched()`             | field element |
| `data-valid`    | `state().valid()`               | field element |

**Implementation in `FieldContext`:**

```typescript
// In FieldContext constructor, after the existing isomorphicEffect calls:
const state = this.state;

isomorphicEffect({
  earlyRead: () => state().valid(),
  write: valid => r.setAttr(el, 'data-valid', valid() ? '' : null),
});

isomorphicEffect({
  earlyRead: () => state().invalid(),
  write: invalid => r.setAttr(el, 'data-invalid', invalid() ? '' : null),
});

isomorphicEffect({
  earlyRead: () => state().touched(),
  write: touched => r.setAttr(el, 'data-touched', touched() ? '' : null),
});

isomorphicEffect({
  earlyRead: () => state().dirty(),
  write: dirty => {
    r.setAttr(el, 'data-dirty', dirty() ? '' : null);
    r.setAttr(el, 'data-pristine', dirty() ? null : '');
  },
});

isomorphicEffect({
  earlyRead: () => state().pending(),
  write: pending => r.setAttr(el, 'data-pending', pending() ? '' : null),
});

isomorphicEffect({
  earlyRead: () => state().disabled(),
  write: disabled => r.setAttr(el, 'data-disabled', disabled() ? '' : null),
});

isomorphicEffect({
  earlyRead: () => state().readonly(),
  write: readonly => r.setAttr(el, 'data-readonly', readonly() ? '' : null),
});
```

**Consumer benefit:** Enables CSS like `input[data-invalid][data-touched] { border-color: red; }` without any JavaScript in the component template.

---

### Priority 2: Error Visibility Strategy

**What:** A configurable strategy that controls when validation errors should be visible to the user, avoiding premature error display (e.g., showing "required" before the user has interacted with the field).

**Why:** Every consumer of a forms library needs this, and the current implementation provides no guidance. Consumers must manually write `@if (field().touched() && field().invalid())` on every error element, which is error-prone, repetitive, and inaccessible if done incorrectly.

**Design:**

Create an `ErrorStrategy` injection token with a default implementation and allow overrides at the form, field group, or field level.

```typescript
// packages/proto/forms/src/lib/error-strategy.ts

export type ErrorStrategyFn = (state: FieldState) => boolean;

export const ERROR_STRATEGY = new InjectionToken<ErrorStrategyFn>('ERROR_STRATEGY', {
  factory: () => defaultErrorStrategy,
});

/** Default: show errors when touched and invalid */
export const defaultErrorStrategy: ErrorStrategyFn = state => state.touched() && state.invalid();

/** Show errors when dirty and invalid */
export const dirtyErrorStrategy: ErrorStrategyFn = state => state.dirty() && state.invalid();

/** Show errors immediately when invalid */
export const immediateErrorStrategy: ErrorStrategyFn = state => state.invalid();

/** Show errors only after form submission attempt */
export function submitErrorStrategy(submitted: Signal<boolean>): ErrorStrategyFn {
  return state => submitted() && state.invalid();
}
```

**Integration with `FieldContext`:**

```typescript
@Resolvable()
export class FieldContext<T> {
  readonly #errorStrategy = inject(ERROR_STRATEGY);
  readonly errorsVisible = computed(() => this.#errorStrategy(this.state()));

  constructor() {
    // Add data attribute for error visibility
    isomorphicEffect({
      earlyRead: () => this.errorsVisible(),
      write: visible => r.setAttr(el, 'data-errors-visible', visible() ? '' : null),
    });
  }
}
```

**Integration with `ProtoFieldError`:**

The error directive should conditionally set `aria-hidden` when errors are not yet visible, so screen readers do not announce errors prematurely:

```typescript
host: {
  '[id]': 'id',
  role: 'alert',
  'aria-live': 'polite',
  '[attr.aria-hidden]': '!visible() || null',
  '[attr.data-errors-visible]': "visible() ? '' : null",
}
```

**Consumer override:**

```typescript
// Per-form override
@Component({
  providers: [{ provide: ERROR_STRATEGY, useValue: dirtyErrorStrategy }],
})

// Per-field override via input
<input proto [formField]="form.email" [protoErrorStrategy]="myStrategy" />
```

**Why not use `@if` alone?** Using `@if` destroys the error element, removing it from `aria-describedby`. The error should remain in the DOM but be visually hidden and `aria-hidden="true"` until the strategy says to show it. This way the ARIA wiring is stable.

---

### Priority 3: Error Matching by Validator Kind

**What:** Allow `ProtoFieldError` to match specific validation error kinds, so consumers can write separate error messages per validator.

**Why:** Currently `ProtoFieldError` accepts a `ValidationError.WithFieldTree` directly. This is fine for iterating errors in a `@for` loop, but does not support the common pattern of pre-authored error messages:

```html
<!-- What consumers want to write -->
<p [protoFieldError]="form.email" match="required">Email is required</p>
<p [protoFieldError]="form.email" match="email">Enter a valid email</p>
```

**Design:**

Add an optional `match` input to `ProtoFieldError` that accepts a validator `kind` string or a predicate function:

```typescript
@Directive({
  selector: '[protoFieldError]',
  exportAs: 'protoFieldError',
  host: {
    '[id]': 'id',
    role: 'alert',
    'aria-live': 'polite',
    '[attr.aria-hidden]': '!visible() || null',
  },
})
export class ProtoFieldError<T> {
  readonly id = uniqueId('field-error');

  /** The field to show errors for */
  readonly field = input.required<FieldTree<T, string | number>>({
    alias: 'protoFieldError',
  });

  /** Match a specific error kind, or a predicate */
  readonly match = input<string | ((error: ValidationError) => boolean)>();

  /** Whether this error is currently active */
  readonly isMatched = computed(() => {
    const errors = /* field errors */;
    const matcher = this.match();
    if (!matcher) return errors.length > 0;
    if (typeof matcher === 'string') return errors.some(e => e.kind === matcher);
    return errors.some(matcher);
  });

  /** Combines error strategy + match result */
  readonly visible = computed(() => {
    const strategy = inject(ERROR_STRATEGY);
    return strategy(/* state */) && this.isMatched();
  });
}
```

**Usage patterns:**

```html
<!-- Match specific validator kind -->
<p [protoFieldError]="form.password" match="required">Password is required</p>
<p [protoFieldError]="form.password" match="minLength">At least 8 characters</p>

<!-- Match with predicate -->
<p [protoFieldError]="form.password" [match]="isWeakPassword">Password is too weak</p>

<!-- Show first error (no match = any error) -->
<p [protoFieldError]="form.password">{{ form.password().errors()[0]?.message }}</p>

<!-- Iterate all errors (existing pattern, still supported) -->
@for (error of form.password().errors(); track error.kind) {
<p [protoFieldError]="error">{{ error.message }}</p>
}
```

---

### Priority 4: `aria-required` Wiring

**What:** Automatically set `aria-required="true"` on form field elements when the field has a `required` constraint.

**Why:** Screen readers use `aria-required` to announce that a field is mandatory. This is a WCAG requirement. Angular Signal Forms passes constraint values (including `required`) to custom controls via the `FormValueControl` interface, but native inputs do not automatically receive `aria-required`.

**Implementation in `FieldContext`:**

The challenge is detecting whether a `required()` validator is applied. Angular Signal Forms' `FieldState` does not expose constraints directly. Two approaches:

**Approach A -- Check for `required` error kind when value is empty:**

```typescript
// Heuristic: if the field has a 'required' error when its value is empty,
// it has a required validator
readonly isRequired = computed(() => {
  const errors = this.state().errors();
  return errors.some(e => e.kind === 'required');
});
```

This only works when the field is invalid with a required error, which is not reliable for initial state.

**Approach B -- Read from the `FormField` control interface:**

If the `FormField` passes `required` as a constraint to custom controls, the same value should be accessible. Check if `FORM_FIELD` exposes this.

**Approach C -- Allow manual override:**

```typescript
// FieldContext
readonly required = bindable(false);

// In constructor
isomorphicEffect({
  earlyRead: () => this.required(),
  write: req => r.setAttr(el, 'aria-required', req() ? 'true' : null),
});
```

Consumers can set it manually or it can be auto-detected:

```html
<input proto [formField]="form.email" [protoRequired]="true" />
```

**Recommendation:** Start with Approach C (explicit input) since it is reliable and does not depend on Angular internals. Enhance with auto-detection later if Signal Forms exposes constraint metadata.

---

### Priority 5: Form Root Integration

**What:** Implement `ProtoFormRoot` to wrap Angular's `FormRoot` directive and add form-level accessibility features.

**Why:** The current commented-out implementation shows intent but no execution. A form root should provide form-level state attributes and submission handling.

**Design:**

```typescript
@Directive({
  selector: 'form[protoFormRoot]',
  exportAs: 'protoFormRoot',
  hostDirectives: [{ directive: FormRoot, inputs: ['formRoot:protoFormRoot'] }],
  host: {
    novalidate: '', // Disable browser validation
  },
})
export class ProtoFormRoot<T> {
  readonly formTree = input.required<FieldTree<T>>({ alias: 'protoFormRoot' });
  readonly submitted = signal(false);

  constructor() {
    const el = injectElement();
    const r = inject(ElementRenderer);
    const state = computed(() => this.formTree()().state());

    // Form-level data attributes
    isomorphicEffect({
      earlyRead: () => state().valid(),
      write: valid => r.setAttr(el, 'data-valid', valid() ? '' : null),
    });

    isomorphicEffect({
      earlyRead: () => state().invalid(),
      write: invalid => r.setAttr(el, 'data-invalid', invalid() ? '' : null),
    });

    // Track submission state
    isomorphicEffect({
      earlyRead: () => this.submitted(),
      write: submitted => r.setAttr(el, 'data-submitted', submitted() ? '' : null),
    });
  }
}
```

**Submission strategy integration:**

`ProtoFormRoot` should provide the `submitted` signal for the `submitErrorStrategy`:

```typescript
providers: [
  {
    provide: ERROR_STRATEGY,
    useFactory: () => {
      const root = inject(ProtoFormRoot);
      return submitErrorStrategy(root.submitted);
    },
  },
],
```

---

### Priority 6: Field Group Directive

**What:** A directive for grouping related form fields with proper ARIA semantics, analogous to `<fieldset>` and `<legend>`.

**Why:** Forms with multiple sections (e.g., "Shipping Address" and "Billing Address") need semantic grouping for screen readers. Without it, users navigating by form landmarks cannot understand the structure.

**Design:**

```typescript
@Directive({
  selector: '[protoFieldGroup]',
  exportAs: 'protoFieldGroup',
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'legendId()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
  },
})
export class ProtoFieldGroup {
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly #legend = signal<ProtoFieldGroupLegend | null>(null);
  readonly legendId = computed(() => this.#legend()?.id ?? null);

  setLegend(legend: ProtoFieldGroupLegend, injector?: Injector): () => void {
    return disposable(this.setLegend, injector, () => {
      this.#legend.set(legend);
      return () => this.#legend.set(null);
    });
  }
}

@Directive({
  selector: '[protoFieldGroupLegend]',
  exportAs: 'protoFieldGroupLegend',
  host: {
    '[id]': 'id',
  },
})
export class ProtoFieldGroupLegend {
  readonly id = uniqueId('field-group-legend');
  readonly #group = inject(ProtoFieldGroup);

  constructor() {
    this.#group.setLegend(this);
  }
}
```

**Usage:**

```html
<div protoFieldGroup>
  <h3 protoFieldGroupLegend>Shipping Address</h3>
  <label protoFieldLabel [for]="form.street">Street</label>
  <input proto [formField]="form.street" />
  <!-- ... -->
</div>
```

**Accessibility:** `role="group"` with `aria-labelledby` pointing to the legend provides the same semantics as `<fieldset>` + `<legend>` without requiring those specific HTML elements, giving consumers styling freedom.

---

### Priority 7: Error Summary Component

**What:** A component that renders a list of all form errors at the top (or bottom) of a form, with links that focus the corresponding invalid fields.

**Why:** WCAG 3.3.1 (Error Identification) requires that errors are identified and described to the user. An error summary at form level is the standard pattern for complex forms. The GOV.UK Design System, for example, mandates this for all government forms.

**Design:**

```typescript
@Directive({
  selector: '[protoErrorSummary]',
  exportAs: 'protoErrorSummary',
  host: {
    role: 'alert',
    'aria-live': 'assertive',
    tabindex: '-1',
    '[attr.aria-hidden]': '!visible() || null',
  },
})
export class ProtoErrorSummary<T> {
  readonly form = input.required<FieldTree<T>>({ alias: 'protoErrorSummary' });

  /** All current errors across all fields */
  readonly errors = computed(() => {
    const state = this.form()();
    return state.errors();
  });

  /** Whether the summary should be visible */
  readonly visible = computed(() => {
    const root = inject(ProtoFormRoot, { optional: true });
    // Only show after submission attempt
    return (root?.submitted() ?? false) && this.errors().length > 0;
  });

  /** Focus the field associated with an error */
  focusField(error: ValidationError.WithFieldTree): void {
    const bindings = error.fieldTree().formFieldBindings();
    bindings[0]?.focus();
  }
}
```

**Usage:**

```html
<div [protoErrorSummary]="form" #summary="protoErrorSummary">
  <h2>There are errors in your form</h2>
  <ul>
    @for (error of summary.errors(); track error.kind) {
    <li>
      <a (click)="summary.focusField(error)" href="javascript:void(0)"> {{ error.message }} </a>
    </li>
    }
  </ul>
</div>
```

**Accessibility requirements:**

- `role="alert"` and `aria-live="assertive"` so it is announced immediately when it appears
- `tabindex="-1"` so it can be focused programmatically (focus moves here after failed submit)
- Each error links to its field via the `focusField()` method
- Hidden via `aria-hidden` until the form has been submitted at least once

---

### Priority 8: `aria-errormessage` Support

**What:** Set `aria-errormessage` on field elements pointing to the IDs of active error elements.

**Why:** While `aria-describedby` works for associating descriptions (including errors), `aria-errormessage` has been specifically designed for error messages and provides better semantics. Screen readers can distinguish between descriptions and errors, potentially using different announcement strategies.

**Implementation in `FieldContext`:**

```typescript
isomorphicEffect({
  earlyRead: computed(
    () => (this.errorsVisible() ? [...this.#errors.values()].map(e => e.id) : []),
    { equal: arrayEqual },
  ),
  write: idsSource => {
    const ids = idsSource();
    if (ids.length > 0) {
      scoped(() => r.addAttr(el, 'aria-errormessage', ids));
    } else {
      r.setAttr(el, 'aria-errormessage', null);
    }
  },
});
```

**Note:** `aria-errormessage` should only reference elements that are currently visible. When errors are hidden (via the error strategy), `aria-errormessage` should be removed. This is why it depends on `errorsVisible()` rather than just the presence of errors.

---

### Priority 9: Auto-Focus First Invalid Field on Submit

**What:** When a form submission fails validation, automatically focus the first invalid field.

**Why:** WCAG 3.3 (Input Assistance) recommends moving focus to help users correct errors. Without this, keyboard and screen reader users must manually find the first error, which is disorienting in large forms.

**Implementation in `ProtoFormRoot`:**

```typescript
@Directive({
  selector: 'form[protoFormRoot]',
  // ...
})
export class ProtoFormRoot<T> {
  readonly autoFocusOnError = input<boolean, BooleanInput>(true, {
    transform: booleanAttribute,
  });

  constructor() {
    const el = injectElement<HTMLFormElement>();

    // Listen for submit events
    const r = inject(ElementRenderer);
    r.listen(el, 'submit', () => {
      this.submitted.set(true);

      if (this.autoFocusOnError()) {
        // After Angular processes the submit and runs validation,
        // focus the first invalid field
        afterNextRender(() => {
          const firstInvalid = el.querySelector('[data-invalid][data-touched]');
          if (firstInvalid instanceof HTMLElement) {
            firstInvalid.focus();
          }
        });
      }
    });
  }
}
```

Alternatively, use the `FieldTree` API to find the first field with errors and call `FormField.focus()` on its binding.

---

### Priority 10: Propagate Data Attributes to Sub-Components

**What:** Allow labels, descriptions, and errors to reflect the field's state via their own data attributes.

**Why:** Base UI and Angular Primitives both propagate state attributes to all sub-components. This enables styling like "make the label red when the field is invalid" purely with CSS:

```css
[protoFieldLabel][data-invalid][data-touched] {
  color: var(--color-error);
}
```

**Implementation:**

Each sub-component directive can read the `FieldContext` state and apply attributes to its own element:

```typescript
// In ProtoFieldLabel constructor
const context = inject(FieldContext, { optional: true });
if (context) {
  const el = injectElement();
  const r = inject(ElementRenderer);

  isomorphicEffect({
    earlyRead: () => context.errorsVisible(),
    write: visible => r.setAttr(el, 'data-invalid', visible() ? '' : null),
  });

  isomorphicEffect({
    earlyRead: () => context.state().disabled(),
    write: disabled => r.setAttr(el, 'data-disabled', disabled() ? '' : null),
  });
}
```

This means `<label protoFieldLabel>` gets `data-invalid` when its field is invalid and touched, enabling pure-CSS error styling on the label.

---

### Future Considerations

These are not immediate priorities but should be kept in mind during implementation:

**Native constraint validation integration.** Angular Signal Forms replaces browser validation, but some consumers may want to combine them. Consider whether `ProtoFormField` should mirror constraint attributes (`required`, `minlength`, `maxlength`, `min`, `max`, `pattern`) onto the native element for progressive enhancement.

**Server-side validation patterns.** Angular Signal Forms' `submit()` action can return `TreeValidationResult` for server-side errors. `ProtoFieldError` should handle these seamlessly -- they appear in `state().errors()` like any other error, so no special handling is needed if the error matching works by `kind`.

**Custom control helpers.** Consider providing a base class or mixin that implements `FormValueControl<T>` with proto-standard data attributes and `FieldContext` integration baked in. This would make it easier for consumers to build custom form controls that are accessible by default.

**Array field support.** Dynamic arrays of fields (e.g., "add another email") need careful handling of `aria-labelledby` and `aria-describedby` as items are added and removed. The current `disposable()`-based cleanup pattern handles this correctly, but it should be explicitly tested.

**Conditional validation display.** The `when` option on Angular Signal Forms validators (e.g., `required(path.promoCode, { when: ... })`) means errors can appear and disappear dynamically. The `aria-describedby` wiring must handle this gracefully -- errors that are no longer in `state().errors()` should be removed from the ARIA attributes.

---

## Implementation Order

| Phase | Feature                                                          | Complexity | Dependencies              |
| ----- | ---------------------------------------------------------------- | ---------- | ------------------------- |
| 0     | Fix existing bugs (equality function, stray signal, `providers`) | Low        | None                      |
| 1     | Data attributes for state-driven styling                         | Low        | Bug fixes                 |
| 2     | Error visibility strategy (`ERROR_STRATEGY` token)               | Medium     | None                      |
| 3     | Error matching by validator kind (`match` input)                 | Medium     | Error strategy            |
| 4     | `aria-required` wiring                                           | Low        | None                      |
| 5     | `ProtoFormRoot` implementation                                   | Medium     | Error strategy            |
| 6     | Field group directive                                            | Low        | None                      |
| 7     | Error summary component                                          | Medium     | Form root, error strategy |
| 8     | `aria-errormessage` support                                      | Low        | Error strategy            |
| 9     | Auto-focus first invalid field                                   | Low        | Form root                 |
| 10    | Data attribute propagation to sub-components                     | Medium     | Data attributes           |

**Phases 0-3 should be completed before building any new form-related primitives** (Select, Combobox, etc.) since those primitives will need the error display infrastructure.
