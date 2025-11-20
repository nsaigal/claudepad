import { generateText } from "ai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";

/**
 * Claude API Route
 * 
 * This endpoint handles two modes:
 * 1. Full document editing - returns typos and improvements for entire text
 * 2. Highlight mode - edits a specific selected portion based on user prompt
 * 
 * Security: API keys are stored in HTTP-only cookies (not accessible to JS)
 * Returns: Array of edits in XML format (parsed on client side)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, declinedEdits, customInstructions, highlightedText, prompt, isHighlightMode } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Retrieve API key from secure HTTP-only cookie or environment variable
  // Cookie takes precedence (user's personal key) over env var (default key)
  const cookieApiKey = req.cookies.anthropic_api_key
    ? decodeURIComponent(req.cookies.anthropic_api_key)
    : null;
  const resolvedApiKey = cookieApiKey || process.env.ANTHROPIC_API_KEY;

  if (!resolvedApiKey) {
    return res
      .status(400)
      .json({ error: "Anthropic API key is missing. Add one in Settings." });
  }

  const anthropicClient = cookieApiKey
    ? createAnthropic({ apiKey: resolvedApiKey })
    : anthropic;

  try {
    let systemPrompt;
    let promptText;

    if (isHighlightMode && highlightedText && prompt) {
      // Highlight mode: user wants to edit specific highlighted text
      systemPrompt = `You are PHD level editor tasked with editing a specific highlighted portion of text based on the user's request.
        
        Instructions:
        - The user has highlighted a specific portion of text and provided a prompt describing how they want it edited.
        - Apply the user's request to the highlighted text (marked with <highlighted_text> tags in the prompt).
        - Use the <improvement> tag to indicate the edited version of the highlighted text.
        - Include a <reason> tag after <improvement> explaining what was changed.
        
        CRITICAL FORMATTING RULES:
        - ALWAYS start with <original> tag containing ONLY the highlighted text that needs to be replaced
        - The <improvement> tag should contain the FULL edited version of the highlighted text
        - Include <reason> tag after <improvement> explaining the changes made
        - Do NOT include any JSON, markdown code blocks, or any other text
        - Do NOT include explanations outside of the <reason> tag
        - Output ONLY the XML tags, nothing else
        
        Example format:
        <original>The highlighted text here</original>
        <improvement>The edited version based on user's request</improvement>
        <reason>
        Explanation of changes made.
        </reason>

        If no edits are needed, output nothing (empty response).`;
      
      // Create prompt with highlighted text marked
      promptText = `${message}\n\n<highlighted_text>${highlightedText}</highlighted_text>\n\nUser's request: ${prompt}`;
    } else {
      // Normal mode: general editing
      systemPrompt = `You are PHD level editor tasked with editing a given excerpt.
        
        Instructions:
        - Fix any typos. Use the <typo> tag to indicate the CORRECTED text (not just the correction word).
        - Rewrite any sentences that are unclear or confusing. Use the <improvement> tag to indicate the improved version.
        
        CRITICAL FORMATTING RULES:
        - ALWAYS start with <original> tag containing ONLY the text that needs to be replaced (not the entire paragraph)
        - The <typo> tag should contain the FULL corrected text (replace the typo word/phrase in the original)
        - The <improvement> tag should contain the FULL improved sentence/phrase
        - For improvements, include <reason> tag after <improvement>
        - Do NOT include any JSON, markdown code blocks, or any other text
        - Do NOT include explanations outside of the <reason> tag
        - Output ONLY the XML tags, nothing else
        
        Example format:
        <original>dogg</original>
        <typo>dog</typo>

        <original>ASPEN Detnal</original>
        <typo>ASPEN Dental</typo>

        <original>The dog, that is, is a dog who's name is Buddy.</original>
        <improvement>The dog's name is Buddy.</improvement>
        <reason>
        Sentence was unclear and confusing.
        </reason>

        If no edits are needed, output nothing (empty response).`;
      
      promptText = message;
    }

    // Include declined edits in prompt so Claude won't suggest them again
    // This improves UX by respecting user preferences across multiple edit requests
    if (declinedEdits && declinedEdits.length > 0) {
      const declinedListJson = JSON.stringify(declinedEdits, null, 2);
      systemPrompt += `\n\nIMPORTANT: The following edits were previously declined by the user. Do NOT suggest these same exact edits again even if you believe they are correct. This is reference data only - do NOT output this JSON in your response:\n${declinedListJson}\n\nRemember: Output ONLY the XML tags (<original>, <typo>, <improvement>, <reason>), never JSON or any other format.`;
    }

    // Allow users to customize Claude's editing behavior
    // Examples: "prefer British English", "avoid contractions", "be more casual"
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += `\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${customInstructions.trim()}\n\nThese custom instructions should be followed in addition to the above rules.`;
    }

    const result = await generateText({
      system: systemPrompt,
      model: anthropicClient("claude-haiku-4-5"),
      prompt: promptText,
      // maxTokens: 1024,
    });

    console.log(systemPrompt);
    console.log(result.text);

    /**
     * Parse Claude's response for edit suggestions
     * 
     * We use XML tags instead of JSON because:
     * 1. Claude can return XML more reliably than valid JSON
     * 2. Edits often contain quotes/special chars that break JSON
     * 3. Regex parsing is simple and works well for this use case
     * 
     * Format:
     * - Typos: <original>dogg</original><typo>dog</typo>
     * - Improvements: <original>text</original><improvement>better text</improvement><reason>why</reason>
     */
    const edits = [];
    
    // Parse typo corrections: simple find-and-replace edits
    const typoRegex = /<original>([\s\S]*?)<\/original>\s*<typo>([\s\S]*?)<\/typo>/g;
    let typoMatch;
    while ((typoMatch = typoRegex.exec(result.text)) !== null) {
      // Validate match doesn't contain nested tags (avoid parsing errors)
      if (!typoMatch[1].includes('<original>') && !typoMatch[2].includes('<typo>')) {
        edits.push({
          type: 'typo',
          original: typoMatch[1].trim(),
          typo: typoMatch[2].trim(),
        });
      }
    }
    
    // Parse improvements: rewrites with explanations
    const improvementRegex = /<original>([\s\S]*?)<\/original>\s*<improvement>([\s\S]*?)<\/improvement>\s*(?:<reason>([\s\S]*?)<\/reason>)?/g;
    let improvementMatch;
    while ((improvementMatch = improvementRegex.exec(result.text)) !== null) {
      // Validate match doesn't contain nested tags
      if (!improvementMatch[1].includes('<original>') && !improvementMatch[2].includes('<improvement>')) {
        edits.push({
          type: 'improvement',
          original: improvementMatch[1].trim(),
          improvement: improvementMatch[2].trim(),
          reason: improvementMatch[3] ? improvementMatch[3].trim() : undefined,
        });
      }
    }
    
    console.log(edits);

    return res.status(200).json({ response: edits });
  } catch (error) {
    console.error("Claude API error:", error);
    const errorMessage = error.error?.message || error.message || "Unknown error";
    const statusCode = error.status || 500;
    return res.status(statusCode).json({ error: errorMessage });
  }
}