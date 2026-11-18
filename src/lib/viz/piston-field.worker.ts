import { computePistonField, type PistonGrid } from './piston-field';

// Typed loosely to avoid mixing the DOM and WebWorker libs in one program.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<PistonGrid & { id: number }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

ctx.onmessage = (e) => {
  const data = computePistonField(e.data);
  ctx.postMessage({ id: e.data.id, data }, [data.buffer]);
};
