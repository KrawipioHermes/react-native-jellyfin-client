import { SupportedKeys } from './SupportedKeys';

// Define a type for the listener function
export type KeydownListener = (event: SupportedKeys) => void;
export type KeyupListener = (event: SupportedKeys) => void;

export interface RemoteControlManagerInterface {
  addKeydownListener(listener: KeydownListener): () => void;
  removeKeydownListener(listener: KeydownListener): void;
  addKeyupListener(listener: KeyupListener): () => void;
  removeKeyupListener(listener: KeyupListener): void;
  emitKeyDown(key: SupportedKeys): void;
}