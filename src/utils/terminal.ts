import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function run_in_terminal(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return {
        stdout: '',
        stderr: error.message,
        exitCode: (error as any).code || 1,
      };
    }
    throw error;
  }
}
