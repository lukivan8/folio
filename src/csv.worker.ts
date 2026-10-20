import { parseCSV } from "./csv";
self.onmessage = async (e) => {
  try {
    self.postMessage({
      source: await parseCSV(e.data.bytes, e.data.name, e.data.options),
    });
  } catch (error) {
    self.postMessage({ error: String((error as Error).message) });
  }
};
