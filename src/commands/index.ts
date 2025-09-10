import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { Component, ComponentRegistry } from '../schemas/component.js';
import { loadForgeConfig, updateForgeConfig } from '../utils/config.js';
import { validateAllComponents } from '../utils/validation.js';

// List Command
export async function listCommand(options: any) {
  try {
    const config = await loadForgeConfig();
    const componentPaths = glob.sync(path.join(config.componentsDir, '**/component.json'));
    
    if (componentPaths.length === 0) {
      console.log(chalk.yellow('No components found. Add one with: forge add <component-name>'));
      return;
    }

    const components: Component[] = [];
    
    for (const componentPath of componentPaths) {
      try {
        const component = await fs.readJSON(componentPath) as Component;
        
        // Apply filters
        if (options.category && component.category !== options.category) continue;
        if (options.tag && !component.tags.includes(options.tag)) continue;
        
        components.push(component);
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not load ${componentPath}`));
      }
    }

    if (options.json) {
      console.log(JSON.stringify(components, null, 2));
      return;
    }

    console.log(chalk.blue(`\n📦 ${components.length} component(s) found:\n`));
    
    const groupedByCategory = components.reduce((acc, comp) => {
      if (!acc[comp.category]) acc[comp.category] = [];
      acc[comp.category].push(comp);
      return acc;
    }, {} as Record<string, Component[]>);

    for (const [category, comps] of Object.entries(groupedByCategory)) {
      console.log(chalk.bold(`${category.toUpperCase()}`));
      
      (comps as Component[]).forEach((comp: Component) => {
        const tags = comp.tags.length > 0 ? chalk.gray(`[${comp.tags.join(', ')}]`) : '';
        console.log(`  ${chalk.green(comp.name)} - ${comp.description} ${tags}`);
      });
      console.log();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

// Validate Command
export async function validateCommand(options: any) {
  const spinner = ora('Validating components...').start();
  
  try {
    const config = await loadForgeConfig();
    const { valid, invalid } = await validateAllComponents(config.componentsDir);

    spinner.stop();

    console.log(chalk.blue('\n📋 Validation Results:\n'));
    
    if (valid.length > 0) {
      console.log(chalk.green(`✅ Valid components (${valid.length}):`));
      valid.forEach((comp: Component) => console.log(chalk.gray(`  ✓ ${comp.name}`)));
      console.log();
    }

    if (invalid.length > 0) {
      console.log(chalk.red(`❌ Invalid components (${invalid.length}):`));
      invalid.forEach(({ component, errors }: { component: string; errors: string[] }) => {
        console.log(chalk.red(`  ✗ ${component}:`));
        errors.forEach((error: string) => console.log(chalk.gray(`    - ${error}`)));
      });
      console.log();

      if (options.fix) {
        console.log(chalk.yellow('Auto-fixing is not yet implemented.'));
        console.log(chalk.gray('Please fix the issues manually and run validation again.'));
      }

      process.exit(1);
    } else {
      console.log(chalk.green('🎉 All components are valid!'));
    }

  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Publish Command
export async function publishCommand(options: any) {
  const spinner = ora('Publishing to GitHub Pages...').start();
  
  try {
    // First, validate and build
    spinner.text = 'Validating components...';
    const config = await loadForgeConfig();
    const { invalid } = await validateAllComponents(config.componentsDir);
    
    if (invalid.length > 0) {
      spinner.fail('Cannot publish: validation errors found');
      console.log(chalk.red('Fix validation errors first with: forge validate'));
      return;
    }

    spinner.text = 'Building component library...';
    execSync('npm run forge:build', { stdio: 'pipe' });

    spinner.text = 'Publishing to GitHub Pages...';
    
    // Check if gh-pages is available
    try {
      execSync('which gh-pages', { stdio: 'pipe' });
    } catch {
      spinner.fail('gh-pages not found. Install with: npm install -g gh-pages');
      return;
    }

    // Deploy to GitHub Pages
    const message = options.message || `Deploy ${new Date().toISOString()}`;
    execSync(`gh-pages -d ${config.outputDir} -m "${message}"`, { stdio: 'pipe' });

    spinner.succeed('Published to GitHub Pages successfully!');
    
    // Try to get repository URL
    try {
      const packageJson = await fs.readJSON('package.json');
      if (packageJson.repository) {
        const repoUrl = typeof packageJson.repository === 'string' 
          ? packageJson.repository 
          : packageJson.repository.url;
        const githubUrl = repoUrl.replace('.git', '').replace('git+', '') + '/tree/gh-pages';
        console.log(chalk.blue('\n🌐 Your component library is live at:'));
        console.log(chalk.underline(githubUrl));
      }
    } catch {
      // Ignore if we can't get the URL
    }

  } catch (error) {
    spinner.fail('Publish failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

// Remove Command
export async function removeCommand(componentName: string, options: any) {
  try {
    const config = await loadForgeConfig();
    const componentDir = path.join(config.componentsDir, componentName);

    if (!(await fs.pathExists(componentDir))) {
      console.error(chalk.red(`Component ${componentName} not found`));
      return;
    }

    if (!options.force) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove ${componentName}?`,
        default: false,
      }]);

      if (!confirm) {
        console.log(chalk.gray('Removal cancelled'));
        return;
      }
    }

    await fs.remove(componentDir);
    console.log(chalk.green(`✅ Removed ${componentName} component`));

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

