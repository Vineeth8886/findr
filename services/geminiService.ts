
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductCandidate, ProductResult, VendorOption, GroundingLink, ProductTier, DetailedSpecs, AncillaryItem, NegotiationStrategy } from "../types";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === "") throw new Error("INVALID_KEY");
  return new GoogleGenAI({ apiKey: key });
};

const parseRobustJson = (text: string) => {
  if (!text) throw new Error("Neural engine returned empty response.");
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to extract JSON from code blocks or raw text
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerE) {
        throw new Error("Neural response format mismatch.");
      }
    }
    // Attempt to clean markdown wrapper
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanText);
    } catch (cleanE) {
        throw new Error("Neural response corrupted.");
    }
  }
};

const handleApiError = (e: any) => {
  const msg = e.message?.toLowerCase() || "";
  console.error("Gemini API Error:", e);
  if (msg.includes('api key') || e.status === 400 || msg.includes('not found') || msg.includes('invalid')) throw new Error("INVALID_KEY");
  if (e.status === 429) throw new Error("QUOTA_EXCEEDED");
  if (msg.includes('safety') || msg.includes('blocked')) throw new Error("The model blocked this content for safety reasons.");
  throw new Error(e.message || "An unexpected error occurred in the neural pipeline.");
};

export const identifyProducts = async (base64Image: string): Promise<{ products: ProductCandidate[], summary: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "Analyze this image for a B2B Bill of Quantities. Identify distinct furniture, fixtures, architectural elements, and equipment. For each item, estimate its 2D bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) and real-world dimensions. Return a JSON object with a 'summary' of the scene and a 'products' array." }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  tier: { type: Type.STRING, enum: ["Luxury", "Premium", "Standard", "Budget"] },
                  quantity: { type: Type.NUMBER },
                  suggestedUnit: { type: Type.STRING },
                  dimensions: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  boundingBox: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "ymin, xmin, ymax, xmax normalized to 1000"
                  }
                },
                required: ["name", "category", "quantity"]
              }
            }
          },
          required: ["summary", "products"]
        }
      }
    });

    const parsed = parseRobustJson(response.text);
    
    // Post-process to ensure valid bounding boxes and IDs
    const validProducts = (Array.isArray(parsed.products) ? parsed.products : []).map((p: any, idx: number) => ({
      ...p,
      id: p.id || `auto-${Date.now()}-${idx}`,
      tier: p.tier || "Standard",
      quantity: p.quantity || 1,
      suggestedUnit: p.suggestedUnit || "Nos",
      confidence: p.confidence || 85,
      boundingBox: (p.boundingBox && p.boundingBox.length === 4) ? p.boundingBox : [0,0,0,0]
    }));

    return {
      products: validProducts,
      summary: typeof parsed.summary === 'string' ? parsed.summary : "Visual analysis complete."
    };
  } catch (e) { return handleApiError(e); }
};

