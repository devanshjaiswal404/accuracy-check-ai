export interface RealBoundingBox {
  id: string;
  label: string;
  ruleClause: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number;
  height: number;
  isCompliant: boolean;
  extractedValue: string;
  severity?: string;
  remediation?: string;
}

export interface RealScanResult {
  productName: string;
  brandName: string;
  category: string;
  score: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  imageUrl: string;
  isInkjetMissing: boolean;
  boxes: RealBoundingBox[];
}

// Client-side canvas compressor to prevent 503 gateway timeouts from oversized payloads
async function compressImageForAI(dataUrl: string, maxDimension = 1200, quality = 0.82): Promise<{ compressedBase64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const pure = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        resolve({ compressedBase64: pure, mimeType: 'image/jpeg' });
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const pureBase64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
      resolve({ compressedBase64: pureBase64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      const pure = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      resolve({ compressedBase64: pure, mimeType: 'image/jpeg' });
    };

    img.src = dataUrl;
  });
}

// Discover supported flash/vision models dynamically from the user's API key
async function getAvailableVisionModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error('ListModels failed');
    const data = await res.json();
    const available = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('flash'))
      .map((m: any) => m.name.replace('models/', ''));

    if (available.length > 0) {
      return available;
    }
  } catch (err) {
    console.warn('Could not query live model list, using fallback priority order.');
  }

  // Fallback candidate list if listModels endpoint is restricted
  return ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
}

export async function analyzePackagingWithAI(rawImageDataUrl: string): Promise<RealScanResult> {
  const apiKey = import.meta.env['VITE_GEMINI_API_KEY'];
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing from your .env file. Add your key and restart Vite.');
  }

  // 1. Compress image to ~150KB to eliminate free-tier 503 gateway timeouts
  const { compressedBase64, mimeType } = await compressImageForAI(rawImageDataUrl);

  const prompt = `
You are a senior enforcement officer of the Legal Metrology Division, Government of India.
Audit the provided packaging label image under The Legal Metrology Act, 2009 and Legal Metrology (Packaged Commodities) Rules, 2011.

Inspect the packaging carefully for:
1. Rule 6(1)(a): Complete Manufacturer / Packer / Importer Name and Address.
2. Rule 6(1)(b): Generic name / Common commodity denomination.
3. Rule 6(1)(c) & Rule 12: Net Quantity with standard legal units (illegal: 'gms', 'grm', 'ml.', 'k.g.').
4. Rule 6(1)(d): Month & Year of manufacture / packaging (Check if the inkjet stamping window is blank or missing).
5. Rule 6(1)(e): Maximum Retail Price (MRP). MUST state "inclusive of all taxes" or "incl. of all taxes".
6. Rule 6(11): Unit Sale Price (USP) if net quantity is > 1 unit/g/ml.
7. Rule 6(1)(n): Consumer Care details (Name/designation, phone, email, and postal address).

Calculate a dynamic statutory compliance score:
- Start at 100. Deduct 20 points for every Critical breach (missing MRP clause, missing net qty, unprinted blank inkjet window).
- Deduct 10 points for Moderate breaches (non-standard SI unit symbol, missing consumer care email).
- Minimum score is 0. Status is 'COMPLIANT' if score >= 85 and 0 critical violations, else 'NON_COMPLIANT'.

Output strictly valid JSON matching this schema:
{
  "productName": "string",
  "brandName": "string",
  "category": "string",
  "score": number,
  "status": "COMPLIANT" | "NON_COMPLIANT",
  "isInkjetMissing": boolean,
  "boxes": [
    {
      "id": "string",
      "label": "string",
      "ruleClause": "string",
      "ymin": number,
      "xmin": number,
      "ymax": number,
      "xmax": number,
      "isCompliant": boolean,
      "extractedValue": "string",
      "remediation": "string or null"
    }
  ]
}
`;

  // 2. Discover available models for this specific API key
  const modelsToTry = await getAvailableVisionModels(apiKey);

  let lastErrorText = '';
  let responseData: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: compressedBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (res.ok) {
          responseData = await res.json();
          break;
        }

        lastErrorText = await res.text();
        console.warn(`Model ${model} attempt ${attempt} returned status ${res.status}.`);

        // If high demand (503/429), wait 1.2s before re-attempting or switching
        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 1200));
        } else {
          break; // If 404 or other client error, move directly to next candidate model
        }
      } catch (err: any) {
        lastErrorText = err.message || 'Network exception';
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (responseData) break;
  }

  if (!responseData) {
    throw new Error(`AI Vision Service Unavailable (${lastErrorText || 'All endpoints busy'}). Please retry in a moment.`);
  }

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No evaluation output from packaging vision engine.');

  const cleanedText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleanedText);

  // Normalize coordinates defensively across both 0-100% and 0-1000 scales
  const norm = (v: any, def: number) => {
    if (v === undefined || v === null || isNaN(Number(v))) return def;
    const num = Number(v);
    return num > 100 ? num / 10 : num;
  };

  const convertedBoxes: RealBoundingBox[] = (parsed.boxes || []).map((b: any, idx: number) => {
    const x = Math.max(0, Math.min(100, norm(b.xmin, 10)));
    const y = Math.max(0, Math.min(100, norm(b.ymin, 10)));
    const x2 = Math.max(x + 5, Math.min(100, norm(b.xmax, x + 20)));
    const y2 = Math.max(y + 3, Math.min(100, norm(b.ymax, y + 10)));

    return {
      id: b.id || `box_${idx}`,
      label: b.label || 'Statutory Item',
      ruleClause: b.ruleClause || 'Rule 6',
      x,
      y,
      width: Math.max(5, x2 - x),
      height: Math.max(3, y2 - y),
      isCompliant: Boolean(b.isCompliant),
      extractedValue: b.extractedValue || 'NOT DETECTED',
      remediation: b.remediation || undefined,
    };
  });

  return {
    productName: parsed.productName || 'Unidentified Specimen',
    brandName: parsed.brandName || 'Packaged Commodity',
    category: parsed.category || 'General Goods',
    score: typeof parsed.score === 'number' ? parsed.score : 50,
    status: parsed.status === 'COMPLIANT' ? 'COMPLIANT' : 'NON_COMPLIANT',
    imageUrl: rawImageDataUrl,
    isInkjetMissing: Boolean(parsed.isInkjetMissing),
    boxes: convertedBoxes,
  };
}