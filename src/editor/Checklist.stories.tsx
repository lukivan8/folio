import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { EditorFixture } from "../stories/EditorFixture";
const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const task = (text: string, checked = false, children: object[] = []) => ({
  type: "taskItem",
  attrs: { checked },
  content: [paragraph(text), ...children],
});
const list = (...items: object[]) => ({ type: "taskList", content: items });
const document = (...items: object[]) => ({ type: "doc", content: items });
const meta = {
  title: "Editor/Checklist",
  component: EditorFixture,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The live Tiptap task-list extension inside the production document editor. Checks cover the checkbox and first text line staying together, including wrapped and nested items.",
      },
    },
  },
  args: {
    content: document(list(task("Replace the sample CSV with a real export"))),
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EditorFixture>;
export default meta;
type Story = StoryObj<typeof meta>;
async function assertRows(canvas: HTMLElement) {
  await waitFor(() =>
    expect(canvas.querySelector(".folio-task-item")).not.toBeNull(),
  );
  for (const row of canvas.querySelectorAll<HTMLElement>(".folio-task-item")) {
    const label = row.querySelector<HTMLElement>(
      ":scope > .task-checkbox .cds--checkbox-label",
    )!;
    const text = row.querySelector(
      ":scope > [data-task-content] > p",
    )!.firstChild!;
    const range = window.document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(8, text.textContent!.length));
    const firstLine = range.getBoundingClientRect();
    const checkbox = label.getBoundingClientRect();
    expect(
      Math.abs(
        checkbox.top +
          checkbox.height / 2 -
          (firstLine.top + firstLine.height / 2),
      ),
    ).toBeLessThan(8);
    expect(firstLine.left).toBeGreaterThan(checkbox.right);
  }
}
export const Unchecked: Story = {
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>(
      ".folio-task-item input",
    )!;
    await userEvent.click(input);
    await waitFor(() => expect(input).toBeChecked());
    await expect(
      canvasElement.querySelector(".folio-task-item"),
    ).toHaveAttribute("data-checked", "true");
  },
};
export const Completed: Story = {
  args: {
    content: document(
      list(task("Replace the sample CSV with a real export", true)),
    ),
  },
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
    await expect(
      canvasElement.querySelector("input[type=checkbox]"),
    ).toBeChecked();
  },
};
export const Wrapped: Story = {
  args: {
    width: 420,
    content: document(
      list(
        task(
          "Review the full CSV export with the team and document the assumptions before preparing next month’s report.",
        ),
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
    const p = canvasElement.querySelector(".folio-task-item p")!;
    expect(p.getBoundingClientRect().height).toBeGreaterThan(40);
  },
};
export const Nested: Story = {
  args: {
    content: document(
      list(
        task("Prepare the report", true, [
          list(task("Check the source columns"), task("Write the conclusion")),
        ]),
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
    const inputs = canvasElement.querySelectorAll("input[type=checkbox]");
    expect(inputs).toHaveLength(3);
    await expect(inputs[0]).toBeChecked();
    await expect(inputs[1]).not.toBeChecked();
  },
};
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
    const input = canvasElement.querySelector<HTMLInputElement>(
      "input[type=checkbox]",
    )!;
    await userEvent.click(input);
    await expect(input).not.toBeChecked();
  },
};
export const Narrow: Story = {
  args: {
    width: 320,
    content: document(
      list(
        task("A short task"),
        task(
          "A longer task should wrap under its text, while the checkbox stays beside the first line.",
        ),
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    await assertRows(canvasElement);
  },
};
