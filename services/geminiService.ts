import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductCandidate, ProductResult, VendorOption, GroundingLink, ProductTier } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Robustly extracts and parses JSON from a string that might contain markdown blocks.
 */
const parseRobustJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0].replace(/\[\d+\]/g, ''));
      } catch (innerError) {
        console.error("Failed to parse extracted JSON block:", innerError);
        throw new Error("Neural response format was corrupted.");
      }
    }
    throw new Error("No valid identification data found in response.");
  }
};

const handleQuotaError = (e: any) => {
  if (e.message?.includes('429') || e.status === 429) {
    throw new Error("API Quota Reached. Please use a paid API key for high-volume procurement.");
  }
  throw e;
};

export const identifyProducts = async (base64Image: string): Promise<ProductCandidate[]> => {
  const ai = getAI();
  const prompt = `
    Analyze the image as a professional architectural and procurement engineer. 
    TASK: Identify specific furniture, lighting, and industrial parts.
    
    CRITICAL: Segment and identify the following structural and surface assets separately:
    1. FLOORING: Hard surfaces like Marble, Hardwood, Concrete, or Ceramic tiles.
    2. CARPETS: Decorative area rugs, wall-to-wall carpeting, or floor mats.
    3. WALL FINISHES: Paneling, stone cladding, wallpaper, or specific paint textures.
    
    Return results strictly in JSON format with normalized bounding boxes [ymin, xmin, ymax, xmax] (0-1000).
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Switched to Flash to preserve your quota
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              tier: { type: Type.STRING },
              boundingBox: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER }
              }
            },
            required: ['id', 'name', 'description', 'category', 'tier', 'boundingBox']
          }
        }
      }
    });

    return parseRobustJson(response.text || '[]');
  } catch (e: any) {
    console.error("Identification Error:", e);
    return handleQuotaError(e);
  }
};

export const fetchVendorsForProduct = async (
  product: ProductCandidate,
  zipCode: string
): Promise<ProductResult> => {
  const ai = getAI();
  const prompt = `
    TASK: Find 3-5 real vendors in India for: "${product.name}".
    CONTEXT: ${product.description}. 
    LOCATION: Pincode ${zipCode}.
    
    RETURN: JSON with a list of vendors. Include 'researchNote' explaining the availability landscape.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Keep Pro for sourcing as it uses Search Grounding better
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            researchNote: { type: Type.STRING },
            vendors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  vendor: { type: Type.STRING },
                  price: { type: Type.STRING },
                  numericPrice: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  availability: { type: Type.STRING },
                  deliveryDate: { type: Type.STRING },
                  daysToDelivery: { type: Type.NUMBER },
                  url: { type: Type.STRING },
                  productImage: { type: Type.STRING },
                  address: { type: Type.STRING },
                  reliabilityScore: { type: Type.NUMBER }
                },
                required: ['vendor', 'price', 'numericPrice', 'url', 'unit']
              }
            }
          },
          required: ['researchNote', 'vendors']
        }
      }
    });

    const parsed = parseRobustJson(response.text || '{}');
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingLink[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title || chunk.web.uri
      }));

    return {
      productName: product.name,
      tier: product.tier,
      researchNote: parsed.researchNote || "Deep scan complete.",
      vendors: parsed.vendors || [],
      groundingSources: sources
    };
  } catch (e: any) {
    console.error("Sourcing Error:", e);
    if (e.message?.includes('429')) return handleQuotaError(e);
    return {
      productName: product.name,
      tier: product.tier,
      researchNote: "Automated verification encountered a catalog wall. Manual outreach recommended.",
      vendors: [],
      groundingSources: []
    };
  }
};

export const resolvePincode = async (pincode: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resolve Indian Pincode ${pincode} to "City, State". Return only that string.`
    });
    return response.text?.trim() || "Regional Hub";
  } catch (e) {
    return "Regional Hub";
  }
};