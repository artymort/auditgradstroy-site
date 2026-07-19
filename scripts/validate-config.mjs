import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const root = process.cwd();
const config = parse(await readFile(path.join(root, ".pages.yml"), "utf8"));
const components = new Map(Object.entries(config.components ?? {}));
const errors = [];

function typeMatches(value, fieldType) {
  if (fieldType === "list") return Array.isArray(value);
  if (fieldType === "number") return typeof value === "number";
  if (fieldType === "boolean") return typeof value === "boolean";
  if (["string", "text", "rich-text", "image", "file", "date", "datetime", "select"].includes(fieldType)) {
    return typeof value === "string";
  }
  return true;
}

function validateFields(data, fields, location) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push(`${location}: expected an object`);
    return;
  }

  for (const field of fields ?? []) {
    if (!field?.name) continue;
    const value = data[field.name];
    const here = `${location}.${field.name}`;

    if (value === undefined || value === null) {
      if (field.required !== false) errors.push(`${here}: missing required value`);
      continue;
    }

    if (field.list) {
      if (!Array.isArray(value)) {
        errors.push(`${here}: expected a list, got ${typeof value}`);
        continue;
      }

      if (typeof field.list.min === "number" && value.length < field.list.min) errors.push(`${here}: needs at least ${field.list.min} items`);
      if (typeof field.list.max === "number" && value.length > field.list.max) errors.push(`${here}: allows at most ${field.list.max} items`);

      value.forEach((item, index) => {
        const itemLocation = `${here}[${index}]`;
        if (field.component) {
          const component = components.get(field.component);
          if (!component) errors.push(`${itemLocation}: unknown component ${field.component}`);
          else validateFields(item, component.fields, itemLocation);
        } else if (field.fields) {
          validateFields(item, field.fields, itemLocation);
        } else if (!typeMatches(item, field.type)) {
          errors.push(`${itemLocation}: expected ${field.type}, got ${typeof item}`);
        }
      });
      continue;
    }

    if (!typeMatches(value, field.type)) {
      errors.push(`${here}: expected ${field.type}, got ${Array.isArray(value) ? "array" : typeof value}`);
      continue;
    }

    if (field.type === "object") {
      validateFields(value, field.fields, here);
    }
  }
}

if (!config.media?.input || !config.media?.output) errors.push("media: input and output are required");

for (const entry of config.content ?? []) {
  if (entry.type !== "file") continue;
  const source = path.join(root, entry.path);
  let data;
  try {
    data = JSON.parse(await readFile(source, "utf8"));
  } catch (error) {
    errors.push(`${entry.path}: ${error.message}`);
    continue;
  }
  validateFields(data, entry.fields, entry.path);
}

if (errors.length) {
  console.error(`CMS validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("CMS config and content data are valid.");
