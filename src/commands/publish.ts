import chalk from 'chalk';
import ora from 'ora';
import { loadForgeConfig } from '../utils/config.js';
import { run_in_terminal } from '../utils/terminal.js';

interface PublishOptions {
  message?: string;
}

export async function publishCommand(options: PublishOptions = {}) {
  const spinner = ora('Preparing to publish...').start();
  
  try {
    const config = await loadForgeConfig();
    
    // Build the library first
    spinner.text = 'Building component library...';
    const buildResult = await run_in_terminal('npm run forge:build');
    
    if (buildResult.exitCode !== 0) {
      spinner.fail('Build failed');
      console.error(chalk.red('Error: Build must succeed before publishing'));
      return;
    }
    
    // Run validation
    spinner.text = 'Validating components...';
    const validateResult = await run_in_terminal('npm run forge:validate');
    
    if (validateResult.exitCode !== 0) {
      spinner.fail('Validation failed');
      console.error(chalk.red('Error: All components must be valid before publishing'));
      return;
    }
    
    // Get current Git branch
    const { stdout: branchOutput } = await run_in_terminal('git rev-parse --abbrev-ref HEAD');
    const currentBranch = branchOutput.trim();
    
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      spinner.warn('Not on main/master branch');
      return;
    }
    
    // Check for uncommitted changes
    const { stdout: statusOutput } = await run_in_terminal('git status --porcelain');
    if (statusOutput.trim() !== '') {
      spinner.warn('You have uncommitted changes');
      console.log(chalk.yellow('Please commit or stash your changes before publishing'));
      return;
    }
    
    // Add all files in the output directory
    await run_in_terminal(`git add ${config.outputDir}`);
    
    // Commit changes
    const commitMessage = options.message || 'Update component library';
    await run_in_terminal(`git commit -m "${commitMessage}"`);
    
    // Push to GitHub
    spinner.text = 'Pushing to GitHub...';
    const pushResult = await run_in_terminal('git push origin HEAD');
    
    if (pushResult.exitCode !== 0) {
      spinner.fail('Failed to push to GitHub');
      return;
    }
    
    spinner.succeed('Published successfully!');
    
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.gray('  1. GitHub Actions will build and deploy your component library'));
    console.log(chalk.gray('  2. Check the Actions tab on GitHub for build status'));
    console.log(chalk.gray('  3. Once deployed, your components will be available on GitHub Pages'));
    
  } catch (error) {
    spinner.fail('Failed to publish');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
