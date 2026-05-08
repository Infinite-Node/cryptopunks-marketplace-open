// React 19's `use()` reads a thenable's `status`/`value` fields synchronously
// when status is "fulfilled" — no Suspense round-trip needed. This helper
// fakes that shape so tests don't have to chase React's microtask scheduler.
export function resolved<T>(value: T): Promise<T> {
  return {
    status: "fulfilled",
    value,
    then(onFulfilled: (v: T) => unknown) {
      onFulfilled(value);
    },
  } as unknown as Promise<T>;
}
