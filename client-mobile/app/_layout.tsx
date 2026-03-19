import { theme } from "@/constants/theme";
import { AuthProvider } from "@/context/AuthContext";
import { ReportProvider } from "@/context/ReportContext";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReportProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
        />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { fontWeight: "600", fontSize: 17 },
            contentStyle: { backgroundColor: theme.colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="admin-login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="report" options={{ title: "Sorun Bildir" }} />
          <Stack.Screen
            name="history"
            options={{ title: "Bekleyen Taleplerim" }}
          />
          <Stack.Screen name="map" options={{ title: "Harita" }} />
        </Stack>
      </ReportProvider>
    </AuthProvider>
  );
}
