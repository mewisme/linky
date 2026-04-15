import * as Sentry from "@sentry/nextjs";

import { useEffect, useState, useCallback, useRef } from "react";
import { callTabCoordinator, type CallTabState } from "@/features/call/lib/call-coordination/call-tab-coordinator";

interface UseCallTabCoordinationOptions {
  scopeId?: string | null;
  onOwnershipLost?: () => void;
  onOwnershipGained?: () => void;
  onSwitchApproved?: () => void;
}

export function useCallTabCoordination(options: UseCallTabCoordinationOptions = {}) {
  const { scopeId, onOwnershipLost, onOwnershipGained, onSwitchApproved } = options;
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
    callTabCoordinator.setScopeId(scopeId ?? null);
    setState(callTabCoordinator.getState());
  }, [scopeId]);

  useEffect(() => {
    const wasOwner = previousOwnershipRef.current;
    const isOwner = state.isCallOwner;

    if (wasOwner && !isOwner) {
      Sentry.metrics.count("tab_ownership_lost", 1);
      onOwnershipLost?.();
    } else if (!wasOwner && isOwner) {
      Sentry.metrics.count("tab_ownership_gained", 1);
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
    Sentry.metrics.count("tab_switch_requested", 1);
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
