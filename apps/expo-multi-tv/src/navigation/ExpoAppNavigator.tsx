import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { MenuProvider, GoBackConfiguration } from '@multi-tv/shared-ui';
import ExpoRootNavigator from './ExpoRootNavigator';

export interface ExpoAppNavigatorProps {
  fontsLoaded?: boolean;
  onReady?: () => void;
}

export default function ExpoAppNavigator({ fontsLoaded = true, onReady }: ExpoAppNavigatorProps) {
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
    <NavigationContainer theme={DarkTheme}>
      <MenuProvider>
        <GoBackConfiguration />
        <ExpoRootNavigator />
      </MenuProvider>
    </NavigationContainer>
  );
}