import { bridge } from "./bridge";
let active: string | undefined;
const jobs: {
  id: string;
  task: () => Promise<void>;
  cancelled: boolean;
  start: () => void;
  finish: () => void;
}[] = [];
async function pump() {
  if (active) return;
  const next = jobs.shift();
  if (!next) return;
  if (next.cancelled) {
    next.finish();
    pump();
    return;
  }
  active = next.id;
  next.start();
  try {
    await next.task();
  } finally {
    active = undefined;
    next.finish();
    pump();
  }
}
export function enqueue(
  id: string,
  task: () => Promise<void>,
  start: () => void,
  finish: () => void,
) {
  const job = { id, task, start, finish, cancelled: false };
  jobs.push(job);
  void pump();
  return () => {
    job.cancelled = true;
    if (active === id) void bridge.cancel();
    else finish();
  };
}
