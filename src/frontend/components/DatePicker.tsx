/** DatePicker - modal month-grid calendar for picking a single date (YYYY-MM-DD). */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Weekday index of the 1st, Monday-first (0 = Mon … 6 = Sun). */
function getFirstWeekday(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function todayKey(): string {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

type Props = {
  visible: boolean;
  /** Selected date, YYYY-MM-DD. */
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

export function DatePicker({ visible, value, onSelect, onClose }: Props) {
  const [vy, vm] = value.split('-').map(Number);
  const [year, setYear] = useState(vy || new Date().getFullYear());
  const [month, setMonth] = useState(vm || new Date().getMonth() + 1);

  // Jump the calendar to the selected date's month each time it opens.
  useEffect(() => {
    if (!visible) return;
    const [y, m] = value.split('-').map(Number);
    if (y && m) { setYear(y); setMonth(m); }
  }, [visible, value]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const today = todayKey();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={onClose}>
        <Pressable className="mx-6 w-full max-w-sm rounded-2xl bg-background-50 p-4" onPress={(e) => e.stopPropagation()}>
          {/* Month navigation */}
          <View className="flex-row items-center justify-between mb-3">
            <Pressable onPress={prevMonth} className="p-2 rounded-lg bg-background-100">
              <Ionicons name="chevron-back" size={18} color="rgb(163, 163, 163)" />
            </Pressable>
            <Text className="text-base font-semibold text-foreground">{MONTH_NAMES[month - 1]} {year}</Text>
            <Pressable onPress={nextMonth} className="p-2 rounded-lg bg-background-100">
              <Ionicons name="chevron-forward" size={18} color="rgb(163, 163, 163)" />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="flex-row mb-1">
            {WEEKDAYS.map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-xs font-medium text-foreground-subtle">{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {rows.map((row, ri) => (
            <View key={ri} className="flex-row mb-1">
              {row.map((day, ci) => {
                if (day === null) return <View key={ci} className="flex-1 aspect-square" />;
                const key = dateKey(year, month, day);
                const isSelected = key === value;
                const isToday = key === today;
                return (
                  <Pressable
                    key={ci}
                    onPress={() => onSelect(key)}
                    className="flex-1 aspect-square items-center justify-center mx-0.5 rounded-lg"
                    style={isSelected ? { backgroundColor: 'rgb(52, 211, 153)' } : isToday ? { backgroundColor: 'rgba(52, 211, 153, 0.15)' } : undefined}
                  >
                    <Text className={`text-sm font-medium ${isSelected ? 'text-background' : isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
