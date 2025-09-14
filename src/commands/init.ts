import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from "fs-extra";
import ora from "ora";
import chalk from "chalk";
import { execSync } from "child_process";
import { ForgeConfigSchema } from "../schemas/component.js";

interface InitOptions {
  name?: string;
  description?: string;
  typescript?: boolean;
  tailwind?: boolean;
}

export async function initCommand(options: InitOptions = {}) {
  // Copy all files from templates/config directly to project root (overwrite if exists)
  const configTemplateDir = path.join(__dirname, "../../templates/config");
  let copiedPackageJson = false;
  if (await fs.pathExists(configTemplateDir)) {
    const configFiles = await fs.readdir(configTemplateDir);
    for (const file of configFiles) {
      const src = path.join(configTemplateDir, file);
      const dest = file;
      await fs.copyFile(src, dest);
      if (file === "package.json") {
        copiedPackageJson = true;
      }
    }
  }

  // If package.json was copied, update its name field
  if (copiedPackageJson) {
    try {
      const pkgPath = path.join(process.cwd(), "package.json");
      const pkg = await fs.readJSON(pkgPath);
      pkg.name = options.name || path.basename(process.cwd());
      await fs.writeJSON(pkgPath, pkg, { spaces: 2 });
    } catch (err) {
      console.warn(
        chalk.yellow("Warning: Failed to update package.json name field."),
        err instanceof Error ? err.message : err
      );
    }
  }
  const spinner = ora("Initializing component library...").start();

  try {
    const cwd = process.cwd();

    // Create the initial config
    const config = ForgeConfigSchema.parse({
      name: options.name || path.basename(cwd),
      description: options.description,
      typescript: options.typescript ?? true,
      tailwind: options.tailwind ?? true,
      componentsDir: "src/components",
      license: "MIT",
      categories: ["ui", "forms", "layout", "navigation"],
      defaultCategory: "ui",
    });

    // Create directory structure
    await fs.ensureDir(config.componentsDir);
    await fs.ensureDir("src/utils");

    // Copy global CSS from template
    await fs.ensureDir("src/styles");
    const globalCssSrc = path.join(
      __dirname,
      "../../templates/styles/globals.css",
    );
    const globalCssDest = "src/styles/globals.css";
    await fs.copyFile(globalCssSrc, globalCssDest);

    // Copy utility function cn.ts from template
    await fs.ensureDir("src/utils");
    const cnSrc = path.join(__dirname, "../../templates/utils/cn.ts");
    const cnDest = "src/utils/cn.ts";
    await fs.copyFile(cnSrc, cnDest);

    // Copy all component templates
    const componentsTemplateDir = path.join(
      __dirname,
      "../../templates/components",
    );
    const componentsDestDir = path.join("src/components");
    if (await fs.pathExists(componentsTemplateDir)) {
      await fs.ensureDir(componentsDestDir);
      const componentTemplates = await fs.readdir(componentsTemplateDir);
      for (const comp of componentTemplates) {
        const src = path.join(componentsTemplateDir, comp);
        const dest = path.join(componentsDestDir, comp);
        if (await fs.stat(src).then((stat) => stat.isDirectory())) {
          await fs.copy(src, dest, { overwrite: false, errorOnExist: false });
        } else {
          if (!fs.existsSync(dest)) {
            await fs.copyFile(src, dest);
          }
        }
      }
    }

    // Create forge.config.json
    await fs.writeJSON("forge.config.json", config, { spaces: 2 });

    spinner.succeed("Forge component library initialized successfully!");

    // Initialize git repo if not already present
    try {
      if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
        console.log(chalk.yellow("\nInitializing git repository..."));
        execSync("git init", { stdio: "inherit" });
        console.log(chalk.green("✓ Git repository initialized"));
      }
    } catch (err) {
      console.error(chalk.red("Failed to initialize git repository. Please run 'git init' manually if needed."));
    }

    // Copy all files from templates/.storybook
    const storybookTemplateDir = path.join(
      __dirname,
      "../../templates/.storybook",
    );
    const storybookDestDir = ".storybook";
    if (await fs.pathExists(storybookTemplateDir)) {
      await fs.ensureDir(storybookDestDir);
      const storybookFiles = await fs.readdir(storybookTemplateDir);
      for (const file of storybookFiles) {
        const src = path.join(storybookTemplateDir, file);
        const dest = path.join(storybookDestDir, file);
        if (!fs.existsSync(dest)) {
          await fs.copyFile(src, dest);
        }
      }
    }

    // Run npm install
    console.log(chalk.yellow("\nInstalling dependencies..."));
    try {
      execSync("npm install", { stdio: "inherit" });
      console.log(chalk.green("✓ Dependencies installed successfully"));
    } catch (err) {
      console.error(
        chalk.red(
          "Failed to install dependencies. Please run npm install manually.",
        ),
      );
    }

    console.log();
    console.log(chalk.green("🎉 Your component library is ready!"));
    console.log();
    console.log("Next steps:");
    console.log("  1. Add your first component: forge add my-button");
    console.log("  2. Build your library: forge build");
    console.log("  3. Publish to GitHub Pages: forge publish");
    console.log();
    console.log("Documentation:");
    console.log("  - forge.config.json - Configuration file");
    console.log("  - src/components/ - Your components");
    console.log("  - dist/ - Built library output");
  } catch (error) {
    spinner.fail("Failed to initialize component library");
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}
