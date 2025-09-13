import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { loadForgeConfig } from "../utils/config.js";
import { Component } from "../schemas/component.js";

interface ListOptions {
  category?: string;
  tag?: string;
  json?: boolean;
}

export async function listCommand(options: ListOptions = {}) {
  const spinner = ora("Loading components...").start();

  try {
    const config = await loadForgeConfig();
    const { componentsDir } = config;

    // Get all component directories
    const componentDirs = await fs.readdir(componentsDir);
    const components: Component[] = [];

    // Load all components
    for (const dir of componentDirs) {
      const componentPath = path.join(componentsDir, dir);
      const stat = await fs.stat(componentPath);

      if (stat.isDirectory()) {
        const componentJsonPath = path.join(componentPath, "component.json");
        if (await fs.pathExists(componentJsonPath)) {
          try {
            const component = await fs.readJSON(componentJsonPath);
            components.push(component);
          } catch (error) {
            if (!options.json) {
              spinner.warn(`Failed to read ${dir}/component.json`);
            }
          }
        }
      }
    }

    // Filter by category
    let filteredComponents = components;
    if (options.category) {
      filteredComponents = components.filter(
        (c) => c.category === options.category,
      );
    }

    // Filter by tag
    if (options.tag) {
      filteredComponents = filteredComponents.filter((c) =>
        c.tags.includes(options.tag!),
      );
    }

    spinner.stop();

    // Output as JSON if requested
    if (options.json) {
      console.log(JSON.stringify(filteredComponents, null, 2));
      return;
    }

    // Pretty print components
    if (filteredComponents.length === 0) {
      console.log(chalk.yellow("No components found"));
      if (options.category) {
        console.log(
          chalk.gray(`Tip: Try without --category=${options.category}`),
        );
      }
      if (options.tag) {
        console.log(chalk.gray(`Tip: Try without --tag=${options.tag}`));
      }
      return;
    }

    // Group by category
    const byCategory = new Map<string, Component[]>();
    for (const component of filteredComponents) {
      const list = byCategory.get(component.category) || [];
      list.push(component);
      byCategory.set(component.category, list);
    }

    // Print components grouped by category
    console.log(chalk.blue(`Found ${filteredComponents.length} components:`));
    console.log();

    for (const [category, categoryComponents] of byCategory) {
      console.log(chalk.cyan(`${category} (${categoryComponents.length}):`));

      for (const component of categoryComponents) {
        console.log(chalk.green(`  ✓ ${component.displayName}`));
        console.log(chalk.gray(`    ${component.description}`));

        if (component.tags.length > 0) {
          console.log(chalk.gray(`    Tags: ${component.tags.join(", ")}`));
        }

        if (component.deprecated) {
          console.log(chalk.yellow("    ⚠ Deprecated"));
        }

        if (component.experimental) {
          console.log(chalk.yellow("    🧪 Experimental"));
        }

        console.log();
      }
    }

    // Print summary
    console.log(chalk.blue("Summary:"));
    console.log(chalk.gray(`  Total components: ${filteredComponents.length}`));
    console.log(chalk.gray(`  Categories: ${byCategory.size}`));
    const allTags = new Set(filteredComponents.flatMap((c) => c.tags));
    console.log(chalk.gray(`  Unique tags: ${allTags.size}`));
  } catch (error) {
    spinner.fail("Failed to list components");
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}
