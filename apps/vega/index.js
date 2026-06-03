import { URL as URLPolyfill, URLSearchParams } from 'react-native-url-polyfill';
import 'fastestsmallesttextencoderdecoder';
import 'base-64';

import { AppRegistry, LogBox } from 'react-native';
import { App } from './src/App';
import { name as appName } from './app.json';

// Install WHATWG URL polyfill for Jellyfin SDK, preserving native
// createObjectURL/revokeObjectURL that Shaka needs for MSE playback
const _nativeURL = globalThis.URL;
globalThis.URL = URLPolyfill;
globalThis.URLSearchParams = URLSearchParams;
if (_nativeURL?.createObjectURL) globalThis.URL.createObjectURL = _nativeURL.createObjectURL;
if (_nativeURL?.revokeObjectURL) globalThis.URL.revokeObjectURL = _nativeURL.revokeObjectURL;

LogBox.ignoreAllLogs();

AppRegistry.registerComponent(appName, () => App);
