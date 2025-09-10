import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Component, ComponentSchema } from '../schemas/component';
import { loadForgeConfig } from '../utils/config';

export async function addCommand(componentName?: string, options?: any) {
  const spinner = ora('Adding new component...').start();
  
  try {
    const config = await loadForgeConfig();
    spinner.stop();

    let component: Partial<Component> = {};

    // Interactive mode or direct creation
    if (options?.interactive || !componentName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Component name (kebab-case):',
          default: componentName,
          validate: (input) => {
            if (!input.trim()) return 'Component name is required';
            if (!/^[a-z][a-z0-9-]*$/.test(input.trim())) {
              return 'Name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
            }
            return true;
          },
          filter: (input) => input.trim().toLowerCase(),
        },
        {
          type: 'input',
          name: 'displayName',
          message: 'Display name:',
          default: (answers: any) => {
            const name = answers.name || componentName || '';
            return name.split('-').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          },
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          validate: (input) => input.trim().length > 0 || 'Description is required',
        },
        {
          type: 'list',
          name: 'category',
          message: 'Category:',
          choices: config.categories,
          default: options?.category || config.defaultCategory,
        },
        {
          type: 'list',
          name: 'template',
          message: 'Template:',
          choices: [
            { name: 'Basic Component', value: 'basic' },
            { name: 'Button Component', value: 'button' },
            { name: 'Input Component', value: 'input' },
            { name: 'Card Component', value: 'card' },
            { name: 'Modal Component', value: 'modal' },
            { name: 'Custom Hook', value: 'hook' },
            { name: 'Utility Function', value: 'utility' },
          ],
          default: options?.template || 'basic',
        },
        {
          type: 'checkbox',
          name: 'tags',
          message: 'Tags (optional):',
          choices: [
            'interactive',
            'form',
            'layout',
            'navigation',
            'data-display',
            'feedback',
            'overlay',
            'typography',
            'animation',
          ],
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'Use TypeScript?',
          default: config.typescript,
        },
      ]);

      component = answers;
      componentName = answers.name;
    } else {
      // Direct creation with minimal prompts
      component = {
        name: componentName,
        displayName: componentName.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: `A ${componentName} component`,
        category: options?.category || config.defaultCategory,
        tags: [],
        typescript: config.typescript,
      };
    }

    spinner.start(`Creating ${componentName} component...`);

    // Check if component already exists
    const componentDir = path.join(config.componentsDir, componentName!);
    if (await fs.pathExists(componentDir)) {
      spinner.fail(`Component ${componentName} already exists`);
      return;
    }

    // Create component directory
    await fs.ensureDir(componentDir);

    // Generate component based on template
    const template = (component as any).template || options?.template || 'basic';
    const useTypeScript = (component as any).typescript !== false;
    const extension = useTypeScript ? 'ts' : 'js';
    const componentExt = useTypeScript ? 'tsx' : 'jsx';

    // Create component definition
    const componentDef: Component = {
      name: componentName!,
      displayName: component.displayName!,
      description: component.description!,
      category: component.category!,
      version: '1.0.0',
      tags: (component as any).tags || [],
      props: [],
      dependencies: [],
      peerDependencies: [],
      files: [],
      examples: [],
      registryDependencies: [],
    };

    // Generate files based on template
    const templateData = await generateTemplate(template, componentName!, useTypeScript);
    
    // Add files to component definition
    componentDef.files = templateData.files.map(file => ({
      name: file.name,
      path: file.filename,
      type: file.type,
    }));

    componentDef.props = templateData.props || [];
    componentDef.dependencies = templateData.dependencies || [];
    componentDef.examples = templateData.examples || [];

    // Write files
    for (const file of templateData.files) {
      await fs.writeFile(path.join(componentDir, file.filename), file.content);
    }

    // Validate component definition
    const validatedComponent = ComponentSchema.parse(componentDef);

    // Write component.json
    await fs.writeJSON(
      path.join(componentDir, 'component.json'), 
      validatedComponent, 
      { spaces: 2 }
    );

    spinner.succeed(`Created ${componentName} component successfully!`);

    // Show next steps
    console.log(chalk.blue('\n📁 Files created:'));
    templateData.files.forEach(file => {
      console.log(chalk.gray(`  ${componentDir}/${file.filename}`));
    });
    console.log(chalk.gray(`  ${componentDir}/component.json`));

    console.log(chalk.blue('\n🚀 Next steps:'));
    console.log(chalk.yellow('  1. Edit your component files'));
    console.log(chalk.yellow('  2. Test your component: ') + chalk.white(`cd ${componentDir}`));
    console.log(chalk.yellow('  3. Build library: ') + chalk.white('forge build'));

  } catch (error) {
    spinner.fail('Failed to add component');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}

