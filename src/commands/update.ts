import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import semver from 'semver';
import { loadForgeConfig } from '../utils/config.js';
import { Component, ComponentSchema } from '../schemas/component.js';

export async function updateCommand(componentName: string) {
  const spinner = ora(`Updating component ${componentName}...`).start();
  
  try {
    const config = await loadForgeConfig();
    const componentDir = path.join(config.componentsDir, componentName);
    
    // Check if component exists
    if (!await fs.pathExists(componentDir)) {
      spinner.fail(`Component ${componentName} not found`);
      return;
    }
    
    // Read component.json
    const componentJsonPath = path.join(componentDir, 'component.json');
    let component: Component;
    try {
      const componentData = await fs.readJSON(componentJsonPath);
      component = ComponentSchema.parse(componentData);
    } catch (error) {
      spinner.fail('Invalid component.json');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      return;
    }
    
    // Increment version
    if (component.version) {
      const newVersion = semver.inc(component.version, 'patch');
      if (newVersion) {
        component.version = newVersion;
      }
    }
    
    // Validate files exist
    const missingFiles: string[] = [];
    for (const file of component.files) {
      const filePath = path.join(componentDir, file.path);
      if (!await fs.pathExists(filePath)) {
        missingFiles.push(file.path);
      }
    }
    
    if (missingFiles.length > 0) {
      spinner.warn('Some component files are missing:');
      missingFiles.forEach(file => {
        console.log(chalk.yellow(`  - ${file}`));
      });
      
      // Remove missing files from component.json
      component.files = component.files.filter(f => !missingFiles.includes(f.path));
      console.log(chalk.gray('\nMissing files have been removed from component.json'));
    }
    
    // Update component.json
    await fs.writeJSON(componentJsonPath, component, { spaces: 2 });
    
    // Update registry if it exists
    const registryPath = path.join(config.outputDir, 'registry.json');
    if (await fs.pathExists(registryPath)) {
      try {
        const registry = await fs.readJSON(registryPath);
        const componentIndex = registry.components.findIndex((c: Component) => c.name === componentName);
        
        if (componentIndex !== -1) {
          registry.components[componentIndex] = component;
          registry.lastUpdated = new Date().toISOString();
          await fs.writeJSON(registryPath, registry, { spaces: 2 });
        }
      } catch (error) {
        spinner.warn('Failed to update registry');
      }
    }
    
    spinner.succeed(`Component ${componentName} updated to version ${component.version}`);
    
    // Show build tip
    console.log(chalk.gray('\nTip: Run `forge build` to update the component library'));
    
  } catch (error) {
    spinner.fail('Failed to update component');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
