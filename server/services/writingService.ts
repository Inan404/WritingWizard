import { storage } from "../storage";
import { InsertWritingChat } from "@shared/schema";

// Save writing chat data to the database
export async function saveWritingChat(
  rawText: string,
  grammarResult?: string,
  paraphraseResult?: string,
  aiCheckResult?: string,
  humanizeResult?: string
) {
  try {
    // Create a new writing chat object
    const writingChat: InsertWritingChat = {
      userId: 1, // Default user ID (in a real app, this would come from authentication)
      rawText,
      grammarResult: grammarResult || null,
      paraphraseResult: paraphraseResult || null,
      aiCheckResult: aiCheckResult || null,
      humanizeResult: humanizeResult || null
    };

    // Save to database
    const savedChat = await storage.createWritingChat(writingChat);
    
    return {
      success: true,
      chatId: savedChat.id,
      message: "Writing chat saved successfully"
    };
  } catch (error) {
    console.error("Error saving writing chat:", error);
    throw new Error("Failed to save writing chat");
  }
}

// Get all writing chats for a user
export async function getWritingChats(userId: number) {
  try {
    const chats = await storage.getWritingChatsByUserId(userId);
    return {
      success: true,
      chats
    };
  } catch (error) {
    console.error("Error getting writing chats:", error);
    throw new Error("Failed to retrieve writing chats");
  }
}

// Get a specific writing chat by ID
export async function getWritingChatById(id: number) {
  try {
    const chat = await storage.getWritingChat(id);
    if (!chat) {
      throw new Error("Writing chat not found");
    }
    
    return {
      success: true,
      chat
    };
  } catch (error) {
    console.error("Error getting writing chat:", error);
    throw new Error("Failed to retrieve writing chat");
  }
}

// Update a writing chat
export async function updateWritingChat(
  id: number,
  updates: Partial<InsertWritingChat>
) {
  try {
    const updatedChat = await storage.updateWritingChat(id, updates);
    if (!updatedChat) {
      throw new Error("Writing chat not found");
    }
    
    return {
      success: true,
      chat: updatedChat,
      message: "Writing chat updated successfully"
    };
  } catch (error) {
    console.error("Error updating writing chat:", error);
    throw new Error("Failed to update writing chat");
  }
}

// Delete a writing chat
export async function deleteWritingChat(id: number) {
  try {
    const deleted = await storage.deleteWritingChat(id);
    if (!deleted) {
      throw new Error("Writing chat not found");
    }
    
    return {
      success: true,
      message: "Writing chat deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting writing chat:", error);
    throw new Error("Failed to delete writing chat");
  }
}
