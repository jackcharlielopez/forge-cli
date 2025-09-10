import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadForgeConfig } from '../utils/config';
import { ComponentSchema } from '../schemas/component';
import { validateComponent } from '../utils/validation';

interface ValidateOptions {
  fix?: boolean;
}

export async function validateCommand(options: ValidateOptions = {}) {
  const spinner = ora('Validating components...').start();
  
  try {
    const config = await loadForgeConfig();
    const { componentsDir } = config;
    
    // Find all component.json files
    const componentPaths = await findFiles(componentsDir, 'component.json');
    
    if (componentPaths.length === 0) {
      spinner.warn('No components found');
      return;
    }
    
    let hasErrors = false;
    const validationResults = [];
    
    for (const componentPath of componentPaths) {
      const componentDir = path.dirname(componentPath);
      const componentName = path.basename(componentDir);
      
      try {
        // Read and validate component.json
        const componentData = await fs.readJSON(componentPath);
        const validatedComponent = ComponentSchema.parse(componentData);
        
        // Perform additional validation
        const errors = await validateComponent(validatedComponent, componentDir);
        
        if (errors.length > 0) {
          hasErrors = true;
          validationResults.push({
            name: componentName,
            path: componentPath,
            errors,
          });
        }
        
      } catch (error) {
        hasErrors = true;
        validationResults.push({
          name: componentName,
          path: componentPath,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }
    
    spinner.stop();
    
    // Report results
    console.log(chalk.blue(`\nValidated ${componentPaths.length} components:`));
    
    for (const result of validationResults) {
      console.log(chalk.red(`\n✗ ${result.name}:`));
      result.errors.forEach(error => {
        console.log(chalk.gray(`  - ${error}`));
      });
      
      if (options.fix) {
        await attemptFix(result);
      }
    }
    
    const validCount = componentPaths.length - validationResults.length;
    console.log(chalk.blue(`\nSummary:`));
    console.log(chalk.green(`  ✓ Valid: ${validCount}`));
    if (validationResults.length > 0) {
      console.log(chalk.red(`  ✗ Invalid: ${validationResults.length}`));
      if (!options.fix) {
        console.log(chalk.gray('\nTip: Run with --fix to attempt automatic fixes'));
      }
    }
    
    if (hasErrors) {
      process.exit(1);
    }
    
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function findFiles(dir: string, filename: string): Promise<string[]> {
  const results: string[] = [];
  
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      results.push(...await findFiles(fullPath, filename));
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  
  return results;
}

async function attemptFix(result: { name: string; path: string; errors: string[] }) {
  const spinner = ora(`Attempting to fix ${result.name}...`).start();
  
  try {
    const componentData = await fs.readJSON(result.path);
    const componentDir = path.dirname(result.path);
    
    // Add missing required fields
    if (!componentData.version) {
      componentData.version = '1.0.0';
    }
    
    if (!componentData.license) {
      componentData.license = 'MIT';
    }
    
    if (!componentData.files) {
      componentData.files = [];
    }
    
    if (!componentData.tags) {
      componentData.tags = [];
    }
    
    // Ensure files exist
    const filesToRemove: number[] = [];
    for (let i = 0; i < componentData.files.length; i++) {
      const file = componentData.files[i];
      const filePath = path.join(componentDir, file.path);
      
      if (!await fs.pathExists(filePath)) {
        filesToRemove.push(i);
      }
    }
    
    // Remove missing files from the end
    for (let i = filesToRemove.length - 1; i >= 0; i--) {
      componentData.files.splice(filesToRemove[i], 1);
    }
    
    // Write fixed component.json
    await fs.writeJSON(result.path, componentData, { spaces: 2 });
    
    spinner.succeed(`Fixed ${result.name}`);
    
  } catch (error) {
    spinner.fail(`Failed to fix ${result.name}`);
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}
