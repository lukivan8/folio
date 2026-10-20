import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./Progress";
const meta = {
  title: "UI/Progress",
  component: Progress,
  args: { label: "Working" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;
export default meta;
export const Indeterminate: StoryObj<typeof meta> = {};
