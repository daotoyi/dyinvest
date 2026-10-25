export function formatMoney(value: number, digits = 2) {
  const sign = value < 0 ? "-" : "";
  const fixed = Math.abs(value).toFixed(digits);
  const [integer = "0", decimal = ""] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return digits > 0 ? `${sign}¥${grouped}.${decimal}` : `${sign}¥${grouped}`;
}

export function formatSignedMoney(value: number, digits = 2) {
  if (Math.abs(value) < 0.005) return formatMoney(0, digits);
  return `${value > 0 ? "+" : ""}${formatMoney(value, digits)}`;
}

export function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number, digits = 2, signed = false) {
  const percentage = value * 100;
  const prefix = signed && percentage > 0 ? "+" : "";
  return `${prefix}${percentage.toFixed(digits)}%`;
}

export function formatVol(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedNumber(value: number, digits = 0) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, digits)}`;
}

export function optionLabel(type: "call" | "put", strike: number) {
  return `${type === "call" ? "购" : "沽"}${strike.toFixed(3)}`;
}
