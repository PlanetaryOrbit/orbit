import { Temporal } from 'temporal-polyfill';

export default defineNitroPlugin(() => {
  Object.defineProperty(globalThis, 'Temporal', {
    value: Temporal,
    writable: true,
    configurable: true,
    enumerable: true,
  });
});
