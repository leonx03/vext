/** Splits layout - Stack navigator wrapper for split planning screens. */
import React from 'react';
import { Stack } from 'expo-router';

export default function SplitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'rgb(10, 10, 15)' },
        animation: 'slide_from_right',
      }}
    />
  );
}
