import { computeField, type FieldRequest } from './fields';

// Typed loosely to avoid mixing the DOM and WebWorker libs in one program.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; req: FieldRequest }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

ctx.onmessage = (e) => {
  const data = computeField(e.data.req);
  ctx.postMessage({ id: e.data.id, data }, [data.buffer]);
};
