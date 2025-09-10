import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ForgeConfig, ForgeConfigSchema } from '../schemas/component';

export async function initCommand(options: any) {
  const spinner = ora('Initializing Forge component library...').start();
  
  try {
    // Check if already initialized
    if (await fs.pathExists('forge.config.json')) {
      spinner.fail('Forge is already initialized in this directory');
      return;
    }

    spinner.stop();

    // Interactive setup if name is not provided
    let config: Partial<ForgeConfig> = {
      name: options.name,
      typescript: options.typescript !== false,
      tailwind: options.tailwind !== false,
    };

    if (!config.name) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What is the name of your component library?',
          validate: (input) => input.trim().length > 0 || 'Name is required',
          filter: (input) => input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        },
        {
          type: 'input',
          name: 'description',
          message: 'Describe your component library:',
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author name:',
        },
        {
          type: 'input',
          name: 'repository',
          message: 'Repository URL (optional):',
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'Use TypeScript?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'tailwind',
          message: 'Use Tailwind CSS?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'tokenRequired',
          message: 'Require authentication token for private components?',
          default: false,
        },
        {
          type: 'checkbox',
          name: 'categories',
          message: 'Select default component categories:',
          choices: [
            { name: 'UI Components', value: 'ui', checked: true },
            { name: 'Forms', value: 'forms', checked: true },
            { name: 'Layout', value: 'layout', checked: true },
            { name: 'Navigation', value: 'navigation', checked: true },
            { name: 'Data Display', value: 'data-display' },
            { name: 'Feedback', value: 'feedback' },
            { name: 'Utilities', value: 'utilities' },
          ],
        },
      ]);

      config = { ...config, ...answers };
    }

    spinner.start('Creating configuration...');

    // Validate and create config
    const validatedConfig = ForgeConfigSchema.parse(config);

    // Create directory structure
    const dirs = [
      validatedConfig.componentsDir,
      validatedConfig.outputDir,
      validatedConfig.templatesDir,
      'src/examples',
      'src/docs',
      '.forge',
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }

    // Create config file
    await fs.writeJSON('forge.config.json', validatedConfig, { spaces: 2 });

    // Create initial registry
    const initialRegistry = {
      name: validatedConfig.name,
      description: validatedConfig.description || '',
      version: '1.0.0',
      author: validatedConfig.author || '',
      license: validatedConfig.license,
      repository: validatedConfig.repository || '',
      homepage: validatedConfig.homepage || '',
      components: [],
      categories: validatedConfig.categories,
      tags: [],
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeJSON(path.join(validatedConfig.outputDir, 'registry.json'), initialRegistry, { spaces: 2 });

    // Create package.json for the component library
    const packageJson = {
      name: `@${validatedConfig.author?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'your-org'}/${validatedConfig.name}`,
      version: '1.0.0',
      description: validatedConfig.description,
      author: validatedConfig.author,
      license: validatedConfig.license,
      homepage: validatedConfig.homepage,
      repository: validatedConfig.repository,
      scripts: {
        'forge:build': 'forge build',
        'forge:validate': 'forge validate',
        'forge:publish': 'forge publish',
      },
      devDependencies: {
        'forge-cli': '^1.0.0',
      },
    };

    await fs.writeJSON('package.json', packageJson, { spaces: 2 });

    // Create GitHub workflow
    await createGitHubWorkflow(validatedConfig);

    // Create example component
    await createExampleComponent(validatedConfig);

    // Create README
    await createReadme(validatedConfig);

    spinner.succeed('Forge component library initialized successfully!');

    console.log(chalk.green('\n🎉 Your component library is ready!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.yellow('  1. Add your first component: ') + chalk.white('forge add my-button'));
    console.log(chalk.yellow('  2. Build your library: ') + chalk.white('forge build'));
    console.log(chalk.yellow('  3. Publish to GitHub Pages: ') + chalk.white('forge publish'));
    console.log(chalk.blue('\nDocumentation:'));
    console.log(chalk.gray('  - forge.config.json - Configuration file'));
    console.log(chalk.gray('  - src/components/ - Your components'));
    console.log(chalk.gray('  - public/ - Built registry and documentation'));

  } catch (error) {
    spinner.fail('Failed to initialize Forge');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

async function createGitHubWorkflow(config: ForgeConfig) {
  const workflowDir = '.github/workflows';
  await fs.ensureDir(workflowDir);

  const workflow = `name: Build and Deploy Forge Components

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Validate components
      run: npm run forge:validate
    
    - name: Build component library
      run: npm run forge:build
    
    - name: Run tests
      run: npm test
      continue-on-error: true
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: ${config.outputDir}

  deploy:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
`;

  await fs.writeFile(path.join(workflowDir, 'forge.yml'), workflow);
}

async function createExampleComponent(config: ForgeConfig) {
  const componentDir = path.join(config.componentsDir, 'button');
  await fs.ensureDir(componentDir);

  const extension = config.typescript ? 'ts' : 'js';
  const componentExt = config.typescript ? 'tsx' : 'jsx';

  // Component definition
  const componentDef = {
    name: 'button',
    displayName: 'Button',
    description: 'A customizable button component',
    category: 'ui',
    version: '1.0.0',
    props: [
      {
        name: 'variant',
        type: "'primary' | 'secondary' | 'destructive'",
        required: false,
        default: 'primary',
        description: 'The visual style variant of the button',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        required: false,
        default: 'md',
        description: 'The size of the button',
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Whether the button is disabled',
      },
      {
        name: 'children',
        type: 'React.ReactNode',
        required: true,
        description: 'The content of the button',
      },
    ],
    files: [
      {
        name: 'button',
        path: \`button.\${componentExt}\`,
        type: 'component' as const,
      },
      {
        name: 'button-types',
        path: \`button.types.\${extension}\`,
        type: 'type' as const,
      },
    ],
    examples: ['<Button>Click me</Button>', '<Button variant="secondary">Secondary</Button>'],
    tags: ['interactive', 'form'],
  };

  await fs.writeJSON(path.join(componentDir, 'component.json'), componentDef, { spaces: 2 });

  // Component implementation
  const buttonComponent = config.typescript ? `import React from 'react';
import { ButtonProps } from './button.types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };
  
  const classes = \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`.trim();
  
  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;` : `import React from 'react';

export const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };
  
  const classes = \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`.trim();
  
  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;`;

  await fs.writeFile(path.join(componentDir, `button.${componentExt}`), buttonComponent);

  if (config.typescript) {
    const buttonTypes = `import { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}`;

    await fs.writeFile(path.join(componentDir, `button.types.${extension}`), buttonTypes);
  }
}

async function createReadme(config: ForgeConfig) {
  const readme = `# ${config.name}

${config.description || 'A beautiful component library built with Forge'}

## Installation

\`\`\`bash
npx forge-cli@latest add button
\`\`\`

## Usage

\`\`\`jsx
import { Button } from './${config.componentsDir}/button';

function App() {
  return (
    <Button variant="primary">
      Click me
    </Button>
  );
}
\`\`\`

## Available Components

Visit the [component registry](./public/registry.json) to see all available components.

## Development

\`\`\`bash
# Add a new component
forge add my-component

# Build the library
forge build

# Validate components
forge validate

# Publish to GitHub Pages
forge publish
\`\`\`

## Configuration

See \`forge.config.json\` for configuration options.

## License

${config.license}
`;

  await fs.writeFile('README.md', readme);
}