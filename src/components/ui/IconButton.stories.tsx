import type { Meta, StoryObj } from "@storybook/react-vite";
import { Add as Plus } from "@carbon/react/icons";
import { IconButton } from "./IconButton";
const meta = {
  title: "UI/Icon button",
  component: IconButton,
  tags: ["autodocs"],
  args: {
    label: "Insert block",
    children: <Plus size={20} />,
    onClick: () => {},
  },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
