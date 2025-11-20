/**
 * Store API Key Route
 * 
 * Securely stores the user's Anthropic API key in an HTTP-only cookie
 * 
 * Security features:
 * - HTTP-only: Not accessible via JavaScript (prevents XSS attacks)
 * - SameSite=Strict: Prevents CSRF attacks
 * - Secure flag in production: Only sent over HTTPS
 * - 1 year expiry: User won't need to re-enter frequently
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ error: "API key is required" });
  }

  const trimmedKey = apiKey.trim();

  // Only use Secure flag in production (localhost doesn't have HTTPS)
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";
  
  if (!trimmedKey) {
    // Clear the cookie if empty key is sent (user wants to remove it)
    res.setHeader(
      "Set-Cookie",
      `anthropic_api_key=; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=0`
    );
    return res.status(200).json({ message: "API key cleared" });
  }

  // Store API key in HTTP-only cookie (secure, not accessible via JavaScript)
  res.setHeader(
    "Set-Cookie",
    `anthropic_api_key=${encodeURIComponent(trimmedKey)}; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=31536000`
  );

  return res.status(200).json({ message: "API key saved successfully" });
}

