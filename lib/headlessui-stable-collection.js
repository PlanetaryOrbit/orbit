const { createContext, createElement, useContext, useEffect, useId, useRef } = require('react');

const StableCollectionContext = createContext(null);

function createCollection() {
  return {
    groups: new Map(),
    get(group, key) {
      let groupMap = this.groups.get(group);
      if (!groupMap) {
        groupMap = new Map();
        this.groups.set(group, groupMap);
      }

      const count = groupMap.get(key) ?? 0;
      groupMap.set(key, count + 1);
      const index = Array.from(groupMap.keys()).indexOf(key);

      function cleanup() {
        const current = groupMap.get(key);
        if (current > 1) groupMap.set(key, current - 1);
        else groupMap.delete(key);
      }

      return [index, cleanup];
    },
  };
}

function StableCollection({ children }) {
  const collection = useRef(createCollection());
  return createElement(StableCollectionContext.Provider, { value: collection }, children);
}

function useStableCollectionIndex(group) {
  const collection = useContext(StableCollectionContext);
  if (!collection) {
    throw new Error('You must wrap your component in a <StableCollection>');
  }

  const key = useId();
  const [index, cleanup] = collection.current.get(group, key);
  useEffect(() => cleanup, []);
  return index;
}

module.exports = { StableCollection, useStableCollectionIndex };
