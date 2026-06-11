// api/extract.js — Vercel serverless function
// Proxies image data to Anthropic API to avoid CORS
// Set ANTHROPIC_API_KEY in your Vercel project environment variables

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set. Please add it in your Vercel project settings.' });
  }

  const { imageData, mediaType } = req.body;
  if (!imageData || !mediaType) {
    return res.status(400).json({ error: 'Missing imageData or mediaType' });
  }

  const prompt = `You are a Philippine government PDS (Personal Data Sheet CS Form 212) data extractor.
Analyze the provided document image carefully. Extract all visible personal information.

Return ONLY a valid JSON object (no markdown, no extra text) with these exact keys (leave empty string "" if not found):
{
  "surname": "",
  "firstName": "",
  "middleName": "",
  "nameExt": "",
  "dob": "YYYY-MM-DD",
  "pob": "",
  "sex": "Male or Female",
  "civil": "Single or Married or Widow/er or Separated",
  "height": "",
  "weight": "",
  "blood": "",
  "citizenship": "Filipino",
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
}

Important notes:
- For DFA Passport Application Form: LAST NAME/APELYIDO = surname, FIRST NAME/PANGALAN = firstName, MIDDLE NAME/GITNANG PANGALAN = middleName, PLACE OF BIRTH/POOK NG KAPANGANAKAN = pob, DATE OF BIRTH in dd MONTH YYYY or dd/mm/yyyy -> convert to YYYY-MM-DD format
- For Philippine IDs: extract all visible fields
- For address fields: parse into components (house number, street, subdivision, barangay, city/municipality, province)
- SEX: output exactly "Male" or "Female"
- Civil Status: output exactly "Single", "Married", "Widow/er", or "Separated"
- Return ONLY the JSON object. Absolutely no other text, no explanation, no markdown.`;

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
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: errData.error?.message || 'Anthropic API error'
      });
    }

    const data = await anthropicRes.json();
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    // Strip markdown code fences if model adds them
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

    let extracted;
    try {
      extracted = JSON.parse(clean);
    } catch {
      return res.status(422).json({ error: 'Could not parse AI response. Try a clearer image.', raw: clean });
    }

    return res.status(200).json({ extracted });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
