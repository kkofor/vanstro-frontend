export type SettingsReadinessTimerScheduler<Handle = ReturnType<typeof setTimeout>> = {
  set(callback: () => void, delayMs: number): Handle;
  clear(handle: Handle): void;
};

export type SettingsReadinessConsumer<Handle = ReturnType<typeof setTimeout>> = {
  install(generation: number, refreshSeconds: number, reload: () => void): number;
  appliedGeneration(): number | null;
  dispose(): void;
};

export function createSettingsReadinessConsumer<Handle>(scheduler: SettingsReadinessTimerScheduler<Handle>): SettingsReadinessConsumer<Handle> {
  let timer: Handle | undefined;
  let generation: number | null = null;
  let installation = 0;

  const dispose = () => {
    installation += 1;
    if (timer !== undefined) scheduler.clear(timer);
    timer = undefined;
    generation = null;
  };

  return {
    install(nextGeneration, refreshSeconds, reload) {
      if (!Number.isSafeInteger(nextGeneration) || nextGeneration < 0 || nextGeneration > 2147483647) throw new TypeError("Invalid Settings published generation.");
      if (!Number.isSafeInteger(refreshSeconds) || refreshSeconds < 15 || refreshSeconds > 300) throw new TypeError("Invalid Settings refresh interval.");
      dispose();
      const currentInstallation = installation;
      timer = scheduler.set(() => {
        if (currentInstallation === installation) reload();
      }, refreshSeconds * 1000);
      generation = nextGeneration;
      return nextGeneration;
    },
    appliedGeneration: () => generation,
    dispose
  };
}
