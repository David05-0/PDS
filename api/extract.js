// api/extract.js — Vercel serverless function
// Proxies image data to Anthropic API to avoid CORS
// Set ANTHROPIC_API_KEY in your Vercel project environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Go to Vercel → Settings → Environment Variables and add your key from console.anthropic.com, then redeploy.'
    });
  }

  const { imageData, mediaType } = req.body;
  if (!imageData || !mediaType) {
    return res.status(400).json({ error: 'Missing imageData or mediaType' });
  }

  // The JSON template we want filled — used both in prompt and as prefill
  const JSON_TEMPLATE = `{
  "surname": "",
  "firstName": "",
  "middleName": "",
  "nameExt": "",
  "dob": "",
  "pob": "",
  "sex": "",
  "civil": "",
  "height": "",
  "weight": "",
  "blood": "",
  "citizenship": "",
  "umid": "",
  "pagibig": "",
  "philhealth": "",
  "philsys": "",
  "tin": "",
  "agencyNo": "",
  "residHouseNo": "",
  "residStreet": "",
  "residSubdiv": "",
  "residBrgy": "",
  "residCity": "",
  "residProv": "",
  "residZip": "",
  "permHouseNo": "",
  "permStreet": "",
  "permSubdiv": "",
  "permBrgy": "",
  "permCity": "",
  "permProv": "",
  "permZip": "",
  "telNo": "",
  "mobileNo": "",
  "email": "",
  "department": "",
  "position": "",
  "spouseSurname": "",
  "spouseFirstName": "",
  "spouseMiddleName": "",
  "fatherSurname": "",
  "fatherFirstName": "",
  "fatherMiddleName": "",
  "motherSurname": "",
  "motherFirstName": "",
  "motherMiddleName": "",
  "govtId": "",
  "govtIdNo": "",
  "govtIdIssuance": ""
}`;

  const userPrompt = `You are a data extraction engine for Philippine government PDS forms and IDs.
Look at the document image and extract every visible personal data field.

Rules:
- dob format: YYYY-MM-DD (convert from any format you see, e.g. "10 FEBRUARY 2003" → "2003-02-10", "23-Jun-2026" → "2026-06-23")
- sex: exactly "Male" or "Female"
- civil: exactly "Single", "Married", "Widow/er", or "Separated"
- citizenship: "Filipino" unless another is visible
- For DFA forms: LAST NAME/APELYIDO=surname, FIRST NAME/PANGALAN=firstName, MIDDLE NAME/GITNANG PANGALAN=middleName, PLACE OF BIRTH/POOK NG KAPANGANAKAN=pob
- For addresses: split into house/lot number, street, subdivision, barangay, city, province components
- Leave field as empty string "" if not visible in the document
- Output ONLY valid JSON, nothing else — no explanation, no markdown fences`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        // Prefill forces the model to continue from "{" — guarantees JSON output
        system: 'You are a JSON-only data extraction engine. You output only valid JSON objects, never any other text.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageData }
              },
              {
                type: 'text',
                text: userPrompt + '\n\nFill in this exact JSON template with data from the image:\n' + JSON_TEMPLATE
              }
            ]
          },
          // Assistant prefill — model MUST continue from here, guaranteeing JSON
          {
            role: 'assistant',
            content: '{'
          }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: errData.error?.message || `Anthropic API error (HTTP ${anthropicRes.status})`
      });
    }

    const data = await anthropicRes.json();
    const rawText = (data.content || []).map(b => b.text || '').join('').trim();

    // The prefill was "{", so prepend it back and parse
    let jsonStr = '{' + rawText;

    // Also strip any accidental markdown fences
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```[\s\S]*$/, '').trim();

    // If it still doesn't start with {, try to extract the first {...} block
    if (!jsonStr.startsWith('{')) {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }

    let extracted;
    try {
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Last resort: try to extract JSON substring
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          extracted = JSON.parse(match[0]);
        } catch {
          return res.status(422).json({
            error: 'The AI could not produce valid JSON from this document. Try a higher-quality image or a different page.',
            raw: rawText.slice(0, 300)
          });
        }
      } else {
        return res.status(422).json({
          error: 'The AI could not produce valid JSON from this document. Try a higher-quality image or a different page.',
          raw: rawText.slice(0, 300)
        });
      }
    }

    // Sanitize: ensure all values are strings
    const sanitized = {};
    for (const [k, v] of Object.entries(extracted)) {
      sanitized[k] = v == null ? '' : String(v).trim();
    }

    return res.status(200).json({ extracted: sanitized });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
