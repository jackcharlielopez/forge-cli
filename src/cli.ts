#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { buildCommand } from './commands/build.js';
import { validateCommand } from './commands/validate.js';
import { publishCommand } from './commands/publish.js';
import { updateCommand } from './commands/update.js';
import { removeCommand } from './commands/remove.js';
import { searchCommand } from './commands/search.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('forge')
  .description('🔥 Forge - Build and manage your own component library')
  .version('1.0.0');

// Initialize a new component library
program
  .command('init')
  .description('Initialize a new component library')
  .option('-n, --name <name>', 'Component library name')
  .option('-d, --description <description>', 'Component library description')
  .option('-t, --typescript', 'Use TypeScript (default: true)')
  .option('-tw, --tailwind', 'Use Tailwind CSS (default: true)')
  .action(initCommand);

// Add components to the library
program
  .command('add')
  .description('Add a new component to the library')
  .argument('[component-name]', 'Name of the component to add')
  .option('-t, --template <template>', 'Component template to use')
  .option('-c, --category <category>', 'Component category')
  .option('-i, --interactive', 'Interactive component creation')
  .action(addCommand);

// List components in the library
program
  .command('list')
  .description('List all components in the library')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('--json', 'Output as JSON')
  .action(listCommand);

// Build the component library
program
  .command('build')
  .description('Build the component library and generate registry')
  .option('-w, --watch', 'Watch for changes')
  .option('-v, --verbose', 'Verbose output')
  .action(buildCommand);

// Validate components
program
  .command('validate')
  .description('Validate all components in the library')
  .option('-f, --fix', 'Auto-fix issues where possible')
  .action(validateCommand);

// Publish to GitHub Pages
program
  .command('publish')
  .description('Publish the component library to GitHub Pages')
  .option('-m, --message <message>', 'Commit message')
  .action(publishCommand);

// Update component
program
  .command('update')
  .description('Update a component')
  .argument('<component-name>', 'Name of the component to update')
  .action(updateCommand);

// Remove component
program
  .command('remove')
  .description('Remove a component from the library')
  .argument('<component-name>', 'Name of the component to remove')
  .option('-f, --force', 'Force removal without confirmation')
  .action(removeCommand);

// Search components
program
  .command('search')
  .description('Search for components')
  .argument('<query>', 'Search query')
  .option('-c, --category <category>', 'Filter by category')
  .action(searchCommand);

// Configuration management
program
  .command('config')
  .description('Manage Forge configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-l, --list', 'List all configuration')
  .action(configCommand);

// Global error handler
program.exitOverride((err) => {
  if (err.code === 'commander.missingArgument') {
    console.error(chalk.red('Error: Missing required argument'));
    console.log(chalk.yellow('Use --help for usage information'));
  } else if (err.code === 'commander.unknownOption') {
    console.error(chalk.red('Error: Unknown option'));
    console.log(chalk.yellow('Use --help for available options'));
  } else {
    console.error(chalk.red('Error:', err.message));
  }
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:', promise, 'reason:', reason));
  process.exit(1);
});

program.parse();