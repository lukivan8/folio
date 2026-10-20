import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import App from "../App";
import { bridge } from "../bridge";
import { emptyDoc } from "../welcome";
import type { Doc, Files, Compiled } from "../model";
import type { SharedSource } from "../library";
import fixture from "../stories/fixtures/workspace.json";
import { PaneDivider } from "./PaneDivider";
const meta = {
  title: "Workspace/Everyday flows",
  component: App,
  render: () => <ReopenableWorkspace />,
  parameters: { layout: "fullscreen", a11y: { test: "off" } },
  beforeEach: () => {
    const original = { ...bridge };
    const previous = new Map<string, string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith("folio-"))
        previous.set(key, localStorage.getItem(key)!);
    }
    for (const key of previous.keys()) localStorage.removeItem(key);
    localStorage.setItem("folio-ai-consent", "yes");
    const initial = { ...emptyDoc(), title: "Research notes" };
    const docs = new Map<string, Doc>([[initial.id, initial]]);
    const records = new Map<string, SharedSource>([
      [fixture.record.id, structuredClone(fixture.record) as SharedSource],
    ]);
    Object.assign(bridge, {
      list: async () =>
        [...docs.values()].map(({ id, title, updated, trashed }) => ({
          id,
          title,
          updated,
          trashed,
        })),
      load: async (id: string) => structuredClone(docs.get(id)!),
      save: async (d: Doc) => {
        docs.set(d.id, structuredClone(d));
        return "story";
      },
      listSources: async () =>
        [...records.values()].map((r) => structuredClone(r)),
      saveSource: async (r: SharedSource) => {
        records.set(r.id, structuredClone(r));
        return "story";
      },
      account: async () => ({ connected: true }),
      onEvent: () => () => {},
      cancel: async () => {},
      generate: async () => ({
        files: structuredClone(fixture.line) as Files,
        reply:
          "Daily active users rose from 120 to 160 across the complete three-day sample.",
        threadId: "synthetic-story",
      }),
      compile: async (files: Files) =>
        structuredClone(
          files.manifest.parameters.find((p) => p.id === "chart")?.default ===
            "line"
            ? fixture.compiledLine
            : fixture.compiledBar,
        ) as Compiled,
    });
    return () => {
      Object.assign(bridge, original);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++)
        keys.push(localStorage.key(i)!);
      for (const key of keys)
        if (key.startsWith("folio-")) localStorage.removeItem(key);
      for (const [k, v] of previous) localStorage.setItem(k, v);
    };
  },
} satisfies Meta<typeof App>;
function ReopenableWorkspace() {
  const [epoch, setEpoch] = useState(0);
  return (
    <>
      <App key={epoch} />
      <button
        data-testid="reopen-workspace"
        style={{
          position: "fixed",
          bottom: 4,
          left: 4,
          zIndex: 2000,
          fontSize: 12,
        }}
        onClick={() => setEpoch((v) => v + 1)}
      >
        Reopen workspace (fixture)
      </button>
    </>
  );
}
export default meta;
type Story = StoryObj<typeof meta>;
export const SourceToDocument: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(
      await within(
        canvasElement.querySelector(".workspace-navigation")!,
      ).findByText("workspaces.csv", { exact: true }),
    );
    const composer = await c.findByRole("textbox", {
      name: "Ask about this data",
    });
    await userEvent.type(composer, "Show daily active users as a line chart");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(composer).toHaveValue(""));
    await c.findByText(
      "Daily active users rose from 120 to 160 across the complete three-day sample.",
      {},
      { timeout: 20000 },
    );
    await userEvent.click(
      c.getByRole("button", { name: "Focus visualization" }),
    );
    await userEvent.click(await c.findByRole("tab", { name: "Methodology" }));
    await c.findByText("Columns used");
    await userEvent.click(
      c.getByRole("button", { name: "Return to conversation" }),
    );
    await userEvent.type(
      await c.findByRole("textbox", { name: "Ask about this data" }),
      "Keep this unsent draft",
    );
    await userEvent.click(
      c.getAllByText("Add to document", { exact: true }).at(-1)!,
    );
    const dialog = await body.findByRole("dialog", {
      name: "Add finding to document",
    });
    await userEvent.clear(
      within(dialog).getByRole("textbox", { name: "Finding narrative" }),
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Finding narrative" }),
      "Active users grew by 40 in this sample.",
    );
    await userEvent.click(
      within(dialog).getByText("Add finding", { exact: true }),
    );
    await waitFor(() =>
      expect(canvasElement.querySelector(".prose-editor")).toHaveTextContent(
        "Active users grew by 40 in this sample.",
      ),
    );
    expect(
      canvasElement.querySelectorAll(".prose-editor .analysis-block"),
    ).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: "Close right pane" }));
    const paragraph =
      canvasElement.querySelector<HTMLElement>(".prose-editor > p")!;
    await userEvent.click(paragraph);
    await userEvent.keyboard("A follow-up question.");
    expect(canvasElement.querySelector(".assistant-pane")).toHaveClass(
      "pane-collapsed",
    );
    await userEvent.click(
      within(canvasElement.querySelector(".workspace-navigation")!).getByText(
        "workspaces.csv",
        { exact: true },
      ),
    );
    await expect(
      await c.findByRole("textbox", { name: "Ask about this data" }),
    ).toHaveValue("Keep this unsent draft");
    await waitFor(async () =>
      expect((await bridge.listSources())[0].analysis.prompt).toBe(
        "Keep this unsent draft",
      ),
    );
    await userEvent.click(c.getByTestId("reopen-workspace"));
    await waitFor(() =>
      expect(
        c.getByRole("textbox", { name: "Ask about this data" }),
      ).toHaveValue("Keep this unsent draft"),
    );
    await expect(
      c.getByText(
        "Daily active users rose from 120 to 160 across the complete three-day sample.",
      ),
    ).toBeVisible();
  },
};
function DividerExample() {
  const [width, setWidth] = useState(260);
  return (
    <PaneDivider
      label="Resize navigation"
      value={width}
      min={220}
      max={400}
      onChange={setWidth}
    />
  );
}
export const KeyboardResize: Story = {
  render: () => <DividerExample />,
  play: async ({ canvasElement }) => {
    const divider = within(canvasElement).getByRole("separator");
    divider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "284");
    await userEvent.keyboard("{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "220");
  },
};

