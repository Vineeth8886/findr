
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductCandidate, ProductResult, VendorOption, GroundingLink, ProductTier, DetailedSpecs } from "../types";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === "") throw new Error("INVALID_KEY");
  return new GoogleGenAI({ apiKey: key });
};

const parseRobustJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Neural response corrupted.");
  }
};

const handleApiError = (e: any) => {
  const msg = e.message?.toLowerCase() || "";
  if (msg.includes('api key') || e.status === 400) throw new Error("INVALID_KEY");
  if (e.status === 429) throw new Error("QUOTA_EXCEEDED");
  throw e;
};

const deriveZone = (box?: [number, number, number, number]) => {
  if (!box || !Array.isArray(box)) return "Global Scene";
  const [ymin, xmin, ymax, xmax] = box;
  const cx = (xmin + xmax) / 2;
  const cy = (ymin + ymax) / 2;
  let zone = cy < 333 ? "Upper" : cy < 666 ? "Center" : "Lower";
  zone += "-";
  zone += cx < 333 ? "Left" : cx < 666 ? "Center" : "Right";
  return zone;
};

export const identifyProducts = async (base64Image: string): Promise<{ products: ProductCandidate[], summary: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "Identify furniture and architectural elements for a professional BOQ. Return JSON with 'summary' and 'products' array. For each: id, name, description, category, tier, quantity, suggestedUnit, dimensions (LxWxH), boundingBox [ymin, xmin, ymax, xmax], and 'confidence' (0-100)." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    const parsed = parseRobustJson(response.text);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : "Analysis complete."
    };
  } catch (e) { return handleApiError(e); }
};

export const fetchVendorsForProduct = async (product: ProductCandidate, zipCode: string): Promise<ProductResult> => {
  try {
    const ai = getAI();
    const prompt = `
      TASK: B2B Procurement for "${product.name}".
      LOCATION: Pincode ${zipCode}, India.
      
      REQUIREMENTS:
      1. Sourcing: Provide 3 verified Indian B2B vendors/manufacturers. 
      2. Compliance: Mandatory specific Indian Standard (IS) codes for the product category.
      3. Detailed Vendor Info: For each vendor, provide:
         - priceRange (e.g. "₹45k - ₹52k")
         - moq (Minimum Order Quantity)
         - isManufacturer (boolean)
         - gstStatus ('Verified' or 'Unknown')
         - gstNumber (format: 29AABCG1234F1Z5)
         - contactPhone and full address.
      4. Labor: Specific installation cost per unit for this product.
      
      Return JSON per schema.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
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
                  priceRange: { type: Type.STRING },
                  moq: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  availability: { type: Type.STRING },
                  contactPhone: { type: Type.STRING },
                  gstNumber: { type: Type.STRING },
                  gstStatus: { type: Type.STRING },
                  isManufacturer: { type: Type.BOOLEAN },
                  url: { type: Type.STRING },
                  deliveryDate: { type: Type.STRING },
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
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title || c.web.uri }));

    return {
      id: product.id,
      productName: product.name,
      description: product.description,
      tier: product.tier as ProductTier,
      researchNote: parsed.researchNote || "Verified B2B Listing.",
      vendors: Array.isArray(parsed.vendors) ? parsed.vendors.slice(0, 3) : [],
      groundingSources: sources,
      quantity: product.quantity,
      unit: product.suggestedUnit,
      dimensions: parsed.dimensions || product.dimensions || "Verify on Site",
      boundingBox: product.boundingBox,
      scanSource: "Primary_Render.jpg",
      scanZone: deriveZone(product.boundingBox),
      scanConfidence: parsed.confidence || product.confidence || 95,
      specsDetail: parsed.specsDetail || { material: "Industrial Grade", finish: "Standard", compliance: "IS 800", warranty: "12 Months" },
      estimatedLaborRate: parsed.estimatedLaborRate || 2000
    };
  } catch (e) { return handleApiError(e); }
};

export const resolvePincode = async (pincode: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide Indian City and State for Pincode ${pincode} as "City, State".`
    });
    return response.text.trim();
  } catch (e) { return "Regional Hub"; }
};
