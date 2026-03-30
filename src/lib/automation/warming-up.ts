/**
 * SNSアカウントのウォーミングアップ（養生）管理。
 * アカウント作成直後の制限（1日のアクション数）を段階的に緩和してBANを回避する。
 */

export type WarmingUpStage = "1" | "2" | "3";

interface StageConfig {
  /** 制限値に対する倍率 (0.0 - 1.0) */
  multiplier: number;
}

export const WARMING_UP_CONFIG: Record<WarmingUpStage, StageConfig> = {
  "1": { multiplier: 0.2 }, // 極めて制限的 (20%)
  "2": { multiplier: 0.6 }, // 制限的 (60%)
  "3": { multiplier: 1.0 }, // 通常運転 (100%)
};

/**
 * アカウントの現在のステージに基づいて、アクション上限の倍率を返します。
 */
export function getStageMultiplier(stage: string | null | undefined): number {
  if (stage === "1" || stage === "2" || stage === "3") {
    return WARMING_UP_CONFIG[stage as WarmingUpStage].multiplier;
  }
  return WARMING_UP_CONFIG["1"].multiplier; // Default to most restrictive
}

/**
 * 連続稼働日数に基づいてステージを自動アップグレードするための補助定数
 */
export const STAGE_UPGRADE_DAYS = {
  STAGE_2: 7,  // 7日後にステージ2へ
  STAGE_3: 21, // 21日後にフル稼働へ
};
