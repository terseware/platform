/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  effect,
  ElementRef,
  HostAttributeToken,
  inject,
  Injectable,
  Injector,
  PLATFORM_ID,
  runInInjectionContext,
} from '@angular/core';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

type ElementClassManager = {
  element: HTMLElement;
  sources: Map<number, { classes: Set<string>; order: number }>;
  baseClasses: Set<string>;
  isUpdating: boolean;
  nextOrder: number;
  hasInitialized: boolean;
};

@Injectable({ providedIn: 'root' })
class ClassesCtx {
  readonly elementClassManagers = new WeakMap<HTMLElement, ElementClassManager>();
  globalObserver: MutationObserver | null = null;
  readonly observedElements = new Set<HTMLElement>();
  sourceCounter = 0;
}

/**
 * This function dynamically adds and removes classes for a given element without requiring
 * the a class binding (e.g. `[class]="..."`) which may interfere with other class bindings.
 *
 * 1. This will merge the existing classes on the element with the new classes.
 * 2. It will also remove any classes that were previously added by this function but are no longer present in the new classes.
 * 3. Multiple calls to this function on the same element will be merged efficiently.
 */
export function classes(computed: () => ClassValue[] | string, options: ClassesOptions = {}): void {
  runInInjectionContext(options.injector ?? inject(Injector), () => {
    const elementRef = options.elementRef ?? inject(ElementRef);
    const platformId = inject(PLATFORM_ID);
    const destroyRef = inject(DestroyRef);
    const baseClasses = inject(new HostAttributeToken('class'), { optional: true });

    const element = elementRef.nativeElement;

    const classesCtx = inject(ClassesCtx);

    // Create unique identifier for this source
    const sourceId = classesCtx.sourceCounter++;

    // Get or create the class manager for this element
    let manager = classesCtx.elementClassManagers.get(element);

    if (!manager) {
      // Initialize base classes from variation (host attribute 'class')
      const initialBaseClasses = new Set<string>();

      if (baseClasses) {
        toClassList(baseClasses).forEach(cls => initialBaseClasses.add(cls));
      }

      manager = {
        element,
        sources: new Map(),
        baseClasses: initialBaseClasses,
        isUpdating: false,
        nextOrder: 0,
        hasInitialized: false,
      };
      classesCtx.elementClassManagers.set(element, manager);

      // Setup global observer if needed and register this element
      setupGlobalObserver(platformId, classesCtx);
      classesCtx.observedElements.add(element);
    }

    // Assign order once at registration time
    const sourceOrder = manager.nextOrder++;

    function updateClasses(): void {
      // Get the new classes from the computed function
      const newClasses = toClassList(computed());

      // Update this source's classes, keeping the original order
      manager!.sources.set(sourceId, {
        classes: new Set(newClasses),
        order: sourceOrder,
      });

      // Update the element
      updateElement(manager!);
    }

    // Register cleanup with DestroyRef
    destroyRef.onDestroy(() => {
      // Remove this source from the manager
      manager!.sources.delete(sourceId);

      // If no more sources, clean up the manager
      if (manager!.sources.size === 0) {
        cleanupManager(element, classesCtx);
      } else {
        // Update element without this source's classes
        updateElement(manager!);
      }
    });

    /**
     * We need this effect to track changes to the computed classes. Ideally, we would use
     * afterRenderEffect here, but that doesn't run in SSR contexts, so we use a standard
     * effect which works in both browser and SSR.
     */
    effect(updateClasses);
  });
}

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
function setupGlobalObserver(platformId: Object, classesCtx: ClassesCtx): void {
  if (isPlatformBrowser(platformId) && !classesCtx.globalObserver) {
    // Create single global observer that watches the entire document
    classesCtx.globalObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const element = mutation.target as HTMLElement;
          const manager = classesCtx.elementClassManagers.get(element);

          // Only process elements we're managing
          if (manager && classesCtx.observedElements.has(element)) {
            if (manager.isUpdating) continue; // Ignore changes we're making

            // Update base classes to include any externally added classes
            const currentClasses = toClassList(element.className);
            const allSourceClasses = new Set<string>();

            // Collect all classes from all sources
            for (const source of manager.sources.values()) {
              for (const className of source.classes) {
                allSourceClasses.add(className);
              }
            }

            // Any classes not from sources become new base classes
            manager.baseClasses.clear();

            for (const className of currentClasses) {
              if (!allSourceClasses.has(className)) {
                manager.baseClasses.add(className);
              }
            }

            updateElement(manager);
          }
        }
      }
    });

    // Start observing the entire document for class attribute changes
    classesCtx.globalObserver.observe(document, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true, // Watch all descendants
    });
  }
}

function updateElement(manager: ElementClassManager): void {
  if (manager.isUpdating) return; // Prevent recursive updates

  manager.isUpdating = true;

  // Handle initialization: capture base classes after first source registration
  if (!manager.hasInitialized && manager.sources.size > 0) {
    // Get current classes on element (may include SSR classes)
    const currentClasses = toClassList(manager.element.className);

    // Get all classes that will be applied by sources
    const allSourceClasses = new Set<string>();
    for (const source of manager.sources.values()) {
      source.classes.forEach(className => allSourceClasses.add(className));
    }

    // Only consider classes as "base" if they're not produced by any source
    // This prevents SSR-rendered classes from being preserved as base classes
    currentClasses.forEach(className => {
      if (!allSourceClasses.has(className)) {
        manager.baseClasses.add(className);
      }
    });

    manager.hasInitialized = true;
  }

  // Get classes from all sources, sorted by registration order (later takes precedence)
  const sortedSources = Array.from(manager.sources.entries()).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  const allSourceClasses: string[] = [];
  for (const [, source] of sortedSources) {
    allSourceClasses.push(...source.classes);
  }

  // Combine base classes with all source classes, ensuring base classes take precedence
  const classesToApply =
    allSourceClasses.length > 0 || manager.baseClasses.size > 0
      ? twMerge(clsx([...allSourceClasses, ...manager.baseClasses]))
      : '';

  // Apply the classes to the element
  if (manager.element.className !== classesToApply) {
    manager.element.className = classesToApply;
  }

  manager.isUpdating = false;
}

function cleanupManager(element: HTMLElement, classesCtx: ClassesCtx): void {
  // Remove from global tracking
  classesCtx.observedElements.delete(element);
  classesCtx.elementClassManagers.delete(element);

  // If no more elements being tracked, cleanup global observer
  if (classesCtx.observedElements.size === 0 && classesCtx.globalObserver) {
    classesCtx.globalObserver.disconnect();
    classesCtx.globalObserver = null;
  }
}

type ClassesOptions = {
  elementRef?: ElementRef<HTMLElement>;
  injector?: Injector;
};

// Cache for parsed class lists to avoid repeated string operations
const classListCache = new Map<string, string[]>();

function toClassList(className: string | ClassValue[]): string[] {
  // For simple string inputs, use cache to avoid repeated parsing
  if (typeof className === 'string' && classListCache.has(className)) {
    return classListCache.get(className)!;
  }

  const result = clsx(className)
    .split(' ')
    .filter(c => c.length > 0);

  // Cache string results, but limit cache size to prevent memory growth
  if (typeof className === 'string' && classListCache.size < 1000) {
    classListCache.set(className, result);
  }

  return result;
}
