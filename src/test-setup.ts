/**
 * Browser APIs jsdom does not implement, stubbed so overlay components can run under test.
 *
 * The spartan select measures its trigger with a `ResizeObserver`, so the popover matches
 * its width, and scrolls the active option into view with the key manager. jsdom has
 * neither, and without them the list throws instead of opening. Neither stub changes what
 * a test can assert: there is no layout in jsdom to measure or scroll.
 */

if (!('ResizeObserver' in globalThis)) {
  class NoopResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  globalThis.ResizeObserver = NoopResizeObserver;
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}
