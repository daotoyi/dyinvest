import type { ExperienceLevel, RiskLevel } from "../domain/user";
import { translate } from "../i18n";

export function riskLabel(level: RiskLevel) {
  if (level === "C2") return translate("common.riskC2");
  if (level === "C4") return translate("common.riskC4");
  return translate("common.riskC3");
}

export function experienceLabel(level: ExperienceLevel) {
  if (level === "intermediate") return translate("common.experienceIntermediate");
  if (level === "advanced") return translate("common.experienceAdvanced");
  return translate("common.experienceBeginner");
}