async function generateTemplate(template: string, componentName: string, useTypeScript: boolean) {
  const extension = useTypeScript ? 'ts' : 'js';
  const componentExt = useTypeScript ? 'tsx' : 'jsx';
  const capitalizedName = componentName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  const templates: Record<string, any> = {
    basic: {
      files: [
        {
          name: componentName,
          filename: `${componentName}.${componentExt}`,
          type: 'component',
          content: useTypeScript ? 
`import React from 'react';
import { ${capitalizedName}Props } from './${componentName}.types';

export const ${capitalizedName}: React.FC<${capitalizedName}Props> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={\`${componentName} \${className}\`.trim()} {...props}>
      {children}
    </div>
  );
};

export default ${capitalizedName};` :
`import React from 'react';

export const ${capitalizedName} = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={\`${componentName} \${className}\`.trim()} {...props}>
      {children}
    </div>
  );
};

export default ${capitalizedName};`
        },
        ...(useTypeScript ? [{
          name: `${componentName}-types`,
          filename: `${componentName}.types.${extension}`,
          type: 'type',
          content: `import { HTMLAttributes } from 'react';

export interface ${capitalizedName}Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}`
        }] : []),
      ],
      props: useTypeScript ? [
        {
          name: 'children',
          type: 'React.ReactNode',
          required: false,
          description: 'The content of the component',
        },
        {
          name: 'className',
          type: 'string',
          required: false,
          default: "''",
          description: 'Additional CSS classes',
        },
      ] : [],
      examples: [`<${capitalizedName}>Content</${capitalizedName}>`],
    },

    button: {
      files: [
        {
          name: componentName,
          filename: `${componentName}.${componentExt}`,
          type: 'component',
          content: useTypeScript ?
`import React from 'react';
import { ${capitalizedName}Props } from './${componentName}.types';

export const ${capitalizedName}: React.FC<${capitalizedName}Props> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
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

export default ${capitalizedName};` :
`import React from 'react';

export const ${capitalizedName} = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
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

export default ${capitalizedName};`
        },
        ...(useTypeScript ? [{
          name: `${componentName}-types`,
          filename: `${componentName}.types.${extension}`,
          type: 'type',
          content: `import { ButtonHTMLAttributes } from 'react';

export interface ${capitalizedName}Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}`
        }] : []),
      ],
      props: [
        {
          name: 'variant',
          type: "'primary' | 'secondary' | 'outline'",
          required: false,
          default: "'primary'",
          description: 'The visual style variant',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          required: false,
          default: "'md'",
          description: 'The size of the button',
        },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          default: 'false',
          description: 'Whether the button is disabled',
        },
        {
          name: 'children',
          type: 'React.ReactNode',
          required: true,
          description: 'The button content',
        },
      ],
      examples: [
        `<${capitalizedName}>Click me</${capitalizedName}>`,
        `<${capitalizedName} variant="secondary">Secondary</${capitalizedName}>`,
        `<${capitalizedName} size="lg" disabled>Large Disabled</${capitalizedName}>`,
      ],
    },

    hook: {
      files: [
        {
          name: componentName,
          filename: `${componentName}.${extension}`,
          type: 'hook',
          content: useTypeScript ?
`import { useState, useCallback } from 'react';

export interface ${capitalizedName}Return {
  value: any;
  setValue: (value: any) => void;
  reset: () => void;
}

export function ${componentName.replace('-', '')}(initialValue: any = null): ${capitalizedName}Return {
  const [value, setValue] = useState(initialValue);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    reset,
  };
}

export default ${componentName.replace('-', '')};` :
`import { useState, useCallback } from 'react';

export function ${componentName.replace('-', '')}(initialValue = null) {
  const [value, setValue] = useState(initialValue);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    reset,
  };
}

export default ${componentName.replace('-', '')};`
        },
      ],
      props: [],
      examples: [
        `const { value, setValue, reset } = ${componentName.replace('-', '')}('initial');`,
      ],
    },

    utility: {
      files: [
        {
          name: componentName,
          filename: `${componentName}.${extension}`,
          type: 'utility',
          content: useTypeScript ?
`/**
 * ${componentName} utility function
 * @param input - The input parameter
 * @returns The processed result
 */
export function ${componentName.replace('-', '')}(input: any): any {
  // Implementation here
  return input;
}

export default ${componentName.replace('-', '')};` :
`/**
 * ${componentName} utility function
 * @param {any} input - The input parameter
 * @returns {any} The processed result
 */
export function ${componentName.replace('-', '')}(input) {
  // Implementation here
  return input;
}

export default ${componentName.replace('-', '')};`
        },
      ],
      props: [],
      examples: [
        `const result = ${componentName.replace('-', '')}(input);`,
      ],
    },
  };

  return templates[template] || templates.basic;
}