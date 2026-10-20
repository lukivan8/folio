import { createContext, useContext } from "react";
import type { DataBlock, Source } from "./model";
import type { SharedSource } from "./library";
export type Workspace = {
  blocks: Record<string, DataBlock>;
  updateBlock: (
    id: string,
    update: Partial<DataBlock> | ((b: DataBlock) => DataBlock),
  ) => void;
  duplicateBlock: (id: string) => string;
  notify: (s: string) => void;
  readOnly: boolean;
  docId: string;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  assistantHost?: HTMLElement | null;
  focusHost?: HTMLElement | null;
  paneMode?: "assistant" | "focus";
  openFocus?: (id: string) => void;
  library?: SharedSource[];
  registerSource?: (source: Source) => Source;
  onAddToDocument?: (block: DataBlock) => void;
  sourceView?: boolean;
};
export const WorkspaceContext = createContext<Workspace | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext)!;
