import { URL as URLPolyfill, URLSearchParams } from 'react-native-url-polyfill';
import 'fastestsmallesttextencoderdecoder';
import 'base-64';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import type { Store } from '@reduxjs/toolkit';
import { LogBox } from 'react-native';
import ExpoAppNavigator from './src/navigation/ExpoAppNavigator';
import { initializeStore } from './src/store';

const _nativeURL = globalThis.URL;
globalThis.URL = URLPolyfill;
globalThis.URLSearchParams = URLSearchParams;
if (_nativeURL?.createObjectURL) globalThis.URL.createObjectURL = _nativeURL.createObjectURL;
if (_nativeURL?.revokeObjectURL) globalThis.URL.revokeObjectURL = _nativeURL.revokeObjectURL;

if (__DEV__) {
  LogBox.ignoreLogs([
    /findNodeHandle is deprecated/,
    /findHostInstance_DEPRECATED is deprecated/,
  ]);

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('findNodeHandle is deprecated') ||
      message.includes('findHostInstance_DEPRECATED is deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [loaded, error] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });

  const initStore = async () => {
    const initializedStore = await initializeStore();
    setStore(initializedStore);
  };

  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      if (error) {
        console.warn(`Error in loading fonts: ${error}`);
      }
    }
  }, [loaded, error]);

  if (!store) {
    return null;
  }

  return (
    <Provider store={store}>
      <ExpoAppNavigator fontsLoaded={loaded || !!error} />
    </Provider>
  );
}