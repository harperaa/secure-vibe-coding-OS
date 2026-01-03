import { z } from 'zod';

// Common prompt injection patterns to block
const INJECTION_PATTERNS = [
  // System prompt override attempts
  /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(everything|all|previous|prior)\s+(instructions?|prompts?|rules?)/i,
  /new\s+(instructions?|system\s*prompts?|rules?)[\s:]/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /act\s+as\s+(if\s+you\s+are|though\s+you\s+are)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as/i,
  /from\s+now\s+on/i,
  
  // Jailbreak attempts
  /DAN\s*mode/i,
  /developer\s*mode/i,
  /jailbreak/i,
  /bypass\s+(filter|safety|restriction)/i,
  /unlock\s+(mode|restriction|filter)/i,
  
  // Code injection attempts
  /<script[^>]*>/i,
  /<iframe[^>]*>/i,
  /javascript:/i,
  /data:text\/html/i,
  /onclick\s*=/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  
  // Command injection patterns
  /\$\(.*\)/,  // Command substitution
  /`.*`/,      // Backtick command execution
  /&&\s*rm\s+-/i,  // Shell command chaining
  /;\s*rm\s+-/i,
  /\|\s*rm\s+-/i,
  
  // SQL injection patterns
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /UNION\s+SELECT/i,
  /OR\s+1\s*=\s*1/i,
  
  // Encoding bypass attempts
  /\\x[0-9a-f]{2}/i,  // Hex encoding
  /\\u[0-9a-f]{4}/i,  // Unicode encoding
  /%[0-9a-f]{2}/i,    // URL encoding
];

// Maximum allowed length for a prompt
const MAX_PROMPT_LENGTH = 5000; // Allow up to 5000 characters for detailed questions

// Minimum length for a meaningful prompt
const MIN_PROMPT_LENGTH = 2;

// Schema for validating user prompts
export const promptSchema = z.string()
  .min(MIN_PROMPT_LENGTH, 'Question is too short')
  .max(MAX_PROMPT_LENGTH, 'Question is too long')
  .refine((prompt) => {
    // Check for injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Your question contains invalid content. Please rephrase your question.'
  })
  .refine((prompt) => {
    // Check for excessive special characters (potential encoding attack)
    const specialCharCount = (prompt.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
    const totalLength = prompt.length;
    const specialCharRatio = specialCharCount / totalLength;
    
    // If more than 30% special characters, likely an attack
    return specialCharRatio < 0.3;
  }, {
    message: 'Your question contains too many special characters. Please use plain language.'
  })
  .refine((prompt) => {
    // Check for repetitive patterns (potential DoS attack)
    const words = prompt.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // If less than 20% unique words in long prompts, likely spam
    if (words.length > 10) {
      const uniqueRatio = uniqueWords.size / words.length;
      return uniqueRatio > 0.2;
    }
    return true;
  }, {
    message: 'Your question appears to be repetitive. Please provide a clear, specific question.'
  })
  .transform((prompt) => {
    // Clean and normalize the prompt
    return prompt
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
  });

// Additional validation for policy-related prompts (Chris AI)
export const policyPromptSchema = promptSchema.refine((prompt) => {
  // Check for attempts to access other users' data
  const dataAccessPatterns = [
    /show\s+me\s+(all|other)\s+users?/i,
    /access\s+(all|other)\s+policies/i,
    /list\s+(all|everyone's)\s+data/i,
    /dump\s+(database|table|collection)/i,
    /SELECT\s+\*\s+FROM/i,
  ];
  
  for (const pattern of dataAccessPatterns) {
    if (pattern.test(prompt)) {
      return false;
    }
  }
  return true;
}, {
  message: 'You can only ask questions about your own policies.'
});

// Validate prompt and return sanitized version or error
export function validatePrompt(prompt: string, includesPolicyData: boolean = false): { 
  success: boolean; 
  data?: string; 
  error?: string 
} {
  try {
    const schema = includesPolicyData ? policyPromptSchema : promptSchema;
    const validated = schema.parse(prompt);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the first error message
      return { 
        success: false, 
        error: error.errors[0]?.message || 'Invalid input' 
      };
    }
    return { 
      success: false, 
      error: 'An error occurred validating your question' 
    };
  }
}

// Additional helper to check if prompt seems like a genuine question
export function isGenuineQuestion(prompt: string): boolean {
  // Check for question indicators
  const questionPatterns = [
    /^(what|when|where|who|why|how|is|are|can|could|should|would|will|do|does|did)\s+/i,
    /\?$/,
    /(explain|describe|tell|help|show|guide|teach|advise)/i,
    /(velocity\s+banking|ibc|insurance|policy|loan|debt|credit|finance)/i,
  ];
  
  return questionPatterns.some(pattern => pattern.test(prompt));
}

// Server-side validation with additional checks
export function validatePromptServer(
  prompt: string, 
  userContext?: { 
    userId?: string; 
    isAdmin?: boolean;
    requestCount?: number;
  }
): { 
  success: boolean; 
  data?: string; 
  error?: string 
} {
  // First run client validation
  const clientValidation = validatePrompt(prompt);
  if (!clientValidation.success) {
    return clientValidation;
  }
  
  // Additional server-side checks
  if (userContext?.requestCount && userContext.requestCount > 100) {
    return { 
      success: false, 
      error: 'Rate limit exceeded. Please try again later.' 
    };
  }
  
  // Log suspicious patterns for monitoring (but still allow them)
  const suspiciousPatterns = [
    /admin/i,
    /password/i,
    /token/i,
    /api\s*key/i,
    /secret/i,
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(prompt));
  if (isSuspicious && userContext?.userId) {
    console.warn(`[SECURITY] Suspicious prompt from user ${userContext.userId}: ${prompt.substring(0, 100)}`);
  }
  
  return clientValidation;
}