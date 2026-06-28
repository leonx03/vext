/**
 * useGymGate - gates a workout-start action behind a gym choice.
 *
 * When there are 2+ active gyms, calling `gate(onChosen)` opens a picker (nothing
 * pre-selected) and invokes `onChosen(gymId)` once the user picks. With a single gym it
 * calls `onChosen(undefined)` immediately and the service falls back to the default gym.
 * Render the returned `gymGate` element somewhere in the screen.
 */
import React, { useCallback, useState } from 'react';
import { SelectPicker } from '@frontend/components/overlay/SelectPicker';
import { useGyms } from '@frontend/hooks/useGyms';

type OnChosen = (gymId?: string) => void;

export function useGymGate() {
  const { data: gyms } = useGyms();
  const [pending, setPending] = useState<{ onChosen: OnChosen } | null>(null);

  const gate = useCallback(
    (onChosen: OnChosen) => {
      if ((gyms?.length ?? 0) >= 2) {
        setPending({ onChosen });
      } else {
        onChosen(undefined);
      }
    },
    [gyms]
  );

  const gymGate = (
    <SelectPicker
      visible={pending !== null}
      title="Which gym?"
      options={(gyms ?? []).map((g) => ({ label: g.name, value: g.id }))}
      onSelect={(gymId) => {
        const cb = pending?.onChosen;
        setPending(null);
        cb?.(gymId);
      }}
      onClose={() => setPending(null)}
    />
  );

  return { gate, gymGate };
}
