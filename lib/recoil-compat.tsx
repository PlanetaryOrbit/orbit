import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export interface AtomOptions<T> {
  key: string;
  default: T;
}

export interface RecoilState<T> extends AtomOptions<T> {
  readonly __recoilBrand?: (value: T) => T;
}

export function atom<T>(options: AtomOptions<T>): RecoilState<T> {
  return options;
}

type Listener = () => void;
type Setter<T> = (value: T | ((current: T) => T)) => void;

class Store {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<Listener>>();

  get<T>(node: RecoilState<T>): T {
    if (!this.values.has(node.key)) {
      this.values.set(node.key, node.default);
    }
    return this.values.get(node.key) as T;
  }

  set<T>(node: RecoilState<T>, value: T | ((current: T) => T)): void {
    const current = this.get(node);
    const next = typeof value === 'function' ? (value as (current: T) => T)(current) : value;

    if (Object.is(current, next)) return;

    this.values.set(node.key, next);
    this.listeners.get(node.key)?.forEach((listener) => listener());
  }

  subscribe<T>(node: RecoilState<T>, listener: Listener): () => void {
    let subscribers = this.listeners.get(node.key);
    if (!subscribers) {
      subscribers = new Set();
      this.listeners.set(node.key, subscribers);
    }
    subscribers.add(listener);

    return () => {
      subscribers?.delete(listener);
    };
  }
}

const StoreContext = createContext<Store | null>(null);
const fallbackStore = new Store();

function useStore(): Store {
  return useContext(StoreContext) ?? fallbackStore;
}

export function RecoilRoot({ children }: { children?: ReactNode }) {
  const storeRef = useRef<Store | null>(null);
  if (!storeRef.current) storeRef.current = new Store();

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}

export function useRecoilValue<T>(node: RecoilState<T>): T {
  const store = useStore();
  const subscribe = useCallback(
    (listener: Listener) => store.subscribe(node, listener),
    [store, node],
  );
  const getSnapshot = useCallback(() => store.get(node), [store, node]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSetRecoilState<T>(node: RecoilState<T>): Setter<T> {
  const store = useStore();
  return useCallback((value: T | ((current: T) => T)) => store.set(node, value), [store, node]);
}

export function useRecoilState<T>(node: RecoilState<T>): [T, Setter<T>] {
  return [useRecoilValue(node), useSetRecoilState(node)];
}
