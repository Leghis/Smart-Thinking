import OpenAI from 'openai';
// Removed SystemConfig import as it's not used for model ID here
// import { SystemConfig } from '../config'; 

// WARNING: Hardcoding API keys is generally insecure. Consider environment variables or a config file.
const OPENROUTER_API_KEY = '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';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// --- CORRECTION: Utiliser directement le modèle fallback car SystemConfig ne contient pas l'ID ---
const INTERNAL_MODEL_ID = 'openrouter/quasar-alpha'; // Fallback model
console.error(`Using OpenRouter Model: ${INTERNAL_MODEL_ID}`); // Log the model being used - Redirected to stderr

const openAI = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: OPENROUTER_API_KEY,
  // Optional: Set headers for OpenRouter specific features if needed
  // defaultHeaders: {
  //   "HTTP-Referer": $YOUR_SITE_URL, // Optional, for identifying your app
  //   "X-Title": $YOUR_APP_NAME, // Optional, for identifying your app
  // },
});

/**
 * Calls the internal LLM via OpenRouter for intelligent analysis.
 * @param systemPrompt - The system instruction for the LLM.
 * @param userPrompt - The user's request or the data to analyze.
 * @param maxTokens - Maximum number of tokens to generate.
 * @returns The LLM's response text or null if an error occurs.
 */
