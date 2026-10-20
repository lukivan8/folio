import { InlineLoading } from "@carbon/react";
export function Progress({ label = "Working" }: { label?: string }) {
  return <InlineLoading status="active" description={label} />;
}
