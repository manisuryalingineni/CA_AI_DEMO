import { Stack } from "expo-router";

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,

        animation: "slide_from_right",

        contentStyle: {
          backgroundColor: "#F3F7F9",
        },
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen name="[reportId]" />
    </Stack>
  );
}
