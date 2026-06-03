import { useCallback, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { Direction } from '@bam.tech/lrud';
import { useMenuContext, scaledPixels, ExploreScreen, TVScreen, SettingsScreen, CustomDrawerContent } from '@multi-tv/shared-ui';
import ExpoHomeScreen from '../screens/ExpoHomeScreen';
import { ExpoDrawerParamList } from './types';

const Drawer = createDrawerNavigator<ExpoDrawerParamList>();

function DrawerSyncWrapper() {
  const { isOpen: isMenuOpen } = useMenuContext();
  const navigation = useNavigation();

  useEffect(() => {
    if (isMenuOpen) {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  }, []);

  return null;
}

export default function ExpoDrawerNavigator() {
  const styles = drawerStyles;
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const navigation = useNavigation();

  const onDirectionHandledWithoutMovement = useCallback(
    (movement: Direction) => {
      if (movement === 'right') {
        navigation.dispatch(DrawerActions.closeDrawer());
        toggleMenu(false);
      }
    },
    [toggleMenu, navigation],
  );

  const navigationContent = (
    <View style={{ flex: 1 }}>
      <SpatialNavigationRoot
        isActive={isMenuOpen}
        onDirectionHandledWithoutMovement={onDirectionHandledWithoutMovement}
      >
        <Drawer.Navigator
          drawerContent={CustomDrawerContent}
          initialRouteName="Home"
          defaultStatus="open"
          screenOptions={{
            headerShown: false,
            drawerActiveBackgroundColor: '#3498db',
            drawerActiveTintColor: '#ffffff',
            drawerInactiveTintColor: '#bdc3c7',
            drawerStyle: styles.drawerStyle,
            drawerLabelStyle: styles.drawerLabelStyle,
            drawerType: 'front',
            swipeEnabled: false,
            animationEnabled: false,
          }}
        >
          <Drawer.Screen
            name="Home"
            component={ExpoHomeScreen}
            options={{
              drawerLabel: 'Home',
            }}
          />
          <Drawer.Screen
            name="Explore"
            component={ExploreScreen}
            options={{
              drawerLabel: 'Explore',
            }}
          />
          <Drawer.Screen
            name="TV"
            component={TVScreen}
            options={{
              drawerLabel: 'TV',
            }}
          />
          <Drawer.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              drawerLabel: 'Settings',
            }}
          />
        </Drawer.Navigator>
        <DrawerSyncWrapper />
      </SpatialNavigationRoot>
    </View>
  );

  if (Platform.isTV) {
    return <View style={{ flex: 1 }}>{navigationContent}</View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {navigationContent}
    </GestureHandlerRootView>
  );
}

const drawerStyles = StyleSheet.create({
    drawerStyle: {
      width: scaledPixels(300),
      backgroundColor: '#2c3e50',
      paddingTop: scaledPixels(0),
    },
    drawerLabelStyle: {
      fontSize: scaledPixels(18),
      fontWeight: 'bold',
      marginLeft: scaledPixels(10),
    },
  });