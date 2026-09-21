export type TiledeskCommand = (...args: unknown[]) => void;

export type TiledeskWindow = Window & {
  Tiledesk?: TiledeskCommand & {
    q?: unknown[][];
    c?: (args: unknown[]) => void;
    __vanstroQueued?: true;
  };
  tiledeskSettings?: Record<string, unknown>;
  tiledesk?: unknown;
  tiledeskWidget?: unknown;
};

const TILEDESK_ELEMENT_SELECTOR =
  '[id^="tiledesk"], [class*="tiledesk"], iframe[src*="tiledesk.com"], script[src*="tiledesk.com"]';

export function createTiledeskLoadGuard() {
  let generation = 0;

  return {
    begin() {
      const currentGeneration = ++generation;
      return () => currentGeneration === generation;
    },
    invalidate() {
      generation += 1;
    }
  };
}

export function createQueuedTiledesk(windowRef: TiledeskWindow) {
  if (windowRef.Tiledesk) return;

  const queuedCommand = ((...args: unknown[]) => {
    queuedCommand.c?.(args);
  }) as NonNullable<TiledeskWindow["Tiledesk"]>;

  queuedCommand.q = [];
  queuedCommand.c = (args: unknown[]) => {
    queuedCommand.q?.push(args);
  };
  queuedCommand.__vanstroQueued = true;

  windowRef.Tiledesk = queuedCommand;
}

export function isTiledeskSdkReady(windowRef: TiledeskWindow) {
  return typeof windowRef.Tiledesk === "function" && windowRef.Tiledesk.__vanstroQueued !== true;
}

export function teardownTiledesk(
  windowRef: TiledeskWindow,
  documentRef: Document = document
) {
  try {
    windowRef.Tiledesk?.("hide");
    windowRef.Tiledesk?.("destroy");
  } catch {
    // A partially loaded third-party SDK must not block consent withdrawal.
  }

  documentRef
    .querySelectorAll<HTMLScriptElement>("script#tiledesk-jssdk, script[src*='tiledesk.com']")
    .forEach((script) => script.remove());
  documentRef.querySelectorAll(TILEDESK_ELEMENT_SELECTOR).forEach((element) => element.remove());

  delete windowRef.Tiledesk;
  delete windowRef.tiledeskSettings;
  delete windowRef.tiledesk;
  delete windowRef.tiledeskWidget;
}
