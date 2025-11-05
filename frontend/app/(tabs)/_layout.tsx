import { Tabs } from "expo-router";
import React from "react";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StyleSheet, View, Text } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#539DF3",
        tabBarInactiveTintColor: isDark ? "#888" : "#666",
        tabBarStyle: {
          backgroundColor: isDark ? "#1c1c1e" : "#fff",
          borderTopColor: isDark ? "#333" : "#eee",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Poppins_500Medium",
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <IconSymbol 
                size={26} 
                name="house.fill" 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventario"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <IconSymbol 
                size={26} 
                name="archivebox.fill" 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bitacora"
        options={{
          title: "Bitácora",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <IconSymbol 
                size={26} 
                name="newspaper.fill" 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: "Reportes",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <IconSymbol 
                size={26} 
                name="doc.text.fill" 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <IconSymbol 
                size={26} 
                name="person.fill" 
                color={color} 
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    top: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#539DF3",
  },
});