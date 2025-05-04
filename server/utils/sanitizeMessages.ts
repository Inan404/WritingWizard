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
  // Handle empty messages
  if (!messages || messages.length === 0) {
    return [
      { role: 'system', content: 'You are a helpful, friendly AI writing assistant.' },
      { role: 'user', content: 'Hello, can you help me with my writing?' }
    ];
  }

  // Extract system message if it exists (should be the first one)
  let systemMessage: SanitizedMessage | null = null;
  let nonSystemMessages: SanitizedMessage[] = [];
  
  if (messages[0]?.role === 'system') {
    systemMessage = messages[0];
    nonSystemMessages = messages.slice(1);
  } else {
    nonSystemMessages = [...messages];
    systemMessage = {
      role: 'system',
      content: 'You are a helpful, friendly AI writing assistant. Provide detailed and thoughtful responses to help users with their writing needs. Remember context from previous messages to maintain a coherent conversation.'
    };
  }

  // Fix message sequence to ensure alternating roles ending with user
  let sanitizedMessages: SanitizedMessage[] = [];
  let lastRole: Role | null = null;
  
  for (let i = 0; i < nonSystemMessages.length; i++) {
    const message = nonSystemMessages[i];
    
    // Skip empty messages
    if (!message.content.trim()) continue;
    
    // If this is the first message after system and it's not a user message,
    // prepend a default user message
    if (lastRole === null && message.role !== 'user') {
      sanitizedMessages.push({
        role: 'user',
        content: 'Hello, can you help me with my writing?'
      });
      lastRole = 'user';
    }
    
    // Handle consecutive messages with same role (except first one)
    if (lastRole === message.role) {
      // Combine with previous message of same role
      const prevIndex = sanitizedMessages.length - 1;
      sanitizedMessages[prevIndex] = {
        ...sanitizedMessages[prevIndex],
        content: sanitizedMessages[prevIndex].content + '\n\n' + message.content
      };
    } else {
      // Add the message if role alternates properly
      sanitizedMessages.push(message);
      lastRole = message.role;
    }
  }
  
  // If last message is not from user, add a default user message asking for help
  if (sanitizedMessages.length === 0 || sanitizedMessages[sanitizedMessages.length - 1].role !== 'user') {
    sanitizedMessages.push({
      role: 'user',
      content: 'Please continue and help with my writing.'
    });
  }
  
  // Perplexity only preserves the last few exchanges for memory reasons
  // Let's keep the most recent conversations within token limits (max ~8 messages)
  if (sanitizedMessages.length > 7) {
    console.log(`Trimming conversation history from ${sanitizedMessages.length} to 7 messages`);
    sanitizedMessages = sanitizedMessages.slice(-7);
    
    // Ensure we still have alternating pattern
    if (sanitizedMessages[0].role === 'assistant') {
      sanitizedMessages.unshift({
        role: 'user',
        content: 'Please continue helping me with my writing based on our previous conversation.'
      });
    }
  }
  
  // Prepend the system message to final array
  return [systemMessage, ...sanitizedMessages];
}