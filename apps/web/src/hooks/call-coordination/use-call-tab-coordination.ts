import { useEffect, useState, useCallback, useRef } from "react";
import { callTabCoordinator, type CallTabState } from "@/lib/call-coordination/call-tab-coordinator";

const logger = {
  info: (data: unknown, msg?: string) => {
    console.info(msg || "", data);
  },
};

interface UseCallTabCoordinationOptions {
  onOwnershipLost?: () => void;
  onOwnershipGained?: () => void;
  onSwitchApproved?: () => void;
}

export function useCallTabCoordination(options: UseCallTabCoordinationOptions = {}) {
  const { onOwnershipLost, onOwnershipGained, onSwitchApproved } = options;
  const [state, setState] = useState<CallTabState>(() => callTabCoordinator.getState());
  const previousOwnershipRef = useRef(state.isCallOwner);
  const initializationAttemptedRef = useRef(false);

  useEffect(() => {
    if (!initializationAttemptedRef.current) {
      callTabCoordinator.initialize();
      initializationAttemptedRef.current = true;
    }

    const unsubscribe = callTabCoordinator.onStateChange((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const wasOwner = previousOwnershipRef.current;
    const isOwner = state.isCallOwner;

    if (wasOwner && !isOwner) {
      logger.info({ tabId: state.tabId }, "Ownership lost");
      onOwnershipLost?.();
    } else if (!wasOwner && isOwner) {
      logger.info({ tabId: state.tabId }, "Ownership gained");
      onOwnershipGained?.();
      onSwitchApproved?.();
    }

    previousOwnershipRef.current = isOwner;
  }, [state.isCallOwner, state.tabId, onOwnershipLost, onOwnershipGained, onSwitchApproved]);

  const claimOwnership = useCallback((roomId: string | null = null) => {
    return callTabCoordinator.claimOwnership(roomId);
  }, []);

  const releaseOwnership = useCallback(() => {
    callTabCoordinator.releaseOwnership();
  }, []);

  const requestSwitch = useCallback(() => {
    callTabCoordinator.requestSwitch();
  }, []);

  const isPassive = state.activeCallTabId !== null && !state.isCallOwner;

  return {
    tabId: state.tabId,
    activeCallTabId: state.activeCallTabId,
    activeCallRoomId: state.activeCallRoomId,
    activeCallStartedAt: state.activeCallStartedAt,
    isCallOwner: state.isCallOwner,
    isPassive,
    claimOwnership,
    releaseOwnership,
    requestSwitch,
  };
}
