import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Pagination,
  Search as CarbonSearch,
  Checkbox,
  ContentSwitcher,
  Switch,
  Accordion,
  AccordionItem,
  Dropdown,
} from "@carbon/react";
import { Notice } from "./components/ui/Notice";
import { SelectItem } from "@carbon/react";
import { TextField, SelectField } from "./components/ui/Fields";
import { useId, useState } from "react";
import {
  DataBase as Database,
  Download,
  Csv as FileSpreadsheet,
  Checkmark as Check,
  Renew as RefreshCw,
  WarningAlt as AlertCircle,
} from "@carbon/react/icons";
import {
  type DataBlock,
  type Source,
  type Result,
  type Revision,
  safeCSV,
  uid,
} from "./model";
import { Button, Badge, download } from "./ui";
import { importCSV } from "./import";
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: unknown[][];
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const filtered = search
    ? rows.filter((r) =>
        r.some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      )
    : rows;
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const p = Math.min(page, pages - 1);
  return (
    <>
      <div className="table-controls">
        <CarbonSearch
          size="sm"
          labelText="Search table"
          aria-label="Search table"
          placeholder="Search all rows…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <span>
          {filtered.length.toLocaleString()} rows · {columns.length} columns
        </span>
      </div>
      <div className="table-scroll">
        <Table size="sm" aria-label="Source and result data">
          <TableHead>
            <TableRow>
              <TableHeader className="row-number">#</TableHeader>
              {columns.map((c, i) => (
                <TableHeader key={i}>{c || `Column ${i + 1}`}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(p * 50, p * 50 + 50).map((r, i) => (
              <TableRow key={i}>
                <TableCell className="row-number">{p * 50 + i + 1}</TableCell>
                {r.map((v, j) => (
                  <TableCell key={j}>
                    {v === null || v === "" ? (
                      <span className="null">empty</span>
                    ) : (
                      String(v)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <p className="empty-table">No matching rows</p>}
      </div>
      <Pagination
        size="sm"
        page={p + 1}
        pageSize={50}
        pageSizes={[50]}
        totalItems={filtered.length}
        pageSizeInputDisabled
        itemsPerPageText="Rows per page:"
        onChange={({ page }) => setPage(page - 1)}
      />
    </>
  );
}
export function SourcesPanel({
  block,
  revision,
  onUpdate,
  onConfirm,
  onAdd,
  onReplace,
}: {
  block: DataBlock;
  revision?: Revision;
  onUpdate: (s: Source) => void;
  onConfirm: (s: Source) => void;
  onAdd: () => void;
  onReplace: (id: string) => void;
}) {
  const controlId = useId();
  const [selected, setSelected] = useState(block.sources[0]?.id);
  const [mode, setMode] = useState("raw");
  const [error, setError] = useState("");
  const s = block.sources.find((v) => v.id === selected) || block.sources[0];
  async function reparse(delimiter: string, header: boolean) {
    if (!s) return;
    try {
      const bytes = Uint8Array.from(atob(s.original), (c) => c.charCodeAt(0));
      const next = await importCSV(bytes, s.name, {
        delimiter,
        header,
        id: s.id,
      });
      onUpdate(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="inspector-content">
      <div className="section-toolbar">
        <p>Original files are copied into this document.</p>
        <Button renderIcon={FileSpreadsheet} kind="tertiary" onClick={onAdd}>
          Add CSV
        </Button>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {!s ? (
        <div className="empty-state">
          <Database size={32} />
          <h3>No sources yet</h3>
          <p>Attach a CSV to begin your analysis.</p>
        </div>
      ) : (
        <>
          {block.sources.length > 1 && (
            <Dropdown
              id={controlId + "source"}
              titleText="Source"
              label="Choose a source"
              size="sm"
              items={block.sources}
              selectedItem={s}
              itemToString={(source) => source?.name || ""}
              onChange={({ selectedItem }) =>
                selectedItem && setSelected(selectedItem.id)
              }
            />
          )}
          <div className="source-info">
            <div>
              <h3>{s.name}</h3>
              <p>
                {s.rows.length.toLocaleString()} rows · {s.columns.length}{" "}
                columns · {(s.bytes / 1024).toFixed(1)} KB
              </p>
            </div>
            <Badge tone={s.confirmed ? "success" : "warning"}>
              {s.confirmed ? "Parse confirmed" : "Review parsing"}
            </Badge>
          </div>
          <div className="metadata-grid">
            <span>
              Source revision<strong>{s.revision.slice(0, 8)}</strong>
            </span>
            <span>
              Imported<strong>{new Date(s.imported).toLocaleString()}</strong>
            </span>
            <span>
              Used by active artifact
              <strong>
                {revision?.sourceRefs.includes(s.revision)
                  ? "Yes"
                  : "Not this revision"}
              </strong>
            </span>
            <span>
              SHA-256<strong title={s.hash}>{s.hash.slice(0, 16)}…</strong>
            </span>
          </div>
          <div className="parse-settings">
            <div>
              Delimiter
              <SelectField
                aria-label="Delimiter"
                value={s.delimiter}
                onChange={(e) => void reparse(e.target.value, s.header)}
              >
                <SelectItem value="," text={"Comma"} />
                <SelectItem value=";" text={"Semicolon"} />
                <SelectItem value={"\t"} text={"Tab"} />
              </SelectField>
            </div>
            <Checkbox
              id={controlId + "header"}
              checked={s.header}
              labelText="First row is a header"
              onChange={(_event, { checked }) =>
                void reparse(s.delimiter, checked)
              }
            />
            <span>UTF-8 · date-only values have no timezone</span>
          </div>
          <p className="muted">
            Empty physical lines are skipped. Delimited empty records and
            missing fields are preserved.
          </p>
          {s.warnings.map((w, i) => (
            <Notice kind="warning" key={i}>
              <AlertCircle size={16} />
              {w}
            </Notice>
          ))}
          <Accordion size="sm">
            <AccordionItem title="Column schema and missing-value rules">
              <div className="schema-list">
                {s.columns.map((c) => (
                  <div key={c.id}>
                    <span>
                      <strong>{c.label}</strong>
                      <small>
                        {c.id} · original: {c.original || "(empty)"}
                      </small>
                    </span>
                    <SelectField
                      aria-label={"Type for " + c.label}
                      value={c.type}
                      onChange={(e) => {
                        const type = e.target.value as
                          | "text"
                          | "number"
                          | "date";
                        const idx = s.columns.indexOf(c);
                        const invalid = s.rows.filter(
                          (r) =>
                            r[idx] !== "" &&
                            (type === "number"
                              ? !/^-?(?:\d+\.?\d*|\.\d+)$/.test(r[idx])
                              : type === "date"
                                ? !/^\d{4}-\d{2}-\d{2}$/.test(r[idx])
                                : false),
                        );
                        if (invalid.length) {
                          setError(
                            `${invalid.length} values cannot be parsed as ${type}. First value: ${invalid[0][idx]}`,
                          );
                          return;
                        }
                        onUpdate({
                          ...s,
                          revision: uid(),
                          confirmed: false,
                          columns: s.columns.map((v) =>
                            v.id === c.id ? { ...v, type } : v,
                          ),
                        });
                      }}
                    >
                      <SelectItem value="text" text={"Text"} />
                      <SelectItem value="number" text={"Number"} />
                      <SelectItem value="date" text={"ISO date"} />
                    </SelectField>
                    <small>Empty string → missing</small>
                  </div>
                ))}
              </div>
            </AccordionItem>
          </Accordion>
          <ContentSwitcher
            size="sm"
            selectedIndex={mode === "raw" ? 0 : 1}
            aria-label="Source data format"
            onChange={({ index }) => setMode(index === 0 ? "raw" : "typed")}
          >
            <Switch name="raw" text="Raw data" />
            <Switch name="typed" text="Typed preview" />
          </ContentSwitcher>
          <DataTable
            key={s.revision + mode}
            columns={s.columns.map((c) => c.label)}
            rows={
              mode === "raw"
                ? s.rows
                : s.rows.map((r) =>
                    r.map((v, i) =>
                      v === ""
                        ? null
                        : s.columns[i].type === "number"
                          ? Number(v)
                          : v,
                    ),
                  )
            }
          />
          <div className="source-actions">
            <Button
              renderIcon={Download}
              onClick={() => {
                const bytes = Uint8Array.from(atob(s.original), (c) =>
                  c.charCodeAt(0),
                );
                download(s.name, bytes);
              }}
            >
              Original CSV
            </Button>
            <Button renderIcon={RefreshCw} onClick={() => onReplace(s.id)}>
              Replace CSV
            </Button>
            <Button
              renderIcon={Check}
              kind="primary"
              onClick={() => onConfirm({ ...s, confirmed: true })}
            >
              {s.confirmed ? "Confirm settings" : "Accept parsing"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function MethodPanel({
  revision,
  params,
}: {
  revision?: Revision;
  params: Record<string, unknown>;
}) {
  if (!revision)
    return (
      <div className="empty-state">
        <p>Methodology appears with a working artifact.</p>
      </div>
    );
  return (
    <div className="inspector-content">
      <div className="section-toolbar">
        <p>
          From revision {revision.id.slice(0, 8)} ·{" "}
          {new Date(revision.created).toLocaleString()}
        </p>
        <Badge tone="success">Checks passed</Badge>
      </div>
      <p className="muted">
        Checks are supporting evidence, not independent verification of the
        analysis.
      </p>
      {revision.files.manifest.methods.map((m, i) => (
        <section className="method-step" key={m.id}>
          <span className="step-number">{i + 1}</span>
          <div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <dl>
              <dt>Columns used</dt>
              <dd>{m.columns.join(", ") || "All rows"}</dd>
              <dt>Calculation</dt>
              <dd>{m.formula}</dd>
              <dt>Units</dt>
              <dd>{m.units}</dd>
              <dt>Missing & excluded rows</dt>
              <dd>{m.missing}</dd>
              <dt>Assumptions</dt>
              <dd>{m.assumptions}</dd>
              <dt>Output datasets</dt>
              <dd>{m.outputs.join(", ")}</dd>
            </dl>
          </div>
        </section>
      ))}
      <h3>Current parameters</h3>
      <dl className="params-list">
        {Object.entries(params).map(([k, v]) => (
          <div key={k}>
            <dt>
              {revision.files.manifest.parameters.find((p) => p.id === k)
                ?.label || k}
            </dt>
            <dd>{String(v) || "(empty)"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
export function ResultsPanel({ result }: { result?: Result }) {
  if (!result)
    return (
      <div className="empty-state">
        <p>No result dataset yet.</p>
      </div>
    );
  return (
    <div className="inspector-content">
      <div className="metadata-grid">
        <span>
          Input rows<strong>{result.inputRows.toLocaleString()}</strong>
        </span>
        <span>
          Included<strong>{result.includedRows.toLocaleString()}</strong>
        </span>
        <span>
          Excluded<strong>{result.excludedRows.toLocaleString()}</strong>
        </span>
      </div>
      {result.warnings.map((w, i) => (
        <Notice kind="warning" key={i}>
          {w}
        </Notice>
      ))}
      {Object.entries(result.datasets).map(([name, t]) => (
        <section key={name}>
          <div className="section-toolbar">
            <h3>
              {name}
              <span className="muted"> · {t.units || "source units"}</span>
            </h3>
            <Button
              renderIcon={Download}
              onClick={() => download(name + ".csv", safeCSV(t))}
            >
              Export CSV
            </Button>
          </div>
          <p className="muted">
            Produced by method “{t.methodId}”. Formula-like cells are escaped
            for spreadsheet safety.
          </p>
          <DataTable columns={t.columns} rows={t.rows} />
        </section>
      ))}
    </div>
  );
}
export function RunPanel({
  revision,
  result,
}: {
  revision?: Revision;
  result?: Result;
}) {
  if (!revision) return <p className="empty-state">No completed runs.</p>;
  return (
    <div className="inspector-content">
      <h3>Run details</h3>
      <dl className="run-details">
        <dt>Artifact revision</dt>
        <dd>{revision.id}</dd>
        <dt>Created</dt>
        <dd>{new Date(revision.created).toLocaleString()}</dd>
        <dt>Runtime</dt>
        <dd>{revision.run.runtime}</dd>
        <dt>Duration</dt>
        <dd>{revision.run.duration} ms</dd>
        <dt>Artifact hash</dt>
        <dd>{revision.run.hash}</dd>
        <dt>Source revisions</dt>
        <dd>
          {revision.sources
            .map((s) => s.name + " · " + s.revision + " · SHA-256 " + s.hash)
            .join("\n")}
        </dd>
      </dl>
      <h3>Analytical checks</h3>
      {(result || revision.result).checks.map((c, i) => (
        <p className={c.passed ? "check-pass" : "error"} key={i}>
          {c.passed ? "✓" : "×"} {c.name}
        </p>
      ))}
    </div>
  );
}
