import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExpoRootStackParamList } from './types';
import ExpoDrawerNavigator from './ExpoDrawerNavigator';
import JellyfinLoginScreen from '../screens/JellyfinLoginScreen';
import JellyfinStorage from '../services/jellyfin/JellyfinStorage';
import { DetailsScreen, PlayerScreen } from '@multi-tv/shared-ui';

const Stack = createNativeStackNavigator<ExpoRootStackParamList>();

export default function ExpoRootNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    JellyfinStorage.loadAuth().then(auth => {
      setInitialRoute(auth ? 'Main' : 'JellyfinLogin');
    });
  }, []);

  if (!initialRoute) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute as keyof ExpoRootStackParamList}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="JellyfinLogin" component={JellyfinLoginScreen} />
      <Stack.Screen name="Main" component={ExpoDrawerNavigator} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
    </Stack.Navigator>
  );
}