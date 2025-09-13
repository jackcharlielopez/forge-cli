import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Reads all files from a component template directory and returns them as template files.
 * Throws an error if the template directory or any required file is missing.
 */
export async function generateTemplate(
  template: string,
  componentName: string,
  useTypeScript: boolean,
) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templateDir = path.join(
    __dirname,
    `../../templates/components/${template}`,
  );

  // Check if template directory exists
  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template folder not found: ${templateDir}`);
  }

  // Read all files in the template directory
  const files = await fs.readdir(templateDir);
  if (!files.length) {
    throw new Error(`No files found in template folder: ${templateDir}`);
  }

  // Read and return all template files
  const templateFiles = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.join(templateDir, filename);
      const content = await fs.readFile(filePath, "utf8");
      return {
        name: componentName,
        filename: filename,
        type: "component", // Could be improved by inferring from filename
        content,
      };
    }),
  );

  return {
    files: templateFiles,
    props: [], // Optionally, parse props from a config or doc file
    examples: [], // Optionally, parse examples from a config or doc file
  };
}
