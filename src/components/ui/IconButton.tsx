import { IconButton as CarbonIconButton } from "@carbon/react";
import { useId, type ComponentProps } from "react";
export type IconButtonProps = Omit<
  ComponentProps<typeof CarbonIconButton>,
  "label"
> & { label: string };
export function IconButton({
  size = "sm",
  kind = "ghost",
  align = "bottom-end",
  label,
  ...props
}: IconButtonProps) {
  const labelId = useId();
  return (
    <CarbonIconButton
      {...props}
      type="button"
      label={label}
      aria-label={label}
      aria-labelledby={labelId}
      size={size}
      kind={kind}
      align={align}
      autoAlign
      closeOnActivation
    >
      <span id={labelId} className="cds--visually-hidden">
        {label}
      </span>
      {props.children}
    </CarbonIconButton>
  );
}
