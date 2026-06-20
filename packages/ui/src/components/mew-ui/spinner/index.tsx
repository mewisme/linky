import { SpinnerFramerLoading } from "./framer-loading";
import { SpinnerGradient } from "./gradient";
import { SpinnerDotDotDot } from "./dot-dot-dot";
import { SpinnerTiny } from "./tiny";
import { SpinnerTheClaw } from "./the-claw";
import { SpinnerGalaxy } from "./galaxy";
import { SpinnerRocket } from "./rocket";
import { SpinnerSleepy } from "./sleepy";
import { SpinnerFlash } from "./flash";
import { SpinnerComet } from "./comet";
import { SpinnerRollingDice } from "./rolling-dice";
import { SpinnerTarget } from "./target";
import { SpinnerTumbleweed } from "./tumbleweed";
import { SpinnerUnboxing } from "./unboxing";
import { SpinnerClassic } from "./classic";
import { SpinnerTheGreatWave } from "./the-great-wave";
import { SpinnerBusy } from "./busy";
import { SpinnerSaving } from "./saving";
import { SpinnerInitialising } from "./initialising";
import { SpinnerLoadingGraph } from "./loading-graph";
import { SpinnerLoadingGif } from "./loading-gif";
import { SpinnerRipple } from "./ripple";
import { SpinnerSearching } from "./searching";
import { SpinnerSyncing } from "./syncing";
import { SpinnerImporting } from "./importing";
import { SpinnerNewton } from "./newton";
import { SpinnerPacman } from "./pacman";
import { SpinnerBounce } from "./bounce";
import { useState } from "react";

export {
  SpinnerFramerLoading,
  SpinnerGradient,
  SpinnerDotDotDot,
  SpinnerTiny,
  SpinnerTheClaw,
  SpinnerGalaxy,
  SpinnerRocket,
  SpinnerSleepy,
  SpinnerFlash,
  SpinnerComet,
  SpinnerRollingDice,
  SpinnerTarget,
  SpinnerTumbleweed,
  SpinnerUnboxing,
  SpinnerClassic,
  SpinnerTheGreatWave,
  SpinnerBusy,
  SpinnerSaving,
  SpinnerInitialising,
  SpinnerLoadingGraph,
  SpinnerLoadingGif,
  SpinnerRipple,
  SpinnerSearching,
  SpinnerSyncing,
  SpinnerImporting,
  SpinnerNewton,
  SpinnerPacman,
  SpinnerBounce,
};

export const Spinners = {
  framer: SpinnerFramerLoading,
  gradient: SpinnerGradient,
  dotDotDot: SpinnerDotDotDot,
  tiny: SpinnerTiny,
  theClaw: SpinnerTheClaw,
  galaxy: SpinnerGalaxy,
  rocket: SpinnerRocket,
  sleepy: SpinnerSleepy,
  flash: SpinnerFlash,
  comet: SpinnerComet,
  rollingDice: SpinnerRollingDice,
  target: SpinnerTarget,
  tumbleweed: SpinnerTumbleweed,
  unboxing: SpinnerUnboxing,
  classic: SpinnerClassic,
  theGreatWave: SpinnerTheGreatWave,
  busy: SpinnerBusy,
  saving: SpinnerSaving,
  initialising: SpinnerInitialising,
  loadingGraph: SpinnerLoadingGraph,
  loadingGif: SpinnerLoadingGif,
  ripple: SpinnerRipple,
  searching: SpinnerSearching,
  syncing: SpinnerSyncing,
  importing: SpinnerImporting,
  newton: SpinnerNewton,
  pacman: SpinnerPacman,
  bounce: SpinnerBounce,
} as const;

export type SpinnerVariant = keyof typeof Spinners;

export type SpinnerBaseProps = {
  size?: number;
};

export type SpinnerProps = SpinnerBaseProps & {
  variant?: SpinnerVariant;
};

export function Spinner({ variant = "gradient", ...props }: SpinnerProps) {
  const Component = Spinners[variant];

  return <Component {...props} />;
}

function getRandomSpinnerVariant(): SpinnerVariant {
  const variants = Object.keys(Spinners) as SpinnerVariant[];
  const index = Math.floor(Math.random() * variants.length);

  return variants[index] ?? "gradient";
}

export function RandomSpinner(props: SpinnerBaseProps) {
  const [variant] = useState<SpinnerVariant>(getRandomSpinnerVariant);

  return <Spinner variant={variant} {...props} />;
}