export async function callInternalLlm(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<string | null> {
  try {
    console.log(`Calling LLM. System Prompt: ${systemPrompt.substring(0, 100)}... User Prompt: ${userPrompt.substring(0, 200)}...`); // Log prompts
    const completion = await openAI.chat.completions.create({
      model: INTERNAL_MODEL_ID,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7, // Slightly lower temperature for more deterministic scoring
    });

    const responseContent = completion.choices[0]?.message?.content?.trim() ?? null;
    console.log(`LLM Response: ${responseContent}`); // Log response
    return responseContent;
  } catch (error) {
    console.error('Error calling OpenRouter LLM:', error);
    // Consider more robust error handling/logging
    return null;
  }
}

/**
 * Analyzes text to generate improved metrics using the internal LLM.
 * @param textToAnalyze - The text content of the thought or related data.
 * @param metricType - The type of metric to generate (e.g., 'confidence', 'relevance', 'quality').
 * @param context - Optional context for the analysis.
 * @returns A numerical score (0.0-1.0) or null if analysis fails.
 */
export async function analyzeForMetric(
    textToAnalyze: string,
    metricType: 'confidence' | 'relevance' | 'quality' | 'bias' | 'verification_need',
    context?: { 
        previousThoughtContent?: string;
        connectionType?: string; 
    }
): Promise<number | null> {
    let systemPrompt = '';
    let userPrompt = '';
    const hasContext = context?.previousThoughtContent;

    // --- Prompt Construction ---
    // Construct user prompt with context first if available and applicable
    userPrompt = "Evaluate the CURRENT thought based on the instructions.\n";
    if (hasContext && ['confidence', 'relevance', 'quality'].includes(metricType)) {
        userPrompt += `\n[CONTEXT]\nPrevious thought: "${context.previousThoughtContent}"\n`;
        if (context.connectionType) {
            userPrompt += `Connection type from previous to current: ${context.connectionType}\n`;
        }
        userPrompt += "[END CONTEXT]\n";
    }
    userPrompt += `\nCURRENT thought: "${textToAnalyze}"\n\n`;
    // Add specific instructions based on metric type AFTER context and current thought
    
    switch (metricType) {
        case 'confidence':
            systemPrompt = `You are an AI evaluating the confidence score of a 'CURRENT thought'.
Evaluate the intrinsic confidence based on language (assertions vs. hedging).
If CONTEXT (previous thought, connection type) is provided, evaluate the confidence of the CURRENT thought *relative* to that context.
- Confidence is HIGH (0.8-1.0) if the CURRENT thought strongly supports, logically derives from ('derives', 'refines'), or provides strong evidence for the previous thought, OR if it expresses high certainty intrinsically. A short, direct logical derivation can have HIGH confidence.
- Confidence is MEDIUM (0.4-0.7) if it extends, associates with, or moderately supports the previous thought, OR if it expresses moderate certainty intrinsically.
- Confidence is LOW (0.0-0.3) if the CURRENT thought contradicts, questions, is irrelevant to the previous thought, OR expresses high uncertainty intrinsically (hedging words like 'maybe', 'perhaps', 'could').

Context sensitivity: If the connection type is 'conclusion' or 'hypothesis', apply stricter evaluation criteria. For 'associates' or 'extends', apply more flexible criteria. For calculations or scientific claims, prioritize factual accuracy. For ethical or philosophical statements, focus on logical coherence.

Return ONLY the confidence score as a float between 0.0 and 1.0.`;
            userPrompt += "Desired Output: Respond with ONLY a single floating-point number between 0.0 and 1.0 representing the confidence score.\nScore (0.0-1.0):";
            break;
        case 'relevance':
             systemPrompt = `You are an AI evaluating the relevance score of a 'CURRENT thought'.
If CONTEXT (previous thought, connection type) is provided, evaluate the relevance of the CURRENT thought *to that specific context*. The connection type is a strong indicator.
- Relevance is HIGH (0.8-1.0) if the CURRENT thought has a direct logical link (e.g., 'supports', 'contradicts', 'refines', 'derives', 'exemplifies', 'synthesizes', 'analyzes') to the previous thought, even if keyword overlap is low.
- Relevance is MEDIUM (0.4-0.7) if the link is less direct (e.g., 'extends', 'compares', 'contrasts', 'associates') or if it's topically related but not directly linked.
- Relevance is LOW (0.0-0.3) if the CURRENT thought is on a completely different topic or only tangentially related.
If NO CONTEXT is provided, evaluate the general relevance of the CURRENT thought to a typical logical reasoning process (is it a meaningful, non-trivial statement?).

Examples:
- Previous thought: "Climate change is primarily caused by human activities."
- CURRENT thought: "Carbon dioxide emissions from fossil fuels are a major contributor to the greenhouse effect."
- Connection type: "supports"
- Expected score: 0.9 (HIGH relevance - directly supports with specific mechanism)

- Previous thought: "Education systems should be reformed."
- CURRENT thought: "Some schools in Finland have implemented project-based learning."
- Connection type: "associates"
- Expected score: 0.5 (MEDIUM relevance - topically related but indirect connection)

- Previous thought: "Economic policies need revision."
- CURRENT thought: "Jupiter has 79 known moons."
- Connection type: none
- Expected score: 0.1 (LOW relevance - completely unrelated topics)

Context sensitivity: If the connection type is 'conclusion' or 'hypothesis', apply stricter evaluation criteria. For 'associates' or 'extends', apply more flexible criteria. For calculations or scientific claims, prioritize factual accuracy. For ethical or philosophical statements, focus on logical coherence.

Return ONLY the relevance score as a float between 0.0 and 1.0.`;
            userPrompt += "Desired Output: Respond with ONLY a single floating-point number between 0.0 and 1.0 representing the relevance score.\nScore (0.0-1.0):";
            break;
        case 'quality':
            systemPrompt = `You are an AI evaluating the quality score of a 'CURRENT thought' based on clarity, coherence, and logical soundness.
If CONTEXT (previous thought, connection type) is provided, evaluate the quality *primarily* on how well the CURRENT thought fits logically and coherently within that context.
- Quality is HIGH (0.8-1.0) for clear, logically sound thoughts that fit coherently with the context (if provided). **Do NOT penalize brevity if the thought is a direct logical conclusion, derivation, or refinement ('derives', 'refines', 'conclusion') that makes sense in context.**
- Quality is MEDIUM (0.4-0.7) for thoughts that are understandable but could be clearer, more concise, or better structured, OR fit only moderately well with context.
- Quality is LOW (0.0-0.3) for vague, confusing, illogical, poorly structured thoughts, OR thoughts that are clearly incoherent with the context.
If NO CONTEXT is provided, evaluate the intrinsic quality (clarity, structure, apparent soundness) of the CURRENT thought alone.

Context sensitivity: If the connection type is 'conclusion' or 'hypothesis', apply stricter evaluation criteria. For 'associates' or 'extends', apply more flexible criteria. For calculations or scientific claims, prioritize factual accuracy. For ethical or philosophical statements, focus on logical coherence.

Return ONLY the quality score as a float between 0.0 and 1.0.`;
            userPrompt += "Desired Output: Respond with ONLY a single floating-point number between 0.0 and 1.0 representing the quality score.\nScore (0.0-1.0):";
            break;
        case 'bias':
             // Bias detection is usually intrinsic, context less critical
             systemPrompt = `You are an AI specialized in detecting potential biases (cognitive, emotional, social) in text. Analyze the CURRENT thought for indicators of bias.
- Look for cognitive biases such as confirmation bias, anchoring, recency bias, or availability heuristic
- Detect emotional language that might skew reasoning (strongly positive/negative terms)
- Identify social biases including stereotyping, in-group favoritism, or authority bias
- Consider language patterns like absolutes ("always", "never"), overgeneralizations, or cherry-picking
- HIGH bias (0.8-1.0): Multiple clear indicators of bias that significantly impact reasoning
- MEDIUM bias (0.4-0.7): Some indicators present but with limited impact on overall reasoning
- LOW bias (0.0-0.3): Few to no detectable bias indicators

Context sensitivity: If the connection type is 'conclusion' or 'hypothesis', apply stricter evaluation criteria. For 'associates' or 'extends', apply more flexible criteria. For calculations or scientific claims, prioritize factual accuracy. For ethical or philosophical statements, focus on logical coherence.

Return ONLY a single floating-point number between 0.0 (no detectable bias) and 1.0 (strong indication of bias).`;
             // Reset user prompt as context is not needed here
             userPrompt = `Analyze the following text for bias:\n\n"${textToAnalyze}"\n\nDesired Output: Respond with ONLY a single floating-point number between 0.0 and 1.0 indicating the likelihood of bias.\nScore (0.0-1.0):`;
             break;
        case 'verification_need':
             // Verification need is intrinsic
             systemPrompt = `You are an AI evaluating if a statement likely requires factual verification. Analyze the CURRENT thought for claims, specific data, or assertions that are not common knowledge.
- Look for specific statistics, dates, numerical claims, or precise factual assertions
- Identify historical claims, scientific statements, or technical details
- Consider claims about causality, trends, or correlations
- Evaluate citations of studies, reports, or external sources
- HIGH need (0.8-1.0): Contains multiple specific claims that require verification
- MEDIUM need (0.4-0.7): Contains some claims that may benefit from verification
- LOW need (0.0-0.3): Contains primarily opinions, common knowledge, or self-evident statements

Context sensitivity: If the connection type is 'conclusion' or 'hypothesis', apply stricter evaluation criteria. For 'associates' or 'extends', apply more flexible criteria. For calculations or scientific claims, prioritize factual accuracy. For ethical or philosophical statements, focus on logical coherence.

Return ONLY a single floating-point number between 0.0 (low need for verification) and 1.0 (high need for verification).`;
             // Reset user prompt as context is not needed here
             userPrompt = `Analyze the following text:\n\n"${textToAnalyze}"\n\nDesired Output: Respond with ONLY a single floating-point number between 0.0 and 1.0 indicating the likelihood it requires external verification.\nScore (0.0-1.0):`;
             break;
        default:
            console.error(`Unknown metric type for LLM analysis: ${metricType}`);
            return null;
    }

    const response = await callInternalLlm(systemPrompt, userPrompt, 10); // Expecting just a number

    if (response) {
        // Try to extract the first valid float number from the response
        const match = response.match(/[-+]?([0-9]*\.[0-9]+|[0-9]+)/);
        if (match) {
            const score = parseFloat(match[0]);
             if (!isNaN(score) && score >= 0 && score <= 1) {
                console.log(`Parsed score for ${metricType}: ${score}`); // Log parsed score
                return score;
            } else {
                 console.warn(`LLM returned out-of-range score for ${metricType}: ${response}`);
            }
        } else {
             console.warn(`LLM returned non-numeric response for ${metricType}: ${response}`);
        }
    }
    return null; // Return null if LLM call failed or response was invalid
}

/**
 * Uses the internal LLM to suggest improvements for a thought.
 * @param thoughtContent - The content of the thought to improve.
 * @returns An array of suggested improvement strings, or null if analysis fails.
 */
export async function suggestLlmImprovements(thoughtContent: string): Promise<string[] | null> {
    const systemPrompt = `You are an AI assistant focused on improving the clarity, logic, and completeness of reasoning steps (thoughts). Analyze the provided thought and suggest specific, actionable improvements that would enhance its quality, coherence, and logical soundness. Consider both content improvements and structural improvements.

Look for:
- Unclear or ambiguous statements that could be clarified
- Logical inconsistencies or gaps in reasoning
- Claims that need supporting evidence
- Opportunities to strengthen connections to context
- Ways to improve conciseness without sacrificing completeness

List each suggestion on a new line, starting with '- '.`;
    const userPrompt = `Analyze the following thought and suggest improvements:\n\n"${thoughtContent}"\n\nSuggestions:`;

    const response = await callInternalLlm(systemPrompt, userPrompt, 200);

    if (response) {
        // Split suggestions by newline and filter out empty lines/prefixes
        return response.split('\n')
                       .map(line => line.trim().replace(/^- /, ''))
                       .filter(line => line.length > 0);
    }
    return null;
}

/**
 * Uses the internal LLM to verify a statement or calculation.
 * @param statement - The statement or calculation to verify.
 * @returns An object containing verification status, confidence, and notes, or null if analysis fails.
 */
export async function verifyWithLlm(statement: string): Promise<{ status: 'verified' | 'contradicted' | 'unverified', confidence: number, notes: string, key_factors?: string[] } | null> {
    // Improved prompt emphasizing contradiction detection
    const systemPrompt = `You are a highly critical AI assistant specialized in fact-checking. Your primary goal is to identify false or misleading information.
Analyze the given statement meticulously based on established scientific consensus and common knowledge.
Determine if the statement is:
- 'verified': Highly likely to be true based on widely accepted facts.
- 'contradicted': Highly likely to be false or directly contradicts established facts/science. Be critical and flag falsehoods clearly.
- 'unverified': Cannot be reliably determined as true or false (e.g., opinion, subjective, lacks sufficient information, genuinely debatable).

Provide a confidence score (0.0-1.0) reflecting your certainty in the *status* assigned.
Provide brief notes explaining your reasoning, focusing on why it's verified or contradicted.
Include key factors (specific facts or reasons) that influenced your determination.

Example of a clearly false statement: "The moon is made of green cheese." -> Status should be 'contradicted'.

Respond ONLY in valid JSON format: {"status": "verified|contradicted|unverified", "confidence": 0.0-1.0, "notes": "Your reasoning...", "key_factors": ["factor1", "factor2"]}`;
    const userPrompt = `Critically verify the following statement: "${statement}"`;

    // Call LLM with lower temperature for fact-checking
    const response = await callInternalLlm(systemPrompt, userPrompt, 250); // Temperature adjustment happens inside callInternalLlm if we modify it, or we pass it here if supported. Let's assume callInternalLlm uses default 0.7 for now, but the prompt change is key.

    if (response) {
        try {
            // Attempt to parse potentially unclean JSON (e.g., with leading/trailing text)
            const jsonMatch = response.match(/\{.*\}/s);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (['verified', 'contradicted', 'unverified'].includes(result.status) &&
                    typeof result.confidence === 'number' && result.confidence >= 0 && result.confidence <= 1 &&
                    typeof result.notes === 'string') {
                    return result;
                } else {
                     console.warn(`LLM returned invalid JSON structure for verification: ${response}`);
                }
            } else {
                 console.warn(`LLM did not return valid JSON for verification: ${response}`);
            }
        } catch (e) {
            console.warn(`LLM returned non-JSON or invalid JSON for verification: ${response}`, e);
        }
    }
    return null;
}
