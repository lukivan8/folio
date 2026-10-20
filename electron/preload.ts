import { contextBridge, ipcRenderer } from "electron";
const call =
  (name: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke("folio:" + name, ...args);
contextBridge.exposeInMainWorld("folio", {
  listSources: call("listSources"),
  saveSource: call("saveSource"),
  list: call("list"),
  load: call("load"),
  save: call("save"),
  openFolder: call("openFolder"),
  reveal: call("reveal"),
  exportCopy: call("exportCopy"),
  compile: call("compile"),
  runtime: call("runtime"),
  disposeRuntime: call("disposeRuntime"),
  account: call("account"),
  login: call("login"),
  generate: call("generate"),
  cancel: call("cancel"),
  onEvent: (callback: (v: unknown) => void) => {
    const listener = (_e: unknown, v: unknown) => callback(v);
    ipcRenderer.on("folio:event", listener);
    return () => ipcRenderer.removeListener("folio:event", listener);
  },
});
