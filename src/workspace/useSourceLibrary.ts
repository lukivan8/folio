import { useCallback, useEffect, useRef, useState } from "react";
import { bridge } from "../bridge";
import { sourceWorkspace, type SharedSource } from "../library";
import type { Source } from "../model";
export function useSourceLibrary(notify: (s: string) => void) {
  const [status, setStatus] = useState("Local source snapshot");
  const [sources, setSources] = useState<SharedSource[]>([]);
  const current = useRef(sources);
  const dirty = useRef(new Map<string, number>());
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) {
      await saving.current;
      return;
    }
    saving.current = (async () => {
      while (dirty.current.size) {
        const [id, version] = dirty.current.entries().next().value!;
        const record = current.current.find((s) => s.id === id)!;
        try {
          const diskVersion = await bridge.saveSource(record);
          current.current = current.current.map((s) =>
            s.id === id ? { ...s, diskVersion } : s,
          );
          setSources(current.current);
          if (dirty.current.get(id) === version) dirty.current.delete(id);
        } catch (e) {
          setStatus("Source not saved");
          notify("Shared source is not saved: " + (e as Error).message);
          break;
        }
      }
      if (!dirty.current.size) setStatus("Source saved locally");
    })().finally(() => {
      saving.current = null;
    });
    await saving.current;
  }, [notify]);
  const update = useCallback(
    (id: string, fn: (r: SharedSource) => SharedSource) => {
      current.current = current.current.map((r) =>
        r.id === id ? { ...fn(r), updated: new Date().toISOString() } : r,
      );
      dirty.current.set(id, (dirty.current.get(id) || 0) + 1);
      setStatus("Saving source…");
      setSources(current.current);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 400);
    },
    [flush],
  );
  const register = useCallback(
    (source: Source) => {
      const sameIdentity = current.current.find((r) => r.id === source.id);
      if (sameIdentity) {
        update(source.id, (r) => ({
          ...r,
          source,
          analysis: {
            ...r.analysis,
            sources: r.analysis.sources.map((s) =>
              s.id === source.id ? source : s,
            ),
          },
        }));
        return { ...sameIdentity, source };
      }
      const old = current.current.find(
        (r) =>
          r.source.hash === source.hash &&
          r.source.header === source.header &&
          r.source.delimiter === source.delimiter,
      );
      if (old) return old;
      const record = sourceWorkspace(source);
      current.current = [...current.current, record];
      setSources(current.current);
      dirty.current.set(record.id, 1);
      setStatus("Saving source…");
      void flush();
      return record;
    },
    [flush, update],
  );
  useEffect(() => {
    let alive = true;
    void bridge
      .listSources()
      .then((records) => {
        if (alive) {
          current.current = [
            ...records.filter(
              (r) => !current.current.some((c) => c.id === r.id),
            ),
            ...current.current,
          ];
          setSources(current.current);
        }
      })
      .catch((e) => notify(e.message));
    return () => {
      alive = false;
      clearTimeout(timer.current);
      void flush();
    };
  }, [notify, flush]);
  useEffect(
    () =>
      bridge.onEvent((e) => {
        if (e.type === "closing") void flush();
      }),
    [flush],
  );
  return { sources, status, update, register, flush };
}
