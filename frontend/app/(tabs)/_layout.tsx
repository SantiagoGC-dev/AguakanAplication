import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const isAdmin = user?.rol === 1;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#539DF3",
        tabBarInactiveTintColor: isDark ? "#888" : "#666",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventario"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="archive" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bitacora"
        options={{
          title: "Bitácora",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="document-text" color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="reportes"
        options={{
          title: "Reportes",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="stats-chart" color={color} />
          ),
          
          href: isAdmin ? "/reportes" : null,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}