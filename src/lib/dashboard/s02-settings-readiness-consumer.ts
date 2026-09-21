export type S02ReadinessTimerScheduler<Handle = ReturnType<typeof setTimeout>> = {
  set(callback: () => void, delayMs: number): Handle;
  clear(handle: Handle): void;
};

export type S02ReadinessConsumer<Handle = ReturnType<typeof setTimeout>> = {
  install(generation: number, reload: () => void): number;
  appliedGeneration(): number | null;
  dispose(): void;
};

/** Installs the published generation after the storefront projection is
 *  applied, then fences a later authoritative confirmation so only the
 *  current installation may report readiness. */
export function createS02ReadinessConsumer<Handle>(scheduler: S02ReadinessTimerScheduler<Handle>): S02ReadinessConsumer<Handle> {
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
    install(nextGeneration, reload) {
      if (!Number.isSafeInteger(nextGeneration) || nextGeneration < 0 || nextGeneration > 2147483647) throw new TypeError("Invalid S02 published generation.");
      dispose();
      const currentInstallation = installation;
      timer = scheduler.set(() => {
        if (currentInstallation === installation) reload();
      }, 30000);
      generation = nextGeneration;
      return nextGeneration;
    },
    appliedGeneration: () => generation,
    dispose
  };
}
