import { useEffect } from 'react';

/**
 * Tracks the *visible* viewport and exposes it to CSS:
 *   --vvh   visible height in px (shrinks when the on-screen keyboard opens)
 *   --vvt   visual viewport offset from the layout viewport top (iOS pans instead of resizing)
 *   [data-kb]       an editable element is focused and the visible height dropped noticeably
 *   [data-compact]  the visible area is short (keyboard open or a small screen)
 *
 * Only the visible height is used, never "layout height − keyboard height", so browsers that already
 * resize the layout viewport for the keyboard (Android Chrome with interactive-widget=resizes-content)
 * don't get the inset applied twice: there visualViewport.height simply equals innerHeight and offsetTop is 0.
 */
const KEYBOARD_THRESHOLD = 120;
const COMPACT_HEIGHT = 620;

export function useVisualViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let baseline = 0;
    let baselineWidth = 0;
    let frame = 0;

    const editableFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };

    const apply = () => {
      frame = 0;
      const height = vv ? vv.height : window.innerHeight;
      const width = vv ? vv.width : window.innerWidth;
      const top = vv ? Math.max(0, vv.offsetTop) : 0;
      const focused = editableFocused();

      // Reset the baseline on rotation; otherwise track the tallest unfocused height.
      if (Math.abs(width - baselineWidth) > 40) {
        baselineWidth = width;
        baseline = height;
      }
      baseline = focused ? Math.max(baseline, height) : height;
      const keyboard = focused && baseline - height > KEYBOARD_THRESHOLD;

      root.style.setProperty('--vvh', `${Math.round(height)}px`);
      root.style.setProperty('--vvt', `${Math.round(top)}px`);
      toggle(root, 'kb', keyboard);
      toggle(root, 'compact', keyboard || height < COMPACT_HEIGHT);

      // With nothing focused the page should never stay scrolled (iOS can leave it panned after the keyboard closes).
      if (!focused && (window.scrollY !== 0 || window.scrollX !== 0)) window.scrollTo(0, 0);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    // Focus changes arrive before the keyboard finishes animating; re-check a little later as well.
    const onFocusChange = () => {
      schedule();
      window.setTimeout(schedule, 120);
      window.setTimeout(schedule, 400);
    };

    apply();
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', onFocusChange);
    document.addEventListener('focusin', onFocusChange);
    document.addEventListener('focusout', onFocusChange);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', onFocusChange);
      document.removeEventListener('focusin', onFocusChange);
      document.removeEventListener('focusout', onFocusChange);
    };
  }, []);
}

function toggle(el: HTMLElement, name: string, on: boolean) {
  if (on) el.setAttribute(`data-${name}`, '');
  else el.removeAttribute(`data-${name}`);
}
