import { useId, type ComponentProps } from "react";
import { TextInput, TextArea, Select } from "@carbon/react";
/** IDs and accessible labels are shared behavior; Carbon owns the controls. */
export function TextField({
  id,
  labelText,
  ...props
}: Omit<ComponentProps<typeof TextInput>, "id" | "labelText"> & {
  id?: string;
  labelText?: string;
}) {
  const generated = useId();
  const label = labelText || props["aria-label"] || props.placeholder || "Text";
  return (
    <TextInput
      {...props}
      id={id || generated}
      labelText={label}
      hideLabel={!labelText}
      size="sm"
    />
  );
}
export function SelectField({
  id,
  labelText,
  ...props
}: Omit<ComponentProps<typeof Select>, "id" | "labelText"> & {
  id?: string;
  labelText?: string;
}) {
  const generated = useId();
  const label = labelText || props["aria-label"] || "Choose an option";
  return (
    <Select
      {...props}
      id={id || generated}
      labelText={label}
      hideLabel={!labelText}
      size="sm"
    />
  );
}
export function TextAreaField({
  id,
  labelText,
  ...props
}: Omit<ComponentProps<typeof TextArea>, "id" | "labelText"> & {
  id?: string;
  labelText?: string;
}) {
  const generated = useId();
  const label =
    labelText || props["aria-label"] || props.placeholder || "Message";
  return (
    <TextArea
      {...props}
      id={id || generated}
      labelText={label}
      hideLabel={!labelText}
    />
  );
}
