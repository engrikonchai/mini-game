import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Bottom sheet built on the native modal <dialog>: the browser handles the focus trap,
 * inert background and Escape. Closing always goes through `onClose` so the caller can
 * resume the game and restore input focus inside the same user gesture.
 */
export function Sheet({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus the sheet heading rather than the close button so screen readers start at the title.
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__grip" aria-hidden />
        <header className="sheet__head">
          <h2 id={titleId} className="sheet__title" tabIndex={-1} data-autofocus>
            {title}
          </h2>
          <button type="button" className="icon-btn" aria-label="Zatvori" onClick={onClose}>
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
