import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadForgeConfig } from '../utils/config.js';
import { ForgeConfigSchema } from '../schemas/component.js';

interface ConfigOptions {
  set?: string;
  get?: string;
  list?: boolean;
}

export async function configCommand(options: ConfigOptions = {}) {
  const spinner = ora('Loading configuration...').start();
  
  try {
    const config = await loadForgeConfig();
    const configPath = 'forge.config.json';
    
    spinner.stop();
    
    // List all configuration
    if (options.list || (!options.set && !options.get)) {
      console.log(chalk.blue('Current configuration:'));
      for (const [key, value] of Object.entries(config)) {
        console.log(chalk.green(`${key}:`), chalk.gray(JSON.stringify(value, null, 2)));
      }
      return;
    }
    
    // Get specific configuration value
    if (options.get) {
      const value = (config as any)[options.get];
      if (value === undefined) {
        console.log(chalk.yellow(`Configuration key "${options.get}" not found`));
        return;
      }
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    
    // Set configuration value
    if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || !value) {
        console.log(chalk.red('Invalid format. Use --set key=value'));
        return;
      }
      
      try {
        // Parse the value
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
        
        // Update config
        const updatedConfig = {
          ...config,
          [key]: parsedValue,
        };
        
        // Validate updated config
        ForgeConfigSchema.parse(updatedConfig);
        
        // Write updated config
        await fs.writeJSON(configPath, updatedConfig, { spaces: 2 });
        
        console.log(chalk.green(`Set ${key} = ${value}`));
        
      } catch (error) {
        console.error(chalk.red('Invalid configuration:'), error instanceof Error ? error.message : error);
        return;
      }
    }
    
  } catch (error) {
    spinner.fail('Failed to manage configuration');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
