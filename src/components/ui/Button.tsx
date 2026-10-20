import { Button as CarbonButton } from "@carbon/react";
import type { ComponentProps } from "react";
export type ButtonProps = ComponentProps<typeof CarbonButton>;
/** Folio defaults to Carbon's compact ghost action; behavior belongs to Carbon. */
export function Button({
  size = "sm",
  kind = "ghost",
  type = "button",
  ...props
}: ButtonProps) {
  return <CarbonButton {...props} kind={kind} size={size} type={type} />;
}
