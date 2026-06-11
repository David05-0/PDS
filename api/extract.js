// api/extract.js — Vercel serverless function
// Proxies AI extraction requests to Anthropic, avoiding browser CORS restrictions.
// Requires: ANTHROPIC_API_KEY environment variable set in Vercel project settings.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured. Go to your Vercel project → Settings → Environment Variables → add ANTHROPIC_API_KEY with your key from console.anthropic.com'
    });
  }

  const { imageData, mediaType } = req.body || {};
  if (!imageData) {
    return res.status(400).json({ error: 'Missing imageData in request body.' });
  }

  const safeMediaType = (mediaType && mediaType.startsWith('image/')) ? mediaType : 'image/jpeg';

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: safeMediaType, data: imageData }
            },
            {
              type: 'text',
              text: `Extract all personal data from this Philippine government document or ID image.
Return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.
Use empty string "" for any field not found. Keys must be exactly:
{
  "surname":"","firstName":"","middleName":"","nameExt":"",
  "dob":"","pob":"","sex":"","civil":"",
  "height":"","weight":"","blood":"","citizenship":"",
  "umid":"","pagibig":"","philhealth":"","philsys":"","tin":"","agencyNo":"",
  "mobileNo":"","telNo":"","email":"",
  "residHouseNo":"","residStreet":"","residSubdiv":"","residBrgy":"","residCity":"","residProv":"","residZip":"",
  "permHouseNo":"","permStreet":"","permSubdiv":"","permBrgy":"","permCity":"","permProv":"","permZip":"",
  "department":"","position":"",
  "spouseSurname":"","spouseFirstName":"","spouseMiddleName":"",
  "fatherSurname":"","fatherFirstName":"","fatherMiddleName":"",
  "motherSurname":"","motherFirstName":"","motherMiddleName":"",
  "govtId":"","govtIdNo":"","govtIdIssuance":""
}
For dob use YYYY-MM-DD format if determinable. Return JSON only.`
            }
          ]
        }]
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({
        error: data?.error?.message || 'Anthropic API error (HTTP ' + anthropicRes.status + ')'
      });
    }

    // Parse the JSON the model returned inside its text block
    const rawText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    let extracted;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      extracted = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'AI returned unparseable data. Try a clearer image.' });
    }

    return res.status(200).json({ extracted });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
