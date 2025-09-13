
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Component, ComponentSchema } from '../schemas/component.js';
import { loadForgeConfig } from '../utils/config.js';
import { generateTemplate } from '../utils/generateTemplate.js';

export async function addCommand(componentName?: string, options?: any) {
  const spinner = ora('Adding new component...').start();
  
  try {
    const config = await loadForgeConfig();
    spinner.stop();

    interface ComponentInput {
      name?: string;
      displayName?: string;
      description?: string;
      category?: string;
      tags?: string[];
      useTypeScript?: boolean;
      template?: string;
    }

    let component: ComponentInput = {};

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
    }

    else {
      // Direct creation with minimal prompts
      component = {
        name: componentName,
        displayName: componentName!.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: `A ${componentName} component`,
        category: options?.category || config.defaultCategory,
        tags: [],
        useTypeScript: config.typescript,
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
    // Generate files based on template
    const templateData = await generateTemplate(template, componentName!, useTypeScript);

    // Create component definition
    const componentDef: Component = {
      name: componentName!,
      displayName: component.displayName!,
      description: component.description!,
      category: component.category!,
      version: '1.0.0',
      license: 'MIT',
      tags: (component as any).tags || [],
      props: templateData.props || [],
  dependencies: [],
      peerDependencies: [],
      files: templateData.files.map((file: any) => ({
        name: file.name,
        path: file.filename,
        type: file.type,
      })),
      examples: templateData.examples || [],
      registryDependencies: [],
      private: false,
      deprecated: false,
      experimental: false,
    };

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
    templateData.files.forEach((file: any) => {
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
