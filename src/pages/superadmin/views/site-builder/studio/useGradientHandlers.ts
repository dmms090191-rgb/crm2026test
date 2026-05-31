import type { GradientConfig, GradientDirection } from './studioSectionTypes';
import { DEFAULT_GRADIENT, DIRECTION_POSITIONS } from './studioSectionTypes';

interface UseGradientHandlersArgs {
  gradient: GradientConfig | null;
  onChange: (gradient: GradientConfig | null) => void;
}

export default function useGradientHandlers({ gradient, onChange }: UseGradientHandlersArgs) {
  const config = gradient ?? DEFAULT_GRADIENT;
  const isActive = gradient !== null;

  const update = (partial: Partial<GradientConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleColor1Change = (color: string) => {
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, color1: color });
    else update({ color1: color });
  };

  const handleColor2Change = (color: string) => {
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, color2: color });
    else update({ color2: color });
  };

  const handleBalanceChange = (value: number) => {
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, balance: value });
    else update({ balance: value });
  };

  const handleStrengthChange = (value: number) => {
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, strength: value });
    else update({ strength: value });
  };

  const handleDirectionChange = (dir: GradientDirection) => {
    const positions = DIRECTION_POSITIONS[dir];
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, direction: dir, ...positions });
    else update({ direction: dir, ...positions });
  };

  const handleApplyTrait = () => {
    if (isActive) update({ showGuideLine: !config.showGuideLine });
    else onChange({ ...DEFAULT_GRADIENT, showGuideLine: true });
  };

  const handleToggleBalanceLine = () => {
    if (isActive) update({ showBalanceLine: !config.showBalanceLine });
    else onChange({ ...DEFAULT_GRADIENT, showBalanceLine: true });
  };

  const handleCenter = () => {
    const positions = DIRECTION_POSITIONS[config.direction];
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, balance: 50, ...positions });
    else update({ balance: 50, ...positions });
  };

  const handleSwapColors = () => {
    if (!isActive) onChange({ ...DEFAULT_GRADIENT, color1: DEFAULT_GRADIENT.color2, color2: DEFAULT_GRADIENT.color1 });
    else update({ color1: config.color2, color2: config.color1 });
  };

  const handleApplyPreset = (preset: GradientConfig) => {
    onChange({ ...preset, showGuideLine: config.showGuideLine, showBalanceLine: config.showBalanceLine });
  };

  return {
    config,
    isActive,
    handleColor1Change,
    handleColor2Change,
    handleBalanceChange,
    handleStrengthChange,
    handleDirectionChange,
    handleApplyTrait,
    handleToggleBalanceLine,
    handleCenter,
    handleSwapColors,
    handleApplyPreset,
  };
}
