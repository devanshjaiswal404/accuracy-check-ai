import { getInspection } from "./inspections.functions";

export type ProbeCall = ReturnType<(typeof getInspection)>;
type UnwrapFn = typeof getInspection extends (...args: never[]) => infer R ? R : never;
export type ProbeAwaited = Awaited<UnwrapFn>;
export const _probe: ProbeAwaited | null = null;
