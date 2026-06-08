let counter = 0;

/**
 * A process-unique, collision-resistant id. Mixes a timestamp, a per-process
 * counter, AND randomness so it stays unique even across parallel workers (a
 * timestamp+counter alone collides when two workers generate one in the same
 * millisecond — the exact bug behind an earlier flaky slug). Centralizing it here
 * means every place that needs unique test data uses the same proven recipe.
 */
export function uniqueId(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e9)}`;
}