// Search Command
export async function searchCommand(query: string, options: any) {
  try {
    const config = await loadForgeConfig();
    const componentPaths = glob.sync(path.join(config.componentsDir, '**/component.json'));
    
    const results: Component[] = [];
    const searchTerm = query.toLowerCase();

    for (const componentPath of componentPaths) {
      try {
        const component = await fs.readJSON(componentPath) as Component;
        
        // Search in name, displayName, description, and tags
        const matches = 
          component.name.toLowerCase().includes(searchTerm) ||
          component.displayName.toLowerCase().includes(searchTerm) ||
          component.description.toLowerCase().includes(searchTerm) ||
          component.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm));

        if (matches) {
          // Apply category filter
          if (options.category && component.category !== options.category) continue;
          results.push(component);
        }
      } catch (error) {
        // Skip invalid components
      }
    }

    console.log(chalk.blue(`\n🔍 Found ${results.length} component(s) matching "${query}":\n`));
    
    if (results.length === 0) {
      console.log(chalk.gray('No components found matching your search.'));
      return;
    }

    results.forEach(comp => {
      const tags = comp.tags.length > 0 ? chalk.gray(`[${comp.tags.join(', ')}]`) : '';
      console.log(`${chalk.green(comp.name)} (${comp.category}) - ${comp.description} ${tags}`);
    });

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

// Update Command
export async function updateCommand(componentName: string) {
  console.log(chalk.yellow(`Updating ${componentName} component...`));
  console.log(chalk.gray('Component updates are not yet implemented.'));
  console.log(chalk.blue('You can manually edit the component files and run: forge build'));
}

// Config Command
export async function configCommand(options: any) {
  try {
    const config = await loadForgeConfig();

    if (options.list) {
      console.log(chalk.blue('\n⚙️ Forge Configuration:\n'));
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (options.get) {
      const value = (config as any)[options.get];
      if (value !== undefined) {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.error(chalk.red(`Configuration key "${options.get}" not found`));
      }
      return;
    }

    if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || value === undefined) {
        console.error(chalk.red('Invalid format. Use: --set key=value'));
        return;
      }

      try {
        // Try to parse as JSON, fallback to string
        const parsedValue = JSON.parse(value);
        await updateForgeConfig({ [key]: parsedValue });
      } catch {
        await updateForgeConfig({ [key]: value });
      }

      console.log(chalk.green(`✅ Set ${key} = ${value}`));
      return;
    }

    // Interactive config update
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: config.description,
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: config.author,
      },
      {
        type: 'input',
        name: 'license',
        message: 'License:',
        default: config.license,
      },
      {
        type: 'checkbox',
        name: 'categories',
        message: 'Categories:',
        choices: [
          'ui', 'forms', 'layout', 'navigation', 
          'data-display', 'feedback', 'utilities'
        ],
        default: config.categories,
      },
    ]);

    await updateForgeConfig(answers);
    console.log(chalk.green('✅ Configuration updated'));

  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}