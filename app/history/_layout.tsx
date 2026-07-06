/** History layout - Stack navigator wrapper for the workout history screen. */
import React from 'react';
import { Stack } from 'expo-router';

export default function HistoryLayout() {
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
