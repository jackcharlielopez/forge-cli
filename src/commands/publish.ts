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
  const spinner = ora("Preparing to publish...").start();
  try {
    // 1. Check .npmrc for GitHub token
    const npmrcPath = path.join(process.cwd(), ".npmrc");
    let npmrcContent = "";
    let hasToken = false;
    if (await fs.pathExists(npmrcPath)) {
      npmrcContent = await fs.readFile(npmrcPath, "utf8");
      hasToken = /npm\.pkg\.github\.com\/:_authToken=\S+/.test(npmrcContent);
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

    const config = await loadForgeConfig();


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
    const publishResult = await run_in_terminal("npm publish");
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
