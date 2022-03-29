import { Injectable } from '@angular/core';

export type LxResizeObserverCallback = (resizedElement: ResizeObserverEntry) => void;

interface ResizeableElement extends Element {
  handleResize: LxResizeObserverCallback;
}

function isResizeableElement(element: any): element is ResizeableElement {
  return element && !!element.handleResize;
}

/**
 * Sharing one ResizeObserver object results in much better performance
 * over individual components creating their own ResizeObserver.
 * This is why this service exists.
 * Source:
 * - https://github.com/WICG/resize-observer/issues/59#issuecomment-408098151
 * - https://groups.google.com/a/chromium.org/g/blink-dev/c/z6ienONUb5A/m/F5-VcUZtBAAJ
 *
 * Learn more about the ResizeObserver API:
 * - https://www.w3.org/TR/resize-observer/
 * - https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
 * - https://www.digitalocean.com/community/tutorials/js-resize-observer
 */
@Injectable({ providedIn: 'root' })
export class ResizeObserverService {
  private resizeObserver?: ResizeObserver;

  observe(element: ResizeableElement, callback: LxResizeObserverCallback, options?: ResizeObserverOptions) {
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(this.resizeObserverCallback.bind(this));
    }
    element.handleResize = callback;
    this.resizeObserver.observe(element, options);
  }

  unobserve(element: HTMLElement) {
    if (!this.resizeObserver) {
      return;
    }
    this.resizeObserver.unobserve(element);
  }

  private resizeObserverCallback(entries: ResizeObserverEntry[], _observer: ResizeObserver) {
    entries.forEach((entry) => {
      if (isResizeableElement(entry.target)) {
        entry.target.handleResize(entry);
      }
    });
  }
}
