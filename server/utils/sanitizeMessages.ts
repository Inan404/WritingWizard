export type Role = 'system' | 'user' | 'assistant';

export interface SanitizedMessage {
  role: Role;
  content: string;
}

/**
 * Sanitizes messages to ensure they follow the required pattern for Perplexity API:
 * - After the (optional) system message, roles must alternate between user and assistant
 * - No consecutive messages with the same role (except for system)
 * - Last message should be from user
 */
export function sanitizeMessages(messages: SanitizedMessage[]): SanitizedMessage[] {
  // The most reliable method to guarantee proper message format is:
  // 1. Extract system message if it exists
  // 2. Extract the last user message
  // 3. Return [system, user]
  
  if (!messages || messages.length === 0) {
    return [
      { role: 'system', content: 'You are a helpful, friendly AI writing assistant.' },
      { role: 'user', content: 'Hello, can you help me with my writing?' }
    ];
  }

  // Extract system message (first one only)
  let systemMessage: SanitizedMessage | null = null;
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemMessage = msg;
      break;
    }
  }

  // If no system message found, create a default one
  if (!systemMessage) {
    systemMessage = {
      role: 'system',
      content: 'You are a helpful, friendly AI writing assistant. Provide detailed and thoughtful responses to help users with their writing needs.'
    };
  }

  // Find the last user message
  let userMessage: SanitizedMessage | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content.trim()) {
      userMessage = messages[i];
      break;
    }
  }

  // If no user message found, create a default one
  if (!userMessage) {
    userMessage = {
      role: 'user',
      content: 'Hello, can you help me with my writing?'
    };
  }

  // Return the simplest valid message sequence
  return [systemMessage, userMessage];
}