import { TextField } from "./Fields";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal } from "./Modal";
import { Button } from "./Button";
const meta = {
  title: "UI/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    title: "Document settings",
    onClose: () => {},
    children: (
      <div className="inspector-content">
        <p>
          A dialog should stay readable at narrow widths and return focus when
          closed.
        </p>
        <TextField labelText="Document name" defaultValue="Research notes" />
      </div>
    ),
  },
  render: (args) => {
    const [open, setOpen] = useState(true);
    return open ? (
      <Modal {...args} onClose={() => setOpen(false)} />
    ) : (
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
    );
  },
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Standard: Story = {};
export const Wide: Story = { args: { wide: true } };

export const HiddenOwner: Story = {
  render: (args) => (
    <div hidden>
      <Modal {...args} />
    </div>
  ),
  play: async () => {
    const { expect, within } = await import("storybook/test");
    const dialog = within(document.body).getByRole("dialog", {
      name: "Document settings",
    });
    await expect(dialog).toBeVisible();
    await expect(
      within(dialog).getByRole("textbox", { name: "Document name" }),
    ).toBeVisible();
  },
};

export const KeyboardFocus: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open settings</Button>
        {open && <Modal {...args} onClose={() => setOpen(false)} />}
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const { expect, userEvent, within, waitFor } = await import(
      "storybook/test"
    );
    const launcher = within(canvasElement).getByRole("button", {
      name: "Open settings",
    });
    launcher.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Document settings",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    await userEvent.keyboard("{Tab}{Tab}{Tab}{Shift>}{Tab}{/Shift}");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog", {
          name: "Document settings",
        }),
      ).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement).toBe(launcher));
  },
};
