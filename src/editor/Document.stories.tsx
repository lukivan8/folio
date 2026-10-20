import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import applicationCSS from "../style.css?inline";
import { EditorFixture } from "../stories/EditorFixture";
const meta = {
  title: "Editor/Document",
  component: EditorFixture,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { content: { type: "doc", content: [{ type: "paragraph" }] } },
} satisfies Meta<typeof EditorFixture>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const MixedBlocks: Story = {
  args: {
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "A place for ideas" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Every paragraph is a block. Data is another optional block on the page.",
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Keep the question beside the evidence.",
                },
              ],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Write a clear conclusion" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};
export const EmptyDataBlock: Story = { args: { data: true } };
export const NarrowDataBlock: Story = { args: { data: true, width: 440 } };

export const TypingFocus: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelector(".prose-editor")).not.toBeNull(),
    );
    const editor = canvasElement.querySelector<HTMLElement>(".prose-editor")!;
    await userEvent.click(editor);
    await userEvent.keyboard("First thought.{Enter}Another paragraph.");
    await expect(editor).toHaveTextContent("First thought.");
    await expect(editor).toHaveTextContent("Another paragraph.");
    expect(editor.querySelectorAll(":scope > p")).toHaveLength(2);
    const selection = window.getSelection()!;
    expect(selection.isCollapsed).toBe(true);
    expect(editor.contains(selection.anchorNode)).toBe(true);
    expect(selection.toString()).toBe("");
    expect(editor.querySelector(".ProseMirror-selectednode")).toBeNull();
    // Reproduce the desktop bundle's ordering: application styles can load after feature styles.
    const lateApplicationStyles = document.createElement("style");
    lateApplicationStyles.textContent = applicationCSS;
    document.head.append(lateApplicationStyles);
    try {
      expect(getComputedStyle(editor).outlineStyle).toBe("none");
    } finally {
      lateApplicationStyles.remove();
    }
    // Controls still expose a visible focus ring when reached by keyboard.
    const textButton =
      canvasElement.querySelector<HTMLButtonElement>(".text-style button")!;
    textButton.focus();
    await userEvent.keyboard("{Tab}{Shift>}{Tab}{/Shift}");
    expect(getComputedStyle(textButton).outlineStyle).not.toBe("none");
  },
};
