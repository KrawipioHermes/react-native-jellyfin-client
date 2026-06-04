import mitt from 'mitt';
import type { HWEvent } from 'react-native';
import { SupportedKeys } from './SupportedKeys';
import { RemoteControlManagerInterface } from './RemoteControlManager.interface';

// Map Vega/Kepler HWEvent eventType to SupportedKeys
const EVENT_TYPE_MAPPING: Record<string, SupportedKeys> = {
  left: SupportedKeys.Left,
  right: SupportedKeys.Right,
  down: SupportedKeys.Down,
  up: SupportedKeys.Up,
  select: SupportedKeys.Enter,
  back: SupportedKeys.Back,
  playpause: SupportedKeys.PlayPause,
  skip_backward: SupportedKeys.Rewind,
  skip_forward: SupportedKeys.FastForward,
};

class RemoteControlManager implements RemoteControlManagerInterface {
  private eventEmitter = mitt<{ keyDown: SupportedKeys; keyUp: SupportedKeys }>();
  private tvEventHandler: any;

  constructor() {
    // Initialize TVEventHandler for Vega/Kepler platform
    // Import dynamically to avoid issues with types
    const { TVEventHandler } = require('react-native');
    this.tvEventHandler = new TVEventHandler();
    this.tvEventHandler.enable(this, this.handleHWEvent);
    console.log('[RemoteControlManager.kepler] TVEventHandler enabled');
  }

  private handleHWEvent = (_component: any, event: HWEvent): void => {
    // eventKeyAction: 0 = KEY_DOWN, 1 = KEY_UP, -1 = default
    const mappedKey = EVENT_TYPE_MAPPING[event.eventType];
    if (!mappedKey) return;

    if (event.eventKeyAction === 0 || event.eventKeyAction === undefined) {
      console.log(`[Kepler] Key down: ${mappedKey} (eventType: ${event.eventType})`);
      this.eventEmitter.emit('keyDown', mappedKey);
    } else if (event.eventKeyAction === 1) {
      console.log(`[Kepler] Key up: ${mappedKey} (eventType: ${event.eventType})`);
      this.eventEmitter.emit('keyUp', mappedKey);
    }
  };

  addKeydownListener = (listener: (event: SupportedKeys) => void): (() => void) => {
    this.eventEmitter.on('keyDown', listener);
    console.log('[RemoteControlManager.kepler] Key listener added');
    return () => this.eventEmitter.off('keyDown', listener);
  };

  removeKeydownListener = (listener: (event: SupportedKeys) => void): void => {
    this.eventEmitter.off('keyDown', listener);
    console.log('[RemoteControlManager.kepler] Key listener removed');
  };

  addKeyupListener = (listener: (event: SupportedKeys) => void): (() => void) => {
    this.eventEmitter.on('keyUp', listener);
    console.log('[RemoteControlManager.kepler] Key up listener added');
    return () => this.eventEmitter.off('keyUp', listener);
  };

  removeKeyupListener = (listener: (event: SupportedKeys) => void): void => {
    this.eventEmitter.off('keyUp', listener);
    console.log('[RemoteControlManager.kepler] Key up listener removed');
  };

  emitKeyDown = (key: SupportedKeys): void => {
    this.eventEmitter.emit('keyDown', key);
  };

  cleanup = (): void => {
    this.tvEventHandler.disable();
    console.log('[RemoteControlManager.kepler] TVEventHandler disabled');
  };
}

export default new RemoteControlManager();
