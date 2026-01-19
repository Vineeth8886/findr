import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductCandidate, ProductResult, VendorOption, GroundingLink, ProductTier } from "../types";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === "") {
    throw new Error("INVALID_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
};

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

const handleApiError = (e: any) => {
  const msg = e.message?.toLowerCase() || "";
  
  if (e.message === "INVALID_KEY" || e.status === 400 || msg.includes('400') || msg.includes('invalid') || msg.includes('api key not valid') || msg.includes('must be set')) {
    throw new Error("INVALID_KEY");
  }
  
  if (e.status === 429 || msg.includes('429') || msg.includes('quota')) {
    throw new Error("QUOTA_EXCEEDED");
  }
  
  throw e;
};

export const identifyProducts = async (base64Image: string): Promise<ProductCandidate[]> => {
  try {
    const ai = getAI();
    const prompt = `
      Analyze the image as a professional architectural and procurement engineer. 
      TASK: Identify specific furniture, lighting, and industrial parts.
      Return results strictly in JSON format with normalized bounding boxes [ymin, xmin, ymax, xmax] (0-1000).
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    return handleApiError(e);
  }
};

export const fetchVendorsForProduct = async (
  product: ProductCandidate,
  zipCode: string
): Promise<ProductResult> => {
  try {
    const ai = getAI();
    // HARDENED B2B PROMPT: Explicitly instructs model to bypass retail marketplaces.
    const prompt = `
      TASK: Locate 3-5 high-level B2B industrial vendors or authorized professional dealers in India for: "${product.name}".
      
      STRICT CONSTRAINTS:
      1. DO NOT return results from general consumer retail sites like Amazon, Flipkart, Myntra, or Pepperfry.
      2. ONLY focus on authorized distributors, wholesale industrial hubs, or direct manufacturer sales channels.
      3. SEARCH focus keywords: "B2B authorized dealer", "Industrial wholesale distributor", "GST Registered dealer", "Project procurement price".
      
      CONTEXT: ${product.description}. 
      LOCATION: Proximity to Pincode ${zipCode}.
      RETURN: JSON format. Include 'researchNote' detailing the industrial availability and why consumer marketplaces were bypassed.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
                  url: { type: Type.STRING }
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
      researchNote: parsed.researchNote || "B2B Verification cycle complete. Retail channels excluded.",
      vendors: parsed.vendors || [],
      groundingSources: sources
    };
  } catch (e: any) {
    console.error("Sourcing Error:", e);
    return handleApiError(e);
  }
};

export const resolvePincode = async (pincode: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Resolve Indian Pincode ${pincode} to "City, State". Return only that string.`
    });
    return response.text?.trim() || "Regional Hub";
  } catch (e) {
    return "Regional Hub";
  }
};