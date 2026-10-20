import { Modal as CarbonModal } from "@carbon/react";
import { createPortal } from "react-dom";
import { useRef, useEffect, type ReactNode } from "react";
/** Body portal supports dialogs launched from a hidden source/finding controller. */
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const launcher = useRef(document.activeElement as HTMLElement | null);
  // Callers conditionally unmount dialogs; Carbon handles trapping, this restores their launcher.
  useEffect(
    () => () => {
      const target = launcher.current;
      queueMicrotask(() => {
        if (target?.isConnected) target.focus();
      });
    },
    [],
  );
  return createPortal(
    <CarbonModal
      open
      passiveModal
      modalHeading={title}
      modalAriaLabel={title}
      size={wide ? "lg" : "sm"}
      onRequestClose={onClose}
      closeButtonLabel="Close dialog"
      launcherButtonRef={launcher}
      hasScrollingContent
    >
      {children}
    </CarbonModal>,
    document.body,
  );
}
