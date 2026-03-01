export type FloatingLayoutMode = "dual" | "single-remote" | "single-local" | "avatar";

export interface FloatingVideoState {
  isRemoteCameraOn: boolean;
  isLocalCameraOn: boolean;
  layoutMode: FloatingLayoutMode;
}

export function deriveFloatingLayoutMode(
  isRemoteCameraOn: boolean,
  isLocalCameraOn: boolean
): FloatingLayoutMode {
  if (isRemoteCameraOn && isLocalCameraOn) {
    return "dual";
  }
  if (isRemoteCameraOn && !isLocalCameraOn) {
    return "single-remote";
  }
  if (!isRemoteCameraOn && isLocalCameraOn) {
    return "single-local";
  }
  return "avatar";
}

export function getFloatingVideoState(
  isRemoteCameraOn: boolean,
  isLocalCameraOn: boolean
): FloatingVideoState {
  return {
    isRemoteCameraOn,
    isLocalCameraOn,
    layoutMode: deriveFloatingLayoutMode(isRemoteCameraOn, isLocalCameraOn),
  };
}
