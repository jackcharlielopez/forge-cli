import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { loadForgeConfig } from "../utils/config.js";
import { run_in_terminal } from "../utils/terminal.js";

interface PublishOptions {
  message?: string;
}

export async function publishCommand(options: PublishOptions = {}) {
    // Prompt for version bump unless first publish (1.0.0)
    const pkgPath = path.join(process.cwd(), "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJSON(pkgPath);
      let currentVersion = pkg.version || "1.0.0";
      // Only prompt if not first publish (not 1.0.0)
      if (currentVersion !== "1.0.0") {
        const semver = currentVersion.split(".").map(Number);
        const nextPatch = `${semver[0]}.${semver[1]}.${semver[2] + 1}`;
        const nextMinor = `${semver[0]}.${semver[1] + 1}.0`;
        const nextMajor = `${semver[0] + 1}.0.0`;
        const { versionBump } = await inquirer.prompt([
          {
            type: "list",
            name: "versionBump",
            message: `Current version is ${currentVersion}. Bump version before publishing:`,
            choices: [
              { name: `Patch (${nextPatch})`, value: nextPatch },
              { name: `Minor (${nextMinor})`, value: nextMinor },
              { name: `Major (${nextMajor})`, value: nextMajor },
              { name: "Custom", value: "custom" },
            ],
          },
        ]);
        let newVersion = versionBump;
        if (versionBump === "custom") {
          const { customVersion } = await inquirer.prompt([
            {
              type: "input",
              name: "customVersion",
              message: "Enter custom version:",
              validate: (input) => /^\d+\.\d+\.\d+$/.test(input) ? true : "Must be in x.y.z format",
            },
          ]);
          newVersion = customVersion;
        }
        if (newVersion !== currentVersion) {
          pkg.version = newVersion;
          await fs.writeJSON(pkgPath, pkg, { spaces: 2 });
          console.log(chalk.yellow(`Updated version to ${newVersion}`));
        }
      }
    }
    // Ask user if package should be public or private
    let accessFlag = "";
    try {
      const pkgPath = path.join(process.cwd(), "package.json");
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJSON(pkgPath);
        // Only prompt for access if package is scoped (starts with @)
        if (pkg.name && pkg.name.startsWith("@")) {
          const { access } = await inquirer.prompt([
            {
              type: "list",
              name: "access",
              message: "Publish package as public or private?",
              choices: [
                { name: "Public (anyone can install)", value: "public" },
                { name: "Private (only you/your org)", value: "restricted" },
              ],
              default: "restricted",
            },
          ]);
          if (access === "public") {
            accessFlag = "--access public";
          } else {
            accessFlag = "--access restricted";
          }
        }
      }
    } catch {}
    // Helper to update package.json name to match scope and folder
    async function ensurePackageName(scope: string) {
      const pkgPath = path.join(process.cwd(), "package.json");
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJSON(pkgPath);
        const folderName = path.basename(process.cwd());
        const expectedName = `@${scope}/${folderName}`;
        if (pkg.name !== expectedName) {
          pkg.name = expectedName;
          await fs.writeJSON(pkgPath, pkg, { spaces: 2 });
          console.log(chalk.yellow(`Updated package.json name to '${expectedName}' for GitHub Packages.`));
        }
      }
    }
  const spinner = ora("Preparing to publish...").start();
  try {
    // 1. Check .npmrc for GitHub token and registry line
    const npmrcPath = path.join(process.cwd(), ".npmrc");
    let npmrcContent = "";
    let hasToken = false;
    let hasRegistry = false;
    let scope = "";
    if (await fs.pathExists(npmrcPath)) {
      npmrcContent = await fs.readFile(npmrcPath, "utf8");
      hasToken = /npm\.pkg\.github\.com\/:_authToken=\S+/.test(npmrcContent);
      hasRegistry = /@[^:]+:registry=https:\/\/npm\.pkg\.github\.com\//.test(npmrcContent);
    }
    // Always prompt user for GitHub username/org for registry line
    if (!hasRegistry) {
      spinner.stop();
      // Try to detect GitHub username/org from git remote
      let defaultScope = "";
      try {
        const { stdout: remoteUrl } = await run_in_terminal("git config --get remote.origin.url");
        // Trim whitespace/newlines before matching
        const trimmedUrl = remoteUrl.trim();
        // Match both SSH and HTTPS GitHub URLs
        const match = trimmedUrl.match(/github.com[/:]([^/]+)\//);
        if (match && match[1]) {
          defaultScope = match[1];
        }
      } catch {}
      const { userScope } = await inquirer.prompt([
        {
          type: "input",
          name: "userScope",
          message: "Enter your GitHub username or org (for .npmrc registry line):",
          default: defaultScope,
          validate: (input) => input.trim() ? true : "Scope is required",
        },
      ]);
      scope = userScope.trim();
      const registryLine = `@${scope}:registry=https://npm.pkg.github.com/\n`;
      await fs.appendFile(npmrcPath, registryLine);
      console.log(chalk.green(`.npmrc updated with registry for @${scope}`));
      await ensurePackageName(scope);
      spinner.start();
    } else if (hasRegistry) {
      // If registry already exists, try to extract scope and ensure package name
      const match = npmrcContent.match(/@([^:]+):registry=https:\/\/npm\.pkg\.github\.com\//);
      if (match && match[1]) {
        scope = match[1];
        await ensurePackageName(scope);
      }
    }
    if (!hasToken) {
      spinner.stop();
      console.log(chalk.yellow("\nA GitHub Personal Access Token is required to publish to GitHub Packages."));
      console.log(chalk.gray("How to create a token: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages"));
      const { token } = await inquirer.prompt([
        {
          type: "password",
          name: "token",
          message: "Enter your GitHub Personal Access Token (with write:packages scope):",
          mask: "*",
        },
      ]);
      const npmrcLine = `//npm.pkg.github.com/:_authToken=${token}\n`;
      await fs.appendFile(npmrcPath, npmrcLine);
      console.log(chalk.green(".npmrc updated with your token."));
      spinner.start();
    }

    // 2. Validate components
    spinner.text = "Validating components...";
    const validateResult = await run_in_terminal("npx forge validate");
    if (validateResult.exitCode !== 0) {
      spinner.fail("Validation failed");
      console.error(chalk.red("Error: All components must be valid before publishing"));
      return;
    }

    // 3. Build the library
    spinner.text = "Building component library...";
    const buildResult = await run_in_terminal("npx forge build");
    if (buildResult.exitCode !== 0) {
      spinner.fail("Build failed");
      console.error(chalk.red("Error: Build must succeed before publishing"));
      return;
    }

    // 4. Check git branch
    const { stdout: branchOutput } = await run_in_terminal("git rev-parse --abbrev-ref HEAD");
    const currentBranch = branchOutput.trim();
    if (currentBranch !== "main" && currentBranch !== "master") {
      spinner.warn("Not on main/master branch");
      return;
    }

    // 5. Check for uncommitted changes
    const { stdout: statusOutput } = await run_in_terminal("git status --porcelain");
    if (statusOutput.trim() !== "") {
      spinner.stop();
      const { confirmCommit } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmCommit",
          message: "You have uncommitted changes. Commit and push them before publishing?",
          default: true,
        },
      ]);
      if (confirmCommit) {
        await run_in_terminal("git add .");
        const { commitMessage } = await inquirer.prompt([
          {
            type: "input",
            name: "commitMessage",
            message: "Enter a commit message:",
            default: "Prepare for publish",
          },
        ]);
        await run_in_terminal(`git commit -m "${commitMessage}"`);
        spinner.text = "Pushing to GitHub...";
        const pushResult = await run_in_terminal("git push origin HEAD");
        if (pushResult.exitCode !== 0) {
          spinner.fail("Failed to push to GitHub");
          return;
        }
        spinner.start();
      } else {
        spinner.warn("Please commit or stash your changes before publishing.");
        return;
      }
    }

    // 6. Publish to GitHub Packages
    spinner.text = "Publishing to GitHub Packages...";
    const publishCmd = accessFlag ? `npm publish ${accessFlag}` : "npm publish";
    const publishResult = await run_in_terminal(publishCmd);
    if (publishResult.exitCode !== 0) {
      spinner.fail("npm publish failed");
      console.error(chalk.red("Error: npm publish failed. Check your .npmrc and token."));
      return;
    }

    spinner.succeed("Published to GitHub Packages successfully!");
    // Dynamically read package name from package.json
    let pkgName = "<your-package-name>";
    try {
      const pkgJson = await fs.readJSON(path.join(process.cwd(), "package.json"));
      pkgName = pkgJson.name || pkgName;
    } catch {}
    console.log(chalk.blue("\nInstall your CLI anywhere with:"));
    console.log(chalk.green(`  npm install ${pkgName}`));
    console.log(chalk.gray("(Ensure your .npmrc is configured with a valid GitHub token.)"));
  } catch (error) {
    spinner.fail("Failed to publish");
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}
