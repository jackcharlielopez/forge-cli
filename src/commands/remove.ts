import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { loadForgeConfig } from "../utils/config.js";

interface RemoveOptions {
  force?: boolean;
}

export async function removeCommand(
  componentName: string,
  options: RemoveOptions = {},
) {
  const spinner = ora(`Removing component ${componentName}...`).start();

  try {
    const config = await loadForgeConfig();
    const componentDir = path.join(config.componentsDir, componentName);

    // Check if component exists
    if (!(await fs.pathExists(componentDir))) {
      spinner.fail(`Component ${componentName} not found`);
      return;
    }

    // Get component info
    const componentJsonPath = path.join(componentDir, "component.json");
    let componentInfo;
    try {
      componentInfo = await fs.readJSON(componentJsonPath);
    } catch (error) {
      spinner.warn("Could not read component.json");
    }

    spinner.stop();

    // Confirm removal
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Are you sure you want to remove ${componentName}?${
            componentInfo
              ? `\n  Display name: ${componentInfo.displayName}\n  Description: ${componentInfo.description}`
              : ""
          }`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow("Operation cancelled"));
        return;
      }
    }

    spinner.start("Removing component files...");

    // Remove the component directory
    await fs.remove(componentDir);

    // Update registry if it exists
    const registryPath = path.join(config.outputDir, "registry.json");
    if (await fs.pathExists(registryPath)) {
      try {
        const registry = await fs.readJSON(registryPath);
        registry.components = registry.components.filter(
          (c: any) => c.name !== componentName,
        );
        registry.lastUpdated = new Date().toISOString();
        await fs.writeJSON(registryPath, registry, { spaces: 2 });
      } catch (error) {
        spinner.warn("Failed to update registry");
      }
    }

    // Remove from output directory if it exists
    const outputComponentDir = path.join(
      config.outputDir,
      "components",
      componentName,
    );
    if (await fs.pathExists(outputComponentDir)) {
      await fs.remove(outputComponentDir);
    }

    spinner.succeed(`Component ${componentName} removed successfully`);

    // Show cleanup tip
    console.log(
      chalk.gray("\nTip: Run `forge build` to update the component registry"),
    );
  } catch (error) {
    spinner.fail("Failed to remove component");
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}
