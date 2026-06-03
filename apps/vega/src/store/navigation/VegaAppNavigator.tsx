import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@amazon-devices/react-navigation__native';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from '@amazon-devices/react-native-gesture-handler';
import { MenuProvider } from '@multi-tv/shared-ui';
import VegaRootNavigator from './VegaRootNavigator';

export interface VegaAppNavigatorProps {
  fontsLoaded?: boolean;
  onReady?: () => void;
}

export default function VegaAppNavigator({ fontsLoaded = true, onReady }: VegaAppNavigatorProps) {
  useEffect(() => {
    if (Platform.isTV) {
      try {
        require('@multi-tv/shared-ui/src/app/configureRemoteControl');
      } catch (error) {
        console.warn('Remote control configuration not available:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded && onReady) {
      onReady();
    }
  }, [fontsLoaded, onReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={DarkTheme}>
        <MenuProvider>
          <VegaRootNavigator />
        </MenuProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
