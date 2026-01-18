
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ProductCandidate, ProductResult, VendorOption, GroundingLink, ProductTier } from "../types";

// Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) right before making an API call to ensure it always uses the most up-to-date API key.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const identifyProducts = async (base64Image: string): Promise<ProductCandidate[]> => {
  const ai = getAI();
  const prompt = `
    Analyze the image as a professional architectural and procurement engineer. 
    TASK: Identify specific furniture, lighting, and industrial parts.
    
    CRITICAL: Segment and identify the following structural and surface assets separately:
    1. FLOORING: Hard surfaces like Marble, Hardwood, Concrete, or Ceramic tiles.
    2. CARPETS: Decorative area rugs, wall-to-wall carpeting, or floor mats.
    3. WALL FINISHES: Paneling, stone cladding, wallpaper, or specific paint textures.
    
    Ensure architectural finishes get distinct bounding boxes representing clear sections of the material.
    Return results in JSON format with normalized bounding boxes [ymin, xmin, ymax, xmax] (0-1000).
  `;

  try {
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

    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Identification Error:", e);
    throw new Error("Could not segment the scene. Please clarify the target objects.");
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
    LOCATION: Pincode ${zipCode} (calculate shipping lead times).
    
    SEARCH STRATEGY:
    1. Search for authorized distributors, wholesale suppliers, and specialized D2C brands.
    2. Prioritize vendors like Kohler India, Jaquar, Pepperfry, IKEA India, or niche B2B suppliers.
    3. If exact model isn't found, find the closest high-integrity alternative matching the spec.
    
    RETURN: JSON with a list of vendors. Include 'researchNote' explaining the availability landscape.
  `;

  try {
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

    // Clean citations like [1], [2] from the response text as they can break JSON.parse 
    // when using search grounding tools.
    const cleanJson = (response.text || '{"vendors": [], "researchNote": "No matches found."}').replace(/\[\d+\]/g, '');
    const parsed = JSON.parse(cleanJson);
    
    // Extract grounding sources if available
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
    // Handle "Requested entity was not found" error by indicating key issues if necessary
    return {
      productName: product.name,
      tier: product.tier,
      researchNote: e.message?.includes('not found') 
        ? "API access denied. Please re-connect your key." 
        : "Automated verification encountered a catalog wall. Manual outreach recommended.",
      vendors: [],
      groundingSources: []
    };
  }
};

export const resolvePincode = async (pincode: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Resolve Indian Pincode ${pincode} to "City, State". Return only that string.`
  });
  return response.text?.trim() || "Regional Hub";
};
