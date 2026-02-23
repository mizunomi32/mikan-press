import type { ModelSpec, Provider } from '../types/index';

export function parseModelSpec(spec: string): ModelSpec {
  const idx = spec.indexOf('/');
  if (idx === -1) throw new Error(`Invalid model spec "${spec}": use "provider/model"`);
  return { provider: spec.slice(0, idx) as Provider, model: spec.slice(idx + 1) };
}

export function resolveModel(envVar: string, defaultSpec: string): string {
  return process.env[envVar] ?? defaultSpec;
}
