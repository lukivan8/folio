import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";
const meta = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Data block", tone: "neutral" },
  argTypes: {
    tone: { control: "select", options: ["neutral", "success", "warning"] },
  },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Neutral: Story = {};
export const Success: Story = {
  args: { tone: "success", children: "Checks passed" },
};
export const Warning: Story = {
  args: { tone: "warning", children: "Review parsing" },
};
