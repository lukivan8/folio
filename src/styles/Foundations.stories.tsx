import type { Meta, StoryObj } from "@storybook/react-vite";
function Typography() {
  return (
    <div style={{ maxWidth: 680, padding: 24 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>Typography</h1>
      <p
        style={{
          fontSize: "var(--cds-body-02-font-size)",
          color: "var(--cds-text-primary)",
        }}
      >
        Reading · Carbon body-02. The page is a place to develop an idea. Every
        paragraph is a block.
      </p>
      <p style={{ fontSize: "var(--cds-body-02-font-size)" }}>
        Body · 16px. Prompts and input content stay comfortable to read.
      </p>
      <p style={{ fontSize: "var(--cds-body-01-font-size)" }}>
        Label · 14px. Controls and table content use the same scale.
      </p>
      <p
        style={{
          fontSize: "var(--cds-label-01-font-size)",
          color: "var(--cds-text-secondary)",
        }}
      >
        Metadata · 12px. Secondary information keeps sufficient contrast.
      </p>
    </div>
  );
}
const meta = {
  title: "Foundations/Typography",
  component: Typography,
  tags: ["autodocs"],
} satisfies Meta<typeof Typography>;
export default meta;
export const TypeScale: StoryObj<typeof meta> = {};
