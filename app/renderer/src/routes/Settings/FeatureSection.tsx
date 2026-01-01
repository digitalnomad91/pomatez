import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components/macro";
import isElectron from "is-electron";
import { availableMonitors } from "@tauri-apps/plugin-window";
import { useAppDispatch, useAppSelector } from "hooks/storeHooks";
import {
  setAlwaysOnTop,
  setEnableStrictMode,
  setEnableProgressAnimation,
  setNotificationType,
  setEnableFullscreenBreak,
  setFullscreenBreakMonitors,
  setUseNativeTitlebar,
  setAutoStartWorkTime,
  setMinimizeToTray,
  setCloseToTray,
  setEnableVoiceAssistance,
  setEnableCompactMode,
  setOpenAtLogin,
  setEnableRPC,
  setFollowSystemTheme,
} from "store";
import { Checkbox, Toggler, TogglerProps, Collapse, Radio } from "components";
import { ThemeContext } from "contexts";

import SettingSection from "./SettingSection";
import { detectOS } from "utils";
import { NotificationTypes } from "store/settings/types";
import { AVAILABLE_DISPLAYS, GET_DISPLAYS } from "@pomatez/shareables";

type MonitorOption = {
  id: number;
  label: string;
};

const FeatureSection: React.FC = () => {
  const settings = useAppSelector((state) => state.settings);

  const dispatch = useAppDispatch();

  const { isDarkMode, toggleThemeAction } = useContext(ThemeContext);

  const [monitors, setMonitors] = useState<MonitorOption[]>([]);

  useEffect(() => {
    let isMounted = true;

    const updateMonitors = (list: MonitorOption[]) => {
      if (!isMounted) return;
      setMonitors(list);
    };

    if (isElectron() && (window as any).electron) {
      (window as any).electron.receive?.(
        AVAILABLE_DISPLAYS,
        (payload: MonitorOption[]) => {
          updateMonitors(payload);
        }
      );
      (window as any).electron.send?.(GET_DISPLAYS);
    } else if ((window as any).__TAURI__) {
      availableMonitors()
        .then((list) => {
          updateMonitors(
            list.map((monitor, index) => ({
              id: index,
              label:
                monitor.name ||
                `Display ${index + 1} (${monitor.size.width}x${
                  monitor.size.height
                })`,
            }))
          );
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settings.enableFullscreenBreak || monitors.length === 0) {
      return;
    }

    const availableIds = monitors.map((monitor) => monitor.id);

    if (settings.fullscreenBreakMonitors.length === 0) {
      dispatch(setFullscreenBreakMonitors(availableIds));
      return;
    }

    const filteredIds = settings.fullscreenBreakMonitors.filter((id) =>
      availableIds.includes(id)
    );

    if (filteredIds.length !== settings.fullscreenBreakMonitors.length) {
      dispatch(
        setFullscreenBreakMonitors(
          filteredIds.length ? filteredIds : availableIds
        )
      );
    }
  }, [
    dispatch,
    monitors,
    settings.enableFullscreenBreak,
    settings.fullscreenBreakMonitors,
  ]);

  const toggleFullscreenBreak = useCallback(() => {
    const nextValue = !settings.enableFullscreenBreak;
    if (nextValue) {
      if (settings.fullscreenBreakMonitors.length === 0) {
        dispatch(
          setFullscreenBreakMonitors(
            monitors.length > 0
              ? monitors.map((monitor) => monitor.id)
              : [0]
          )
        );
      }
    }
    dispatch(setEnableFullscreenBreak(nextValue));
  }, [
    dispatch,
    monitors,
    settings.enableFullscreenBreak,
    settings.fullscreenBreakMonitors.length,
  ]);

  const onToggleMonitor = useCallback(
    (id: number) => {
      const isSelected = settings.fullscreenBreakMonitors.includes(id);
      let updatedSelection = isSelected
        ? settings.fullscreenBreakMonitors.filter(
            (monitorId) => monitorId !== id
          )
        : [...settings.fullscreenBreakMonitors, id];

      if (settings.enableFullscreenBreak && updatedSelection.length === 0) {
        updatedSelection = [id];
      }

      dispatch(setFullscreenBreakMonitors(updatedSelection));
    },
    [
      dispatch,
      settings.enableFullscreenBreak,
      settings.fullscreenBreakMonitors,
    ]
  );

  const monitorOptions = useMemo(
    () =>
      monitors.length
        ? monitors
        : [
            {
              id: 0,
              label: "Current display",
            },
          ],
    [monitors]
  );

  const monitorSelectionDisabled = !settings.enableFullscreenBreak;

  const featureList: TogglerProps[] = [
    {
      id: "always-on-top",
      label: "Always On Top",
      checked: settings.alwaysOnTop,
      onChange: useCallback(() => {
        dispatch(setAlwaysOnTop(!settings.alwaysOnTop));
      }, [dispatch, settings.alwaysOnTop]),
    },
    {
      id: "compact-mode",
      label: "Compact Mode",
      checked: settings.compactMode,
      onChange: useCallback(() => {
        dispatch(setEnableCompactMode(!settings.compactMode));
      }, [dispatch, settings.compactMode]),
    },
    {
      id: "fullscreen-break",
      label: "Fullscreen Break",
      checked: settings.enableFullscreenBreak,
      onChange: toggleFullscreenBreak,
    },
    {
      id: "strict-mode",
      label: "Strict Mode",
      checked: settings.enableStrictMode,
      onChange: useCallback(() => {
        dispatch(setEnableStrictMode(!settings.enableStrictMode));
      }, [dispatch, settings.enableStrictMode]),
    },
    {
      id: "dark-theme",
      label: "Dark Theme",
      checked: isDarkMode,
      disabled: settings.followSystemTheme,
      onChange: () => {
        if (toggleThemeAction) {
          toggleThemeAction();
        }
      },
    },
    {
      id: "follow-system-theme",
      label: "Follow System Theme",
      checked: settings.followSystemTheme,
      onChange: useCallback(() => {
        dispatch(setFollowSystemTheme(!settings.followSystemTheme));
      }, [dispatch, settings.followSystemTheme]),
    },
    {
      id: "native-titlebar",
      label: "Native Titlebar",
      checked: settings.useNativeTitlebar,
      onChange: useCallback(() => {
        dispatch(setUseNativeTitlebar(!settings.useNativeTitlebar));
      }, [dispatch, settings.useNativeTitlebar]),
    },
    {
      id: "progress-animation",
      label: "Progress Animation",
      checked: settings.enableProgressAnimation,
      onChange: useCallback(() => {
        dispatch(
          setEnableProgressAnimation(!settings.enableProgressAnimation)
        );
      }, [dispatch, settings.enableProgressAnimation]),
    },
    {
      id: "auto-start-work-time",
      label: "Auto-start Work Time",
      checked: settings.autoStartWorkTime,
      onChange: useCallback(() => {
        dispatch(setAutoStartWorkTime(!settings.autoStartWorkTime));
      }, [dispatch, settings.autoStartWorkTime]),
    },
    {
      id: "minimize-to-tray",
      label: "Minimize To Tray",
      checked: settings.minimizeToTray,
      onChange: useCallback(() => {
        dispatch(setMinimizeToTray(!settings.minimizeToTray));
      }, [dispatch, settings.minimizeToTray]),
    },
    {
      id: "close-to-tray",
      label: "Close To Tray",
      checked: settings.closeToTray,
      onChange: useCallback(() => {
        dispatch(setCloseToTray(!settings.closeToTray));
      }, [dispatch, settings.closeToTray]),
    },
    {
      id: "voice-assistance",
      label: "Voice Assistance",
      checked: settings.enableVoiceAssistance,
      onChange: useCallback(() => {
        dispatch(
          setEnableVoiceAssistance(!settings.enableVoiceAssistance)
        );
      }, [dispatch, settings.enableVoiceAssistance]),
    },
    {
      id: "open-at-login",
      label: "Open At Login",
      checked: settings.openAtLogin,
      onChange: useCallback(() => {
        dispatch(setOpenAtLogin(!settings.openAtLogin));
      }, [dispatch, settings.openAtLogin]),
      style: {
        ...(detectOS() === "Linux" && {
          display: "none",
        }),
      },
    },
    {
      id: "enable-rpc",
      label: "Enable Rich Presence",
      checked: settings.enableRPC,
      onChange: useCallback(() => {
        dispatch(setEnableRPC(!settings.enableRPC));
      }, [dispatch, settings.enableRPC]),
    },
  ];

  const onChangeNotificationProps = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setNotificationType(e.target.value as NotificationTypes)
      );
    },
    [dispatch]
  );

  return (
    <SettingSection heading="App Features">
      {featureList.map(
        (
          { id, label, checked, onChange, disabled = false, ...rest },
          index
        ) => (
          <Toggler
            id={id}
            key={index}
            label={label}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            {...rest}
          />
        )
      )}
      {settings.enableFullscreenBreak && (
        <StyledMonitorWrapper>
          <StyledMonitorHeader>
            <span>Fullscreen Break Monitors</span>
            {monitorSelectionDisabled && (
              <StyledMonitorHint>Disabled</StyledMonitorHint>
            )}
          </StyledMonitorHeader>
          {monitorOptions.length ? (
            <StyledMonitorList aria-disabled={monitorSelectionDisabled}>
              {monitorOptions.map((monitor) => (
                <Checkbox
                  key={monitor.id}
                  id={`fullscreen-monitor-${monitor.id}`}
                  label={monitor.label}
                  checked={settings.fullscreenBreakMonitors.includes(
                    monitor.id
                  )}
                  disabled={monitorSelectionDisabled}
                  onChange={() => onToggleMonitor(monitor.id)}
                />
              ))}
            </StyledMonitorList>
          ) : (
            <StyledMonitorHint>No monitors detected.</StyledMonitorHint>
          )}
        </StyledMonitorWrapper>
      )}
      <Collapse>
        <Radio
          id="none"
          label="none"
          name="notification"
          value={NotificationTypes.NONE}
          checked={settings.notificationType === NotificationTypes.NONE}
          onChange={onChangeNotificationProps}
        />
        <Radio
          id="normal"
          label="normal"
          name="notification"
          value={NotificationTypes.NORMAL}
          checked={
            settings.notificationType === NotificationTypes.NORMAL
          }
          onChange={onChangeNotificationProps}
        />
        <Radio
          id="extra"
          label="extra"
          name="notification"
          value={NotificationTypes.EXTRA}
          checked={
            settings.notificationType === NotificationTypes.EXTRA
          }
          onChange={onChangeNotificationProps}
        />
      </Collapse>
    </SettingSection>
  );
};

const StyledMonitorWrapper = styled.div`
  padding: 0.6rem 0 0.8rem;
  border-bottom: 0.1rem solid var(--color-border-secondary);
`;

const StyledMonitorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  font-weight: 500;
`;

const StyledMonitorList = styled.div`
  display: grid;
  gap: 0.35rem;
`;

const StyledMonitorHint = styled.small`
  display: block;
  margin-top: 0.25rem;
  color: var(--color-disabled-text);
`;

export default FeatureSection;
