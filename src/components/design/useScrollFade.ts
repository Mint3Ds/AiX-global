"use client";

import { useCallback, useRef } from "react";

/** Mark only the edges that still have hidden content behind them. */
export function useScrollFade<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((element: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!element) return;

    const update = () => {
      const remaining = element.scrollHeight - element.clientHeight;
      element.dataset.fadeTop = String(remaining > 2 && element.scrollTop > 2);
      element.dataset.fadeBottom = String(
        remaining > 2 && element.scrollTop < remaining - 2,
      );
    };

    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    const contentObserver = new MutationObserver(update);
    contentObserver.observe(element, { childList: true, subtree: true, characterData: true });
    const frame = requestAnimationFrame(update);
    update();

    cleanup.current = () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
      contentObserver.disconnect();
    };
  }, []);
}
