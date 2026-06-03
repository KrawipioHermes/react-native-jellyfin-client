import React, { useEffect, useState } from 'react';
import type { Store } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import VegaAppNavigator from './navigation/VegaAppNavigator';
import { initializeStore } from './store';

export const App = () => {
  const [store, setStore] = useState<Store | null>(null);

  const initStore = async () => {
    const initializedStore = await initializeStore();
    setStore(initializedStore);
  };

  useEffect(() => {
    initStore();
  }, []);

  if (!store) {
    return null;
  }

  return (
    <Provider store={store}>
      <VegaAppNavigator fontsLoaded={true} />
    </Provider>
  );
};