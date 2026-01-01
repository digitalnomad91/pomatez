import {
  activateFullScreenShortcuts,
  deactivateFullScreenShortcuts,
} from "../helpers";
import { BrowserWindow, Menu, Tray, screen, Display } from "electron";

export type FullscreenState = {
  isFullscreen: boolean;
};

type FullscreenArgs = {
  shouldFullscreen: boolean;
  alwaysOnTop: boolean;
  displayIds?: number[];
};

type AppArgs = {
  tray: Tray | null;
  trayTooltip: string;
  win: BrowserWindow | null;
  contextMenu: Menu;
  isFullscreen: FullscreenState["isFullscreen"];
  overlayWindows?: Map<number, BrowserWindow>;
};

const setFullScreen = (
  flag: boolean,
  alwaysOnTop: boolean,
  win: BrowserWindow | null,
  isFullscreen: FullscreenState["isFullscreen"]
) => {
  win?.setResizable(flag);
  win?.setFullScreenable(true);
  win?.setAlwaysOnTop(alwaysOnTop, "screen-saver");
  win?.setSkipTaskbar(flag);
  win?.setFullScreen(flag);
  win?.setVisibleOnAllWorkspaces(flag);
  win?.show();
  win?.focus();

  isFullscreen = flag;
};

const closeOverlayWindows = (overlays?: Map<number, BrowserWindow>) => {
  overlays?.forEach((overlay) => {
    overlay.close();
  });
  overlays?.clear();
};

const syncOverlayWindows = (
  displays: Display[],
  mainWindowDisplayId: number | undefined,
  alwaysOnTop: boolean,
  overlays?: Map<number, BrowserWindow>
) => {
  if (!overlays) return;

  const targetIds = displays.map((display) => display.id);

  overlays.forEach((overlay, id) => {
    if (!targetIds.includes(id)) {
      overlay.close();
      overlays.delete(id);
    }
  });

  displays.forEach((display) => {
    if (display.id === mainWindowDisplayId) return;

    if (overlays.has(display.id)) {
      overlays.get(display.id)?.setAlwaysOnTop(alwaysOnTop, "screen-saver");
      return;
    }

    const overlay = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreen: true,
      skipTaskbar: true,
      focusable: false,
      show: false,
      backgroundColor: "#0b1d30",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    overlay.setFullScreenable(true);
    overlay.setAlwaysOnTop(alwaysOnTop, "screen-saver");
    overlay.setFullScreen(true);
    overlay.setVisibleOnAllWorkspaces(true);

    const html = encodeURIComponent(
      `<style>body{margin:0;padding:0;background:#0b1d30;color:#fff;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;letter-spacing:0.02em;}</style><div>Break in progress</div>`
    );

    overlay.loadURL(`data:text/html;charset=utf-8,${html}`);
    overlay.once("ready-to-show", () => overlay.show());

    overlays.set(display.id, overlay);
  });
};

/**
 * Handles the event of the main app SET_FULLSCREEN_BREAK
 *
 * @param fullscreenArgs
 * @param appArgs
 */
export const setFullscreenBreakHandler = (
  fullscreenArgs: FullscreenArgs,
  appArgs: AppArgs
) => {
  const { shouldFullscreen, alwaysOnTop } = fullscreenArgs;
  const { tray, trayTooltip, win, contextMenu, isFullscreen, overlayWindows } =
    appArgs;

  const availableDisplays = screen.getAllDisplays();
  const currentDisplay =
    win && availableDisplays.length
      ? screen.getDisplayMatching(win.getBounds())
      : undefined;

  const targetDisplays =
    fullscreenArgs.displayIds && fullscreenArgs.displayIds.length
      ? availableDisplays.filter((display) =>
          fullscreenArgs.displayIds?.includes(display.id)
        )
      : currentDisplay
      ? [currentDisplay]
      : availableDisplays.length
      ? [availableDisplays[0]]
      : [];

  const resolvedTargets =
    targetDisplays.length > 0
      ? targetDisplays
      : currentDisplay
      ? [currentDisplay]
      : availableDisplays.length
      ? [availableDisplays[0]]
      : [];

  const primaryDisplay = resolvedTargets[0];

  if (shouldFullscreen) {
    if (
      win &&
      primaryDisplay &&
      (!currentDisplay || primaryDisplay.id !== currentDisplay.id)
    ) {
      win.setBounds(primaryDisplay.bounds);
    }

    setFullScreen(true, alwaysOnTop, win, isFullscreen);

    activateFullScreenShortcuts(() => {});

    tray?.setToolTip("");
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Please wait for your break to end.",
        },
      ])
    );

    syncOverlayWindows(
      resolvedTargets,
      primaryDisplay?.id,
      alwaysOnTop,
      overlayWindows
    );
  } else {
    setFullScreen(false, alwaysOnTop, win, isFullscreen);
    closeOverlayWindows(overlayWindows);

    deactivateFullScreenShortcuts();
    tray?.setToolTip(trayTooltip);
    tray?.setContextMenu(contextMenu);
  }
};
