import { parseDecimal } from "./normalization";

export type PhysicalInput = { weight?: unknown; length?: unknown; width?: unknown; height?: unknown };

export function validatePhysicalData(input: PhysicalInput) {
  const values = {
    weight: parseDecimal(input.weight),
    length: parseDecimal(input.length),
    width: parseDecimal(input.width),
    height: parseDecimal(input.height),
  };
  const issues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null) issues[key] = "Valor ausente ou não numérico";
    else if (value <= 0) issues[key] = "O valor deve ser maior que zero";
  }
  const validValues = Object.values(values);
  if (validValues.every((value) => value === 1)) {
    for (const key of Object.keys(values)) issues[key] = "Padrão artificial: todos os valores são 1";
  }
  return { values, issues, valid: Object.keys(issues).length === 0 };
}
