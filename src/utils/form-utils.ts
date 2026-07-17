/**
 * Extracts values from all inputs within a specified container cleanly.
 * Requires inputs to have either a `name` or `id` attribute.
 */
export function extractFormData(
  containerId: string,
): Record<string, string | boolean | number> {
  const container = document.getElementById(containerId);
  if (!container) return {};

  const data: Record<string, string | boolean | number> = {};
  const inputs = container.querySelectorAll("input, select, textarea");

  inputs.forEach((el) => {
    const input = el as
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = input.name || input.id;
    if (!name) return;

    if (input.type === "checkbox") {
      data[name] = (input as HTMLInputElement).checked;
    } else if (input.type === "number" || input.type === "range") {
      data[name] = Number(input.value);
    } else {
      data[name] = input.value;
    }
  });

  return data;
}

/**
 * Standardizes comma-separated tag string parsing.
 */
export function parseTags(tagString: string): string[] {
  if (!tagString) return [];
  return tagString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
