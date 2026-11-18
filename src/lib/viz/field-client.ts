/**
 * Computes field grids off the main thread (one shared worker), falling back to a
 * synchronous computation when workers are unavailable. Only the latest request of each
 * caller is delivered.
 */
import { computeField, type FieldRequest } from './fields';

let worker: Worker | null | undefined;
let nextId = 0;
const waiting = new Map<number, (d: Float32Array) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./field.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; data: Float32Array }>) => {
      waiting.get(e.data.id)?.(e.data.data);
      waiting.delete(e.data.id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function createFieldClient(onresult: (data: Float32Array) => void) {
  let latest = -1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    /** Debounced request (ms): rapid slider moves only compute the last value. */
    request(req: FieldRequest, debounce = 60) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const id = ++nextId;
        latest = id;
        const w = getWorker();
        if (!w) {
          onresult(computeField(req));
          return;
        }
        waiting.set(id, (d) => id === latest && onresult(d));
        w.postMessage({ id, req });
      }, debounce);
    },
    dispose() {
      clearTimeout(timer);
      latest = -1;
    },
  };
}
