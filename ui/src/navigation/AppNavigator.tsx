import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PoolListScreen from '../screens/PoolListScreen';
import PoolDetailScreen from '../screens/PoolDetailScreen';
import LaneAvailabilityScreen from '../screens/LaneAvailabilityScreen';
import { TopNav } from '../components/TopNav';
import { theme } from '../theme';

export type RootStackParamList = {
  Tabs: undefined;
  PoolDetail: undefined;
};

export type TabParamList = {
  PoolList: undefined;
  Availability: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <Tab.Navigator
      initialRouteName="Availability"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundGradientEnd,
          borderTopColor: theme.colors.cardBorder,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="PoolList"
        component={PoolListScreen}
        options={{
          title: 'Pools',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="pool" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Availability"
        component={LaneAvailabilityScreen}
        options={{
          title: 'Lanes',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="view-column" size={24} color={color} />
          ),
        }}
      />
      </Tab.Navigator>
    </View>
  );
}

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.backgroundGradientEnd,
    text: theme.colors.textPrimary,
    border: theme.colors.cardBorder,
    notification: theme.colors.primary,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={customDarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.backgroundGradientEnd,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PoolDetail"
          component={PoolDetailScreen}
          options={{ title: 'Pool Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
