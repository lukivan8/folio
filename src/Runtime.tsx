import { useEffect, useRef, useState } from "react";
import type { Compiled, Files, Source, Result } from "./model";
import { validateParams, validateResult } from "./model";
import runtimeCSS from "./styles/runtime.scss?inline";
import chartCSS from "@carbon/charts/styles.css?inline";
import artifactFont from "@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2?inline";
import artifactSemibold from "@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2?inline";
import { bridge, desktop } from "./bridge";
const style =
  chartCSS +
  runtimeCSS +
  `@font-face{font-family:'IBM Plex Sans';src:url("${artifactFont}") format('woff2');font-weight:400;font-display:swap}@font-face{font-family:'IBM Plex Sans';src:url("${artifactSemibold}") format('woff2');font-weight:600;font-display:swap}`;
const bootstrap = `let port,worker,config,lastResult,lastParams,workTimer,requestId=0;window.addEventListener('message',e=>{if(port||!e.ports[0])return;port=e.ports[0];port.onmessage=async e=>{const m=e.data;if(m.type==='init'){config=m;try{const script=document.createElement('script');script.nonce=document.querySelector('meta[name=nonce]').content;script.textContent=m.compiled.view;document.body.appendChild(script);worker=new Worker(URL.createObjectURL(new Blob([m.compiled.worker],{type:'text/javascript'})));worker.onerror=e=>port.postMessage({type:'error',error:e.message});worker.onmessage=e=>{if(e.data.requestId!==undefined&&e.data.requestId!==requestId)return;clearTimeout(workTimer);if(e.data.error)return port.postMessage({type:'error',error:e.data.error});lastResult=e.data.result;try{window.__render(lastResult,lastParams,applyParams);const heading=document.querySelector('#artifact main > h1:first-child, #artifact main > h2:first-child, #artifact main > header > h1:first-child, #artifact main > header > h2:first-child');if(heading)heading.hidden=true;setTimeout(()=>{if(document.getElementById('artifact').childNodes.length)port.postMessage({type:'result',result:lastResult});else port.postMessage({type:'error',error:'The visualization did not mount a visible result.'});},120);}catch(error){port.postMessage({type:'error',error:String(error.message||error)});}};run(m.params);}catch(error){port.postMessage({type:'error',error:String(error.message||error)});}}else if(m.type==='params')run(m.params);};port.start();});function applyParams(patch){lastParams={...lastParams,...patch};window.__render(lastResult,lastParams,applyParams);port.postMessage({type:'params',patch});}function run(params){lastParams=params;clearTimeout(workTimer);workTimer=setTimeout(()=>{worker.terminate();port.postMessage({type:'error',error:'The calculation exceeded 10 seconds. Stop or retry this block.'});},10000);worker.postMessage({sources:config.sources,params,state:{},requestId:++requestId});}window.onerror=(_m,_s,_l,_c,e)=>port?.postMessage({type:'error',error:String(e?.message||_m)});new ResizeObserver(()=>port?.postMessage({type:'resize',height:document.body.scrollHeight})).observe(document.body);setInterval(()=>port?.postMessage({type:'heartbeat'}),1000);`;
export function Runtime({
  compiled,
  files,
  sources,
  params,
  onParams,
  onResult,
  onError,
}: {
  compiled: Compiled;
  files: Files;
  sources: Source[];
  params: Record<string, unknown>;
  onParams: (v: Record<string, unknown>) => void;
  onResult: (r: Result) => void;
  onError: (s: string) => void;
}) {
  const [runtimeUrl, setRuntimeUrl] = useState<string>();
  const [height, setHeight] = useState(470);
  const frame = useRef<HTMLIFrameElement>(null);
  const port = useRef<MessagePort | null>(null);
  const callbacks = useRef({
    onParams,
    onResult,
    onError,
    files,
    sources,
    params,
  });
  callbacks.current = { onParams, onResult, onError, files, sources, params };
  const [nonce] = useState(() => crypto.randomUUID());
  const html = `<!doctype html><html><head><meta name="nonce" content="${nonce}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src blob:; base-uri 'none'; form-action 'none'"><style>${style}</style></head><body><div id="artifact"></div><script nonce="${nonce}">${bootstrap}</script></body></html>`;
  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    let url: string;
    void bridge
      .runtime(html)
      .then((v) => {
        url = v;
        if (cancelled) void bridge.disposeRuntime(v);
        else setRuntimeUrl(v);
      })
      .catch((e) => callbacks.current.onError(e.message));
    return () => {
      cancelled = true;
      if (url) void bridge.disposeRuntime(url);
    };
  }, [html]);
  useEffect(() => {
    let last = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - last > 12000) {
        callbacks.current.onError(
          "Visualization stopped responding. The saved result remains available.",
        );
        port.current?.close();
        frame.current?.setAttribute(
          "srcdoc",
          "<p>Visualization unloaded. Retry to restore.</p>",
        );
        clearInterval(timer);
      }
    }, 2000);
    const load = () => {
      last = Date.now();
      port.current?.close();
      const channel = new MessageChannel();
      port.current = channel.port1;
      channel.port1.onmessage = (e) => {
        last = Date.now();
        const m = e.data;
        if (!m || typeof m !== "object") return;
        try {
          if (m.type === "resize" && Number.isFinite(m.height)) {
            setHeight(Math.max(180, Math.min(3000, m.height)));
          } else if (m.type === "result") {
            if (JSON.stringify(m.result).length > 32 * 1024 * 1024)
              throw Error("Result exceeds the 32 MiB runtime limit");
            validateResult(
              m.result,
              callbacks.current.files,
              callbacks.current.sources,
            );
            callbacks.current.onResult(m.result);
          } else if (m.type === "params") {
            const next = validateParams(callbacks.current.files.manifest, {
              ...callbacks.current.params,
              ...m.patch,
            });
            callbacks.current.onParams(next);
          } else if (m.type === "error")
            callbacks.current.onError(String(m.error).slice(0, 2000));
        } catch (error) {
          callbacks.current.onError((error as Error).message);
        }
      };
      frame.current?.contentWindow?.postMessage({ type: "connect" }, "*", [
        channel.port2,
      ]);
      channel.port1.postMessage({
        type: "init",
        compiled,
        sources: sources.map((s) => ({
          id: s.id,
          revision: s.revision,
          columns: s.columns,
          rows: s.rows,
        })),
        params: validateParams(files.manifest, callbacks.current.params),
      });
    };
    const el = frame.current;
    el?.addEventListener("load", load);
    return () => {
      clearInterval(timer);
      el?.removeEventListener("load", load);
      port.current?.close();
    };
  }, [compiled, files, sources]);
  useEffect(() => {
    port.current?.postMessage({ type: "params", params });
  }, [params]);
  return (
    <iframe
      ref={frame}
      className="artifact-frame"
      style={{ height }}
      title={files.manifest.title + " interactive visualization"}
      sandbox="allow-scripts"
      src={desktop ? runtimeUrl : undefined}
      srcDoc={desktop ? undefined : html}
    />
  );
}
