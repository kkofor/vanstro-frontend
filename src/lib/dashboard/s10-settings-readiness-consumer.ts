export type S10ReadinessTimerScheduler<Handle = ReturnType<typeof setTimeout>> = {
  set(callback: () => void, delayMs: number): Handle;
  clear(handle: Handle): void;
};

export type S10ReadinessConsumer<Handle = ReturnType<typeof setTimeout>> = {
  install(generation: number, reload: () => void): number;
  appliedGeneration(): number | null;
  dispose(): void;
};

/** Installs the published generation after the Privacy/Retention settings
 *  projection is applied. The cleanup consumer is missing by contract, so
 *  readiness is always reported degraded and the consumer never fakes ready. */
export function createS10ReadinessConsumer<Handle>(scheduler: S10ReadinessTimerScheduler<Handle>): S10ReadinessConsumer<Handle> {
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
      if (!Number.isSafeInteger(nextGeneration) || nextGeneration < 0 || nextGeneration > 2147483647) throw new TypeError("Invalid S10 published generation.");
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
