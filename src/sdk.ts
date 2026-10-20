import type { Source, Result, Manifest } from "./model";
export const SDK_VERSION = "1.0.0";
export type BlockContext = {
  sources: Pick<Source, "id" | "revision" | "columns" | "rows">[];
  params: Record<string, string | number | boolean>;
  state: unknown;
};
export type AnalysisResult = Result;
export type ArtifactManifest = Manifest;
export type ViewProps = {
  result: AnalysisResult;
  params: BlockContext["params"];
  setParams: (patch: Partial<BlockContext["params"]>) => void;
};

export { carbon } from "./design-system";
