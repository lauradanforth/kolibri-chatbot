// Simple token counter utility for GPT models
// This is an approximation - OpenAI's actual tokenization may differ

export class TokenCounter {
  // Rough approximation: 1 token ≈ 4 characters for English text
  private static readonly CHARS_PER_TOKEN = 4;
  
  // Special characters that might affect token count
  private static readonly SPECIAL_CHARS = /[^\w\s]/g;
  
  /**
   * Estimate token count for text
   * @param text - The text to count tokens for
   * @returns Estimated token count
   */
  static estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Remove extra whitespace and normalize
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    
    // Count special characters (they often count as separate tokens)
    const specialCharCount = (normalizedText.match(this.SPECIAL_CHARS) || []).length;
    
    // Base token count from characters
    const baseTokens = Math.ceil(normalizedText.length / this.CHARS_PER_TOKEN);
    
    // Add extra tokens for special characters and complexity
    const complexityBonus = Math.ceil(specialCharCount * 0.5);
    
    return baseTokens + complexityBonus;
  }
  
  /**
   * Estimate tokens for a conversation
   * @param messages - Array of message objects with role and content
   * @returns Total estimated token count
   */
  static estimateConversationTokens(messages: Array<{ role: string; content: string }>): number {
    let totalTokens = 0;
    
    for (const message of messages) {
      totalTokens += this.estimateTokens(message.content);
      
      // Add tokens for role and formatting (rough estimate)
      totalTokens += 3; // role + formatting overhead
    }
    
    return totalTokens;
  }
  
  /**
   * Get cost estimate for tokens (based on GPT-3.5-turbo pricing)
   * @param tokens - Number of tokens
   * @returns Estimated cost in USD
   */
  static estimateCost(tokens: number): number {
    // GPT-3.5-turbo pricing (as of 2024)
    const INPUT_COST_PER_1K = 0.0015;  // $0.0015 per 1K input tokens
    const OUTPUT_COST_PER_1K = 0.002;   // $0.002 per 1K output tokens
    
    // Rough estimate: assume 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    
    const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;
    
    return inputCost + outputCost;
  }
  
  /**
   * Format token count for display
   * @param tokens - Number of tokens
   * @returns Formatted string
   */
  static formatTokens(tokens: number): string {
    if (tokens < 1000) {
      return `${tokens} tokens`;
    } else if (tokens < 1000000) {
      return `${(tokens / 1000).toFixed(1)}K tokens`;
    } else {
      return `${(tokens / 1000000).toFixed(2)}M tokens`;
    }
  }
  
  /**
   * Format cost for display
   * @param cost - Cost in USD
   * @returns Formatted string
   */
  static formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)} per 1K tokens`;
    } else {
      return `$${cost.toFixed(4)}`;
    }
  }
}
