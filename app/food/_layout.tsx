/** Food layout - Stack navigator wrapper for the food management screens. */
import React from 'react';
import { Stack } from 'expo-router';

export default function FoodLayout() {
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
