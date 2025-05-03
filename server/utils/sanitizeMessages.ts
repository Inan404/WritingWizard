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
  // Handle empty array case
  if (!messages || messages.length === 0) {
    return [
      { role: 'system', content: 'You are a helpful, friendly AI writing assistant.' },
      { role: 'user', content: 'Hello, can you help me with my writing?' }
    ];
  }

  const sanitized: SanitizedMessage[] = [];
  let lastRole: Role | null = null;

  // Process each message
  for (const msg of messages) {
    // Skip empty messages
    if (!msg.content.trim()) continue;

    // Handle system messages - only include the first one
    if (msg.role === 'system') {
      if (!sanitized.some(m => m.role === 'system')) {
        sanitized.push(msg);
      }
      lastRole = msg.role;
      continue;
    }

    // Insert dummy message to fix alternation
    if (msg.role === lastRole) {
      if (msg.role === 'user') {
        sanitized.push({ role: 'assistant', content: 'I understand.' });
      } else if (msg.role === 'assistant') {
        sanitized.push({ role: 'user', content: 'Please continue.' });
      }
    }

    sanitized.push(msg);
    lastRole = msg.role;
  }

  // If there's no system message at the beginning, add one
  if (sanitized.length === 0 || sanitized[0].role !== 'system') {
    sanitized.unshift({
      role: 'system',
      content: 'You are a helpful, friendly AI writing assistant.'
    });
  }

  // Ensure we have at least one user message
  if (!sanitized.some(msg => msg.role === 'user')) {
    sanitized.push({
      role: 'user',
      content: 'Hello, can you help me with my writing?'
    });
  }

  // Ensure the last message is from user
  if (sanitized[sanitized.length - 1].role !== 'user') {
    // If the last message is from assistant, remove it 
    // since we need to end with a user message
    if (sanitized[sanitized.length - 1].role === 'assistant') {
      sanitized.pop();
    }
    
    // If we still don't have a user message at the end, add a generic one
    if (sanitized[sanitized.length - 1].role !== 'user') {
      sanitized.push({
        role: 'user',
        content: 'Please continue.'
      });
    }
  }

  return sanitized;
}