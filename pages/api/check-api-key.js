export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if API key exists in cookie (without exposing the value)
  const hasApiKey = !!req.cookies.anthropic_api_key;

  return res.status(200).json({ hasApiKey });
}

