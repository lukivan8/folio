import { Tag } from "@carbon/react";
import type { ReactNode } from "react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <Tag
      type={
        tone === "success" ? "green" : tone === "warning" ? "warm-gray" : "gray"
      }
      size="sm"
    >
      {children}
    </Tag>
  );
}
