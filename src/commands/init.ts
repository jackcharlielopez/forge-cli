import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { ForgeConfigSchema } from '../schemas/component.js';

interface InitOptions {
  name?: string;
  description?: string;
  typescript?: boolean;
  tailwind?: boolean;
}

export async function initCommand(options: InitOptions = {}) {
  // Copy .gitignore from template
  const gitignoreSrc = path.join(__dirname, '../../templates/.gitignore');
  const gitignoreDest = '.gitignore';
  await fs.copyFile(gitignoreSrc, gitignoreDest);
  const spinner = ora('Initializing component library...').start();

  try {
    const cwd = process.cwd();
    
    // Create the initial config
    const config = ForgeConfigSchema.parse({
      name: options.name || path.basename(cwd),
      description: options.description,
      typescript: options.typescript ?? true,
      tailwind: options.tailwind ?? true,
      componentsDir: 'src/components',
      outputDir: 'dist',
      license: 'MIT',
      categories: ['ui', 'forms', 'layout', 'navigation'],
      defaultCategory: 'ui'
    });

    // Create directory structure
    await fs.ensureDir(config.componentsDir);
    await fs.ensureDir(config.outputDir);
    await fs.ensureDir('.forge');
    await fs.ensureDir('src/utils');


  // Copy global CSS from template
  await fs.ensureDir('src/styles');
  const globalCssSrc = path.join(__dirname, '../../templates/styles/globals.css');
  const globalCssDest = 'src/styles/globals.css';
  await fs.copyFile(globalCssSrc, globalCssDest);


  // Copy utility function cn.ts from template
  await fs.ensureDir('src/utils');
  const cnSrc = path.join(__dirname, '../../templates/utils/cn.ts');
  const cnDest = 'src/utils/cn.ts';
  await fs.copyFile(cnSrc, cnDest);

    // Initialize package.json if it doesn't exist
    if (!fs.existsSync('package.json')) {
      interface PackageJson {
        name: string;
        version: string;
        description: string;
        main: string;
        types: string;
        scripts: Record<string, string>;
        peerDependencies: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      }

      const packageJson: PackageJson = {
        name: config.name,
        version: '0.1.0',
        description: config.description || 'A beautiful component library',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
          build: 'tsc',
          dev: 'tsc -w',
          storybook: 'storybook dev -p 6006',
          'build-storybook': 'storybook build'
        },
        peerDependencies: {
          'react': '>=17.0.0',
          'react-dom': '>=17.0.0'
        },
        dependencies: {
          'class-variance-authority': '^0.7.0',
          'clsx': '^2.0.0',
          'tailwind-merge': '^1.14.0',
          '@radix-ui/react-slot': '^1.0.2',
          '@radix-ui/react-dialog': '^1.0.4',
          '@radix-ui/react-label': '^2.0.2',
          '@radix-ui/react-select': '^1.2.2',
          '@radix-ui/react-tooltip': '^1.0.6',
          '@types/react-dom': '^18.2.0',
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          '@types/node': '^20.0.0',
          '@testing-library/react': '^14.0.0',
          '@testing-library/user-event': '^14.4.3',
          '@testing-library/jest-dom': '^6.1.3',
          '@storybook/react': '^7.3.2',
          '@storybook/blocks': '^7.3.2',
          '@storybook/addon-essentials': '^7.3.2',
          '@storybook/addon-interactions': '^7.3.2',
          '@storybook/addon-links': '^7.3.2',
          '@storybook/addon-themes': '^7.3.2',
          '@storybook/testing-library': '^0.2.0',
          '@storybook/builder-webpack5': '^7.3.2',
          '@storybook/manager-webpack5': '^6.5.16',
          '@storybook/addon-styling': '^1.3.7',
          'storybook': '^7.3.2',
          'tailwindcss-animate': '^1.0.7',
          'webpack': '^5.88.2'
        }
      };

      if (config.tailwind) {
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          'tailwindcss': '^3.0.0',
          'autoprefixer': '^10.0.0',
          'postcss': '^8.0.0'
        };
      }

      await fs.writeJSON('package.json', packageJson, { spaces: 2 });
    }


    // Copy tsconfig.json from template
    if (config.typescript && !fs.existsSync('tsconfig.json')) {
      const tsConfigSrc = path.join(__dirname, '../../templates/config/tsconfig.json');
      const tsConfigDest = 'tsconfig.json';
      await fs.copyFile(tsConfigSrc, tsConfigDest);
    }


    // Copy tailwind.config.js from template
    if (config.tailwind && !fs.existsSync('tailwind.config.js')) {
      const tailwindConfigSrc = path.join(__dirname, '../../templates/config/tailwind.config.js');
      const tailwindConfigDest = 'tailwind.config.js';
      await fs.copyFile(tailwindConfigSrc, tailwindConfigDest);
    }

    // Create forge.config.json
    await fs.writeJSON('forge.config.json', config, { spaces: 2 });

    spinner.succeed('Forge component library initialized successfully!');
    
    // Create example button component using addCommand
    try {
      const { addCommand } = await import('./add.js');
      await addCommand('button', { template: 'button', category: 'ui' });
    } catch (err) {
      console.error(chalk.yellow('Note: Default button component could not be created automatically.'));
    }


  // Create Storybook configuration from template files
  await fs.ensureDir('.storybook');

  // Copy preview-head.html
  const previewHeadSrc = path.join(__dirname, '../../templates/.storybook/preview-head.html');
  const previewHeadDest = '.storybook/preview-head.html';
  await fs.copyFile(previewHeadSrc, previewHeadDest);

  // Copy main.ts
  const mainSrc = path.join(__dirname, '../../templates/.storybook/main.ts');
  const mainDest = '.storybook/main.ts';
  await fs.copyFile(mainSrc, mainDest);

  // Copy preview.ts
  const previewSrc = path.join(__dirname, '../../templates/.storybook/preview.ts');
  const previewDest = '.storybook/preview.ts';
  await fs.copyFile(previewSrc, previewDest);

    // Add scripts to package.json
    if (fs.existsSync('package.json')) {
      const packageJson = await fs.readJSON('package.json');
      packageJson.scripts = {
        ...packageJson.scripts,
        'storybook': 'storybook dev -p 6006',
        'build-storybook': 'storybook build',
        'test': 'jest',
        'test:watch': 'jest --watch',
        'lint': 'eslint "src/**/*.{ts,tsx}"',
        'dev': 'npm run storybook'
      };
      await fs.writeJSON('package.json', packageJson, { spaces: 2 });
    }

    // Run npm install
    console.log(chalk.yellow('\nInstalling dependencies...'));
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log(chalk.green('✓ Dependencies installed successfully'));

      // Initialize Storybook
      console.log(chalk.yellow('\nInitializing Storybook...'));
      console.log(chalk.green('✓ Storybook configured successfully'));
    } catch (err) {
      console.error(chalk.red('Failed to install dependencies. Please run npm install manually.'));
    }
    
    console.log();
    console.log(chalk.green('🎉 Your component library is ready!'));
    console.log();
    console.log('Next steps:');
    console.log('  1. Add your first component: forge add my-button');
    console.log('  2. Build your library: forge build');
    console.log('  3. Publish to GitHub Pages: forge publish');
    console.log();
    console.log('Documentation:');
    console.log('  - forge.config.json - Configuration file');
    console.log('  - src/components/ - Your components');
    console.log('  - dist/ - Built library output');

  } catch (error) {
    spinner.fail('Failed to initialize component library');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}