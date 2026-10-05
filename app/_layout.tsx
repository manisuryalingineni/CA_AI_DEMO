import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, 
        }}
      />
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="pos"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="activity-audit"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="invoice-preview"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      />
    </Stack>
  );
} 