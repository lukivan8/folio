import { InlineNotification } from "@carbon/react";
import type { ReactNode } from "react";
export function Notice({
  kind = "error",
  title,
  children,
}: {
  kind?: "error" | "warning" | "info" | "success";
  title?: string;
  children: ReactNode;
}) {
  return (
    <InlineNotification
      kind={kind}
      lowContrast
      hideCloseButton
      title={
        title ||
        (kind === "error"
          ? "Unable to complete this action"
          : kind === "warning"
            ? "Review required"
            : "Folio")
      }
      subtitle={typeof children === "string" ? children : undefined}
      role={kind === "error" ? "alert" : "status"}
    >
      {typeof children === "string" ? null : children}
    </InlineNotification>
  );
}
