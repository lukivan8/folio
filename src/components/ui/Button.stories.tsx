import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Save changes" },
  argTypes: {
    kind: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "ghost"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = { args: { kind: "primary" } };
export const Secondary: Story = { args: { kind: "secondary" } };
export const Tertiary: Story = { args: { kind: "tertiary" } };
export const Ghost: Story = {};
export const Disabled: Story = { args: { kind: "primary", disabled: true } };
