import { Temporal } from 'temporal-polyfill';

export default defineNitroPlugin(() => {
  Object.defineProperty(globalThis, 'Temporal', {
    value: Temporal,
    writable: true,
    configurable: true,
    enumerable: true,
  });

  console.log(
    '[TEMPORAL]',
    typeof globalThis.Temporal,
    globalThis.Temporal.Now.instant().toString(),
  );
});
