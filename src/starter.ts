import type { Files, Source } from "./model";
export function starter(s: Source): Files {
  const numeric = s.columns.find((c) => c.type === "number");
  const group =
    s.columns.find((c) => c.type === "date") ||
    s.columns.find((c) => c.type === "text") ||
    s.columns[0];
  const value = numeric?.id || "";
  return {
    manifest: {
      version: 1,
      title: "Explore " + s.name.replace(/\.csv$/i, ""),
      sourceIds: [s.id],
      parameters: [
        { id: "search", label: "Filter groups", type: "string", default: "" },
        {
          id: "aggregation",
          label: "Aggregation",
          type: "string",
          default: numeric ? "sum" : "count",
          options: numeric ? ["sum", "average", "count"] : ["count"],
        },
        {
          id: "chart",
          label: "Chart style",
          type: "string",
          default: "bar",
          options: ["bar", "line"],
        },
      ],
      methods: [
        {
          id: "aggregate",
          title: "Group and aggregate",
          description: `Group all accepted rows by ${group?.label || "row"}. Filter matching groups locally.`,
          columns: [group?.id, value].filter(Boolean),
          formula: numeric
            ? "Sum / average of valid numeric values, or row count, per group."
            : "Count rows per group. This is a row count, not distinct users.",
          units: numeric?.label || "rows",
          missing:
            "Blank groups appear as (missing). Blank numeric values are excluded from numeric aggregation and counted in exclusions.",
          assumptions:
            "No deduplication. Dates remain source calendar dates. Search is case-insensitive. Imported types and delimiter are user-confirmed.",
          outputs: ["summary"],
        },
      ],
    },
    analysis: `export async function analyze(ctx){const s=ctx.sources.find(s=>s.id===${JSON.stringify(s.id)});const g=s.columns.findIndex(c=>c.id===${JSON.stringify(group?.id)});const v=s.columns.findIndex(c=>c.id===${JSON.stringify(value)});const groups=new Map();let included=0,excluded=0;for(const row of s.rows){const key=row[g]||'(missing)';if(!key.toLowerCase().includes(String(ctx.params.search||'').toLowerCase())){excluded++;continue;}const mode=ctx.params.aggregation||'count';if(mode!=='count'&&(v<0||row[v].trim()===''||!Number.isFinite(Number(row[v])))){excluded++;continue;}const a=groups.get(key)||{sum:0,n:0};a.sum+=v<0?0:Number(row[v]);a.n++;groups.set(key,a);included++;}const rows=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,a])=>[key,ctx.params.aggregation==='average'?a.sum/a.n:ctx.params.aggregation==='sum'?a.sum:a.n]);return {datasets:{summary:{columns:[${JSON.stringify(group?.label || "Group")},ctx.params.aggregation==='count'?'Rows':${JSON.stringify(numeric?.label || "Rows")}],rows,methodId:'aggregate',units:ctx.params.aggregation==='count'?'rows':${JSON.stringify(numeric?.label || "rows")}}},inputRows:s.rows.length,includedRows:included,excludedRows:excluded,warnings:[],checks:[]};}`,
    checks: `export function checks(result,ctx){const table=result.datasets.summary;const s=ctx.sources[0];return [{name:'All source rows accounted for',passed:result.includedRows+result.excludedRows===s.rows.length},{name:'Finite aggregate values',passed:table.rows.every(r=>Number.isFinite(r[1]))},{name:'One output per group',passed:new Set(table.rows.map(r=>r[0])).size===table.rows.length}];}`,
    view: `import React from 'react';import{SimpleBarChart,LineChart,ScaleTypes}from'@carbon/charts-react';import{TextInput,Select,SelectItem}from'@carbon/react';import{carbon}from'@folio/sdk';export function View({result,params,setParams}){const t=result.datasets.summary;const dateAxis=${group?.type === "date"}&&t.rows.every(r=>/^\\d{4}-\\d{2}-\\d{2}$/.test(String(r[0])));const data=t.rows.map(r=>({group:t.columns[1],key:dateAxis?new Date(String(r[0])+'T00:00:00'):String(r[0]),value:Number(r[1])}));const Chart=params.chart==='line'?LineChart:SimpleBarChart;const options={...carbon.chartOptions,height:'320px',axes:{bottom:{mapsTo:'key',scaleType:dateAxis?ScaleTypes.TIME:ScaleTypes.LABELS,title:t.columns[0],ticks:{number:5}},left:{mapsTo:'value',scaleType:ScaleTypes.LINEAR,title:t.units||t.columns[1]}},legend:{enabled:false},accessibility:{svgAriaLabel:t.columns[1]+' by '+t.columns[0]}};return <main><div className="controls"><TextInput id="filter-groups" size="sm" labelText="Filter groups" value={String(params.search||'')} placeholder="Search…" onChange={e=>setParams({search:e.target.value})}/><Select id="aggregation" size="sm" labelText="Aggregation" value={String(params.aggregation)} onChange={e=>setParams({aggregation:e.target.value})}>${numeric ? '<SelectItem value="sum" text="Sum"/><SelectItem value="average" text="Average"/>' : ""}<SelectItem value="count" text="Row count"/></Select><Select id="chart-style" size="sm" labelText="Chart" value={String(params.chart)} onChange={e=>setParams({chart:e.target.value})}><SelectItem value="bar" text="Bars"/><SelectItem value="line" text="Line"/></Select></div><p className="analysis-notes"><span>${group?.label || "Group"} · {t.columns[1]} · {params.aggregation}</span><span>{result.includedRows.toLocaleString()} included rows · {result.excludedRows.toLocaleString()} excluded</span><span>{params.search?'Filter: '+params.search:'All groups'}</span><span>{data.length?${group?.type === "date" ? "<>Date range: <time dateTime={String(t.rows[0][0])}>{String(t.rows[0][0])}</time> – <time dateTime={String(t.rows[t.rows.length-1][0])}>{String(t.rows[t.rows.length-1][0])}</time></>" : "data.length+' groups'"}:'No matching groups'}</span>{t.rows.some(r=>String(r[0]).startsWith(new Date().toISOString().slice(0,10)))&&<span>Current period may be incomplete.</span>}</p>{!data.length?<p role="status">No rows match these filters.</p>:<Chart data={data} options={options}/>}<p className="analysis-notes">Source-reported values; no deduplication. Row count counts records, not distinct people.</p></main>;}`,
  };
}
