import * as Sentry from "@sentry/nextjs";

import { useEffect, useState, useCallback, useRef } from "react";
import { callTabCoordinator, type CallTabState } from "@/features/call/lib/call-coordination/call-tab-coordinator";

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
    Sentry.metrics.count("use_call_tab_coordination", 1);
    if (!initializationAttemptedRef.current) {
      callTabCoordinator.initialize();
      initializationAttemptedRef.current = true;
    }

    const unsubscribe = callTabCoordinator.onStateChange((newState) => {
      Sentry.metrics.count("use_call_tab_coordination_on_state_change", 1);
      setState(newState);
    });

    return () => {
      Sentry.metrics.count("use_call_tab_coordination_unsubscribe", 1);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    Sentry.metrics.count("use_call_tab_coordination_use_effect", 1);
    const wasOwner = previousOwnershipRef.current;
    const isOwner = state.isCallOwner;

    if (wasOwner && !isOwner) {
      Sentry.logger.info("Ownership lost", { tabId: state.tabId });
      onOwnershipLost?.();
    } else if (!wasOwner && isOwner) {
      Sentry.logger.info("Ownership gained", { tabId: state.tabId });
      onOwnershipGained?.();
      onSwitchApproved?.();
    }

    previousOwnershipRef.current = isOwner;
  }, [state.isCallOwner, state.tabId, onOwnershipLost, onOwnershipGained, onSwitchApproved]);

  const claimOwnership = useCallback((roomId: string | null = null) => {
    Sentry.metrics.count("use_call_tab_coordination_claim_ownership", 1);
    return callTabCoordinator.claimOwnership(roomId);
  }, []);

  const releaseOwnership = useCallback(() => {
    Sentry.metrics.count("use_call_tab_coordination_release_ownership", 1);
    callTabCoordinator.releaseOwnership();
  }, []);

  const requestSwitch = useCallback(() => {
    Sentry.metrics.count("use_call_tab_coordination_request_switch", 1);
    callTabCoordinator.requestSwitch();
  }, []);

  const isPassive = state.activeCallTabId !== null && !state.isCallOwner;
  Sentry.metrics.count("use_call_tab_coordination_return", 1);

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
