
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSMSTemplate = async (purpose: string, businessName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional and short SMS message for a business named "${businessName}". 
      The purpose is: "${purpose}". 
      Keep it under 160 characters. 
      Return only the message text.`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text?.trim() || "Thank you for shopping with us!";
  } catch (error) {
    console.error("Error generating SMS template:", error);
    return "Special offer just for you! Visit our store today.";
  }
};
