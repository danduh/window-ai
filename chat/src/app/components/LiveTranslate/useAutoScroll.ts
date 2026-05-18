import { useEffect, useRef } from 'react';

/**
 * Auto-scroll a container to the bottom whenever its dependency changes.
 *
 * Pattern from the chat-UI conventions (Daily.co live captions, KendoReact
 * streaming chat, etc.): identify the scrollable container, set its
 * `scrollTop = scrollHeight` whenever new content arrives.
 *
 * Pass any value whose change should trigger an auto-scroll — typically the
 * accumulated list length plus the in-progress text length, so we re-scroll
 * both on a new finalized line and as a streaming/interim text grows.
 *
 * Returns a ref to attach to the scrollable element.
 */
export function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}
