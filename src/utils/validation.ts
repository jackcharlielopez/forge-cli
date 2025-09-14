import fs from "fs-extra";
import path from "path";
import { Component } from "../schemas/component.js";

export async function validateComponent(
  component: Component,
  componentDir: string,
): Promise<string[]> {
  const errors: string[] = [];

  // Check for nested components
  const hasNestedComponents = await checkForNestedComponents(componentDir);
  if (hasNestedComponents) {
    errors.push(
      "Components cannot be nested. Each component should be in its own directory.",
    );
  }

  // Only check for nested components and empty files
  for (const file of component.files) {
    const filePath = path.join(componentDir, file.path);
    if (await fs.pathExists(filePath)) {
      const stat = await fs.stat(filePath);
      if (stat.size === 0) {
        errors.push(`File ${file.path} is empty`);
      }
    }
  }

  // Validate props consistency
  for (const prop of component.props) {
    if (!prop.name || !prop.type) {
      errors.push(`Invalid prop definition: name and type are required`);
    }

    if (prop.required && prop.default !== undefined) {
      errors.push(
        `Prop ${prop.name} cannot be both required and have a default value`,
      );
    }
  }

  // Check for circular dependencies
  const circularDeps = await checkCircularDependencies(component, componentDir);
  if (circularDeps.length > 0) {
    errors.push(`Circular dependencies detected: ${circularDeps.join(", ")}`);
  }

  return errors;
}

async function checkForNestedComponents(
  componentDir: string,
): Promise<boolean> {
  const entries = await fs.readdir(componentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedPath = path.join(componentDir, entry.name, "component.json");
      if (await fs.pathExists(nestedPath)) {
        return true;
      }
    }
  }

  return false;
}

async function checkCircularDependencies(
  component: Component,
  componentDir: string,
): Promise<string[]> {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];

  async function dfs(compName: string, compDir: string): Promise<void> {
    if (recursionStack.has(compName)) {
      cycles.push(compName);
      return;
    }

    if (visited.has(compName)) {
      return;
    }

    visited.add(compName);
    recursionStack.add(compName);

    // Check registry dependencies
    for (const dep of component.registryDependencies) {
      const depDir = path.join(path.dirname(compDir), dep);
      if (await fs.pathExists(path.join(depDir, "component.json"))) {
        await dfs(dep, depDir);
      }
    }

    recursionStack.delete(compName);
  }

  await dfs(component.name, componentDir);
  return cycles;
}

export async function validateAllComponents(componentsDir: string): Promise<{
  valid: Component[];
  invalid: Array<{ component: string; errors: string[] }>;
}> {
  const glob = require("glob");
  const componentPaths = glob.sync(
    path.join(componentsDir, "**/component.json"),
  );

  const valid: Component[] = [];
  const invalid: Array<{ component: string; errors: string[] }> = [];

  for (const componentPath of componentPaths) {
    try {
      const componentData = await fs.readJSON(componentPath);
      const component = componentData as Component;
      const componentDir = path.dirname(componentPath);

      const errors = await validateComponent(component, componentDir);

      if (errors.length === 0) {
        valid.push(component);
      } else {
        invalid.push({ component: component.name, errors });
      }
    } catch (error) {
      invalid.push({
        component: path.basename(path.dirname(componentPath)),
        errors: [
          `Failed to parse component: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      });
    }
  }

  return { valid, invalid };
}