export const fetchVendorsForProduct = async (product: ProductCandidate, zipCode: string): Promise<ProductResult> => {
  try {
    const ai = getAI();
    const prompt = `B2B Procurement sourcing for industrial asset: "${product.name}" (${product.description}) in Pincode ${zipCode}, India. 
    Find professional B2B vendors, manufacturers or wholesale dealers. Avoid generic retail marketplaces like Amazon if possible.
    Identify technical specifications like Material, Finish, and Compliance (ISI/ISO).
    Estimate a local per-unit labor installation rate in INR.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 24000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            researchNote: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            estimatedLaborRate: { type: Type.NUMBER },
            dimensions: { type: Type.STRING },
            specsDetail: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.STRING },
                finish: { type: Type.STRING },
                compliance: { type: Type.STRING },
                warranty: { type: Type.STRING }
              }
            },
            vendors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  vendor: { type: Type.STRING },
                  price: { type: Type.STRING },
                  numericPrice: { type: Type.NUMBER },
                  moq: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  availability: { type: Type.STRING },
                  contactPhone: { type: Type.STRING },
                  gstNumber: { type: Type.STRING },
                  gstStatus: { type: Type.STRING },
                  isManufacturer: { type: Type.BOOLEAN },
                  url: { type: Type.STRING },
                  daysToDelivery: { type: Type.NUMBER },
                  address: { type: Type.STRING },
                  reliabilityScore: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const parsed = parseRobustJson(response.text);
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = grounding.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title || c.web.uri }));

    return {
      id: product.id,
      productName: product.name,
      description: product.description,
      tier: product.tier as ProductTier,
      researchNote: parsed.researchNote || "Deep market research complete.",
      vendors: Array.isArray(parsed.vendors) ? parsed.vendors.slice(0, 3) : [],
      groundingSources: sources,
      quantity: product.quantity,
      unit: product.suggestedUnit,
      dimensions: parsed.dimensions || product.dimensions || "Verified on Site",
      boundingBox: product.boundingBox,
      scanSource: "Reference_Scene.jpg",
      scanZone: "Calculated",
      scanConfidence: parsed.confidence || 95,
      specsDetail: parsed.specsDetail || { material: "Steel/Wood", finish: "Industrial", compliance: "IS/ISO", warranty: "12 Months" },
      estimatedLaborRate: parsed.estimatedLaborRate || 500
    };
  } catch (e) { return handleApiError(e); }
};

export const autoCompleteBOQ = async (results: ProductResult[]): Promise<Record<string, AncillaryItem[]>> => {
  try {
    const ai = getAI();
    const prompt = `
      Act as a Professional Quantity Surveyor and Procurement Manager.
      Review the following primary assets identified for a Bill of Quantities (BOQ):
      ${JSON.stringify(results.map(r => ({
        id: r.id, 
        name: r.productName, 
        qty: r.quantity, 
        unit: r.unit,
        tier: r.tier
      })))}

      TASK: Generate a list of MANDATORY ancillary items (installation hardware, surface preparation materials, consumables, and labor tasks) required to complete the installation of each primary asset.

      RULES FOR PRICING & QUANTITY:
      1. QUANTITY: Must be logically calculated based on the primary asset qty. (e.g., For 100sqft tiles, add 8-10 bags of adhesive).
      2. RATE: Use realistic current B2B market rates in INR (India). DO NOT use zero or dummy values.
      3. TOTAL: Must be correctly calculated as (quantity * rate).
      4. CATEGORY: Assign to 'Material', 'Labor', 'Consumable', or 'Wastage'.
      5. STRICT MATCHING: The Keys of the returned JSON object MUST match the 'id' of the provided assets exactly.

      RETURN FORMAT: A JSON object where keys are parentProductId and values are arrays of AncillaryItem objects.
      Each AncillaryItem: { id, parentProductId, name, description, quantity, unit, rate, total, category }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 24000 }
      }
    });
    
    const parsed: Record<string, AncillaryItem[]> = parseRobustJson(response.text);
    
    // Post-process to ensure no zero values and fix calculations
    Object.keys(parsed).forEach(parentId => {
      if (Array.isArray(parsed[parentId])) {
        parsed[parentId] = parsed[parentId].map(item => {
          const qty = item.quantity || 1;
          const rate = item.rate || 100;
          return {
            ...item,
            quantity: qty,
            rate: rate,
            total: qty * rate
          };
        });
      }
    });

    return parsed;
  } catch (e) { return handleApiError(e); }
};

export const generateNegotiationTactics = async (productName: string, vendorName: string, currentPrice: number, quantity: number): Promise<NegotiationStrategy> => {
  try {
    const ai = getAI();
    const prompt = `
      Act as a ruthless B2B procurement negotiator.
      Product: "${productName}", Qty: ${quantity}.
      Vendor: "${vendorName}", Current Quote: ${currentPrice} INR per unit.
      
      Determine a realistic "Target Price" (approx 10-15% lower) and "Opening Offer" (20% lower).
      Provide 3 specific, hard-hitting talking points to use in an email or call.
      Identify 2 leverage points (e.g. bulk order, competitor quotes).
      
      Return JSON: { targetPrice, openingOffer, savings, talkingPoints: [], leverage: [], vendorPsychology }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return parseRobustJson(response.text);
  } catch (e) {
    // Fallback strategy if AI fails
    return {
      targetPrice: Math.floor(currentPrice * 0.9),
      openingOffer: Math.floor(currentPrice * 0.82),
      savings: Math.floor(currentPrice * 0.1 * quantity),
      talkingPoints: ["Mention immediate payment terms for discount.", "Cite lower rates from regional competitor."],
      leverage: ["Bulk volume commitment", "Future project pipeline"],
      vendorPsychology: "Vendor likely prioritized volume over margin."
    };
  }
};

export const resolvePincode = async (pincode: string): Promise<string> => {
  if (!pincode || pincode.length < 6) return "";
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Return the "City, State" for Indian Pincode ${pincode}. No extra text.`
    });
    return response.text.trim();
  } catch (e) { return "Hub Identified"; }
};