export const RevisionCancellation: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(
      await within(
        canvasElement.querySelector(".workspace-navigation")!,
      ).findByText("workspaces.csv", { exact: true }),
    );
    await userEvent.click(
      await c.findByRole("button", {
        name: "Create local exploration",
      }),
    );
    await c.findByText(
      "Created a local exploration from your CSV. No AI request was made.",
      {},
      { timeout: 20000 },
    );
    let working: string | undefined;
    await waitFor(async () => {
      working = (await bridge.listSources())[0].analysis.active;
      expect(working).toBeTruthy();
    });
    let resolve:
      | ((v: Awaited<ReturnType<typeof bridge.generate>>) => void)
      | undefined;
    let cancelled = false;
    bridge.generate = async () =>
      new Promise((r) => {
        resolve = r;
      });
    bridge.cancel = async () => {
      cancelled = true;
      resolve?.({
        files: structuredClone(fixture.line) as Files,
        reply: "Late response must not replace the working chart.",
        threadId: "cancelled-story",
      });
    };
    const prompt = c.getByRole("textbox", { name: "Ask about this data" });
    await userEvent.type(prompt, "Revise the visualization");
    await userEvent.click(c.getByRole("button", { name: "Send request" }));
    await expect(prompt).toHaveValue("");
    await userEvent.click(await c.findByRole("button", { name: "Stop" }));
    await c.findByText(
      "Generation cancelled. Your last working revision is preserved.",
    );
    expect(cancelled).toBe(true);
    await waitFor(async () =>
      expect((await bridge.listSources())[0].analysis.active).toBe(working),
    );
    expect(
      c.queryByText("Late response must not replace the working chart."),
    ).toBeNull();
  },
};
