import React from "react";
import isElectron from "is-electron";
import {
  ElectronConnectorProvider,
  ElectronInvokeConnector,
} from "./connectors/ElectronConnector";
import {
  TauriConnectorProvider,
  TauriInvokeConnector,
} from "./connectors/TauriConnector";

export type ConnectorProps = {
  onMinimizeCallback?: () => void;
  onExitCallback?: () => void;
  openExternalCallback?: () => void;
};

const isOverlayWindow =
  typeof window !== "undefined" &&
  window.location.search.includes("overlay=1");

export const ConnnectorContext = React.createContext<ConnectorProps>(
  {}
);

export function getInvokeConnector() {
  if (isOverlayWindow) {
    return undefined;
  }
  if (isElectron()) {
    return ElectronInvokeConnector;
  } else if (window.__TAURI__) {
    return TauriInvokeConnector;
  }
  return undefined;
}

export const ConnectorProvider: React.FC = ({ children }) => {
  if (isOverlayWindow) {
    return <>{children}</>;
  }

  let Connector: React.FC<ConnectorProps> = () => <>{children}</>;
  if (isElectron()) {
    Connector = ElectronConnectorProvider;
  } else if (window.__TAURI__) {
    Connector = TauriConnectorProvider;
  }

  return <Connector>{children}</Connector>;
};
