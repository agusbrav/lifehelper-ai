import { executeBudgetTool, type ToolContext } from '@lifehelper/budget'

export { type ToolContext }

export async function runTool(
  module: string,
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  context: ToolContext,
): Promise<string> {
  if (module === 'budget') {
    return executeBudgetTool(toolName, input, userId, context)
  }
  throw new Error(`Unknown module: ${module}`)
}
