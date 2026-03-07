import { inject } from '@angular/core';
import { ElementRenderer } from './element-renderer';
import { injectElement } from './inject-helpers';
import type { Args } from './types';

/**
 * An event that supports modifier keys.
 *
 * Matches the native KeyboardEvent, MouseEvent, and TouchEvent.
 */
export type EventWithModifiers = {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
} & Event;

/**
 * Options that are applicable to all event handlers.
 *
 * This library has not yet had a need for stopPropagationImmediate.
 */
export type EventHandlerOptions = {
  ignoreRepeat?: boolean;
  stopPropagation: boolean;
  preventDefault: boolean;
};

/** A basic event handler. */
export type EventHandler<T extends Event> = (event: T) => void;

/** A function that determines whether an event is to be handled. */
export type EventMatcher<T extends Event> = (event: T) => boolean;

/** A config that specifies how to handle a particular event. */
export type EventHandlerConfig<T extends Event> = {
  matcher: EventMatcher<T>;
  handler: EventHandler<T>;
} & EventHandlerOptions;

/** Bit flag representation of the possible modifier keys that can be present on an event. */
export enum Modifier {
  None = 0,
  Ctrl = 0b1,
  Shift = 0b10,
  Alt = 0b100,
  Meta = 0b1000,
  Any = 'Any',
}

export type ModifierInputs = Modifier | Modifier[];

/**
 * Abstract base class for all event managers.
 *
 * Event managers are designed to normalize how event handlers are authored and create a safety net
 * for common event handling gotchas like remembering to call preventDefault or stopPropagation.
 */
export abstract class EventManager<T extends Event> {
  protected configs: EventHandlerConfig<T>[] = [];
  abstract options: EventHandlerOptions;

  /** Runs the handlers that match with the given event. */
  handle(event: T): void {
    for (const config of this.configs) {
      if (config.matcher(event)) {
        config.handler(event);

        if (config.preventDefault) {
          event.preventDefault();
        }

        if (config.stopPropagation) {
          event.stopPropagation();
        }
      }
    }
  }

  /** Configures the event manager to handle specific events. (See subclasses for more). */
  abstract on(...args: [...unknown[]]): this;
}

/** Gets bit flag representation of the modifier keys present on the given event. */
export function getModifiers(event: EventWithModifiers): number {
  return (
    (+event.ctrlKey && Modifier.Ctrl) |
    (+event.shiftKey && Modifier.Shift) |
    (+event.altKey && Modifier.Alt) |
    (+event.metaKey && Modifier.Meta)
  );
}

/**
 * Checks if the given event has modifiers that are an exact match for any of the given modifier
 * flag combinations.
 */
export function hasModifiers(event: EventWithModifiers, modifiers: ModifierInputs): boolean {
  const eventModifiers = getModifiers(event);
  const modifiersList = Array.isArray(modifiers) ? modifiers : [modifiers];

  if (modifiersList.includes(Modifier.Any)) {
    return true;
  }

  return modifiersList.some(m => eventModifiers === m);
}

/**
 * Used to represent a keycode.
 *
 * This is used to match whether an events keycode should be handled. The ability to match using a
 * string, SignalLike, or Regexp gives us more flexibility when authoring event handlers.
 */
type KeyCode = string | (() => string) | RegExp;

/**
 * An event manager that is specialized for handling keyboard events. By default this manager stops
 * propagation and prevents default on all events it handles.
 */
export class KeyboardEventManager<T extends KeyboardEvent> extends EventManager<T> {
  constructor(element?: HTMLElement) {
    super();
    element ??= injectElement<HTMLElement>();
    const renderer = inject(ElementRenderer);
    renderer.listen(element, 'keydown', event => this.handle(event as T));
  }

  options: EventHandlerOptions = {
    ignoreRepeat: true,
    preventDefault: true,
    stopPropagation: true,
  };

  /** Configures this event manager to handle events with a specific key and no modifiers. */
  on(key: KeyCode, handler: EventHandler<T>, options?: Partial<EventHandlerOptions>): this;

  /**  Configures this event manager to handle events with a specific modifer and key combination. */
  on(
    modifiers: ModifierInputs,
    key: KeyCode,
    handler: EventHandler<T>,
    options?: Partial<EventHandlerOptions>,
  ): this;

  on(...args: Args): this {
    const { modifiers, key, handler, options } = this._normalizeInputs(...args);

    this.configs.push({
      handler: handler,
      matcher: event => this._isMatch(event, key, modifiers, options),
      ...this.options,
      ...options,
    });

    return this;
  }

  private _normalizeInputs(...args: Args) {
    const withModifiers = Array.isArray(args[0]) || args[0] in Modifier;
    const modifiers = withModifiers ? args[0] : Modifier.None;
    const key = withModifiers ? args[1] : args[0];
    const handler = withModifiers ? args[2] : args[1];
    const options = withModifiers ? args[3] : args[2];

    return {
      key: key as KeyCode,
      handler: handler as EventHandler<T>,
      modifiers: modifiers as ModifierInputs,
      options: (options ?? {}) as Partial<EventHandlerOptions>,
    };
  }

  private _isMatch(
    event: T,
    key: KeyCode,
    modifiers: ModifierInputs,
    options?: Partial<EventHandlerOptions>,
  ): boolean {
    if (!hasModifiers(event, modifiers)) {
      return false;
    }

    // Default is to ignore repeated key events unless explicitly set to false.
    if (event.repeat && options?.ignoreRepeat !== false) {
      return false;
    }

    if (key instanceof RegExp) {
      return key.test(event.key);
    }

    const keyStr = typeof key === 'string' ? key : key();
    return keyStr.toLowerCase() === event.key.toLowerCase();
  }
}
