import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/tasks/DashboardScreen';
import CalendarScreen from '../screens/tasks/CalendarScreen';
import RemindersScreen from '../screens/reminders/RemindersScreen';
import ExpensesScreen from '../screens/expenses/ExpensesScreen';
import ResumeScreen from '../screens/resume/ResumeScreen';

const C = {
  primary: '#6C5CE7',
  primaryLight: '#EAE8FF',
  bg: '#FFFFFF',
  border: '#F3F4F6',
  gray: '#9CA3AF',
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Reminders: undefined;
  Expenses: undefined;
  Resume: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard: { active: '⊞', inactive: '⊟' },
  Calendar:  { active: '📅', inactive: '🗓' },
  Reminders: { active: '🔔', inactive: '🔕' },
  Expenses:  { active: '💳', inactive: '💰' },
  Resume:    { active: '📋', inactive: '📄' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icon = TAB_ICONS[name] ?? { active: '●', inactive: '○' };
  return (
    <View style={tabStyles.iconContainer}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
        {focused ? icon.active : icon.inactive}
      </Text>
      {focused && <View style={tabStyles.activeDot} />}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.gray,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.label,
        tabBarItemStyle: tabStyles.tabItem,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ tabBarLabel: 'Reminders' }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{ tabBarLabel: 'Expenses' }}
      />
      <Tab.Screen
        name="Resume"
        component={ResumeScreen}
        options={{ tabBarLabel: 'Resume' }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { accessToken } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {accessToken ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
    fontSize: 22,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.primary,
    marginTop: 3,
  },
});
