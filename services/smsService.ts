
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface SMSConfig {
  endpoint: string;
  apiKey: string;
  senderId: string;
}

export const getSMSConfig = (): SMSConfig | null => {
  const saved = localStorage.getItem('sms_api_config');
  return saved ? JSON.parse(saved) : null;
};

export const saveSMSConfig = (config: SMSConfig) => {
  localStorage.setItem('sms_api_config', JSON.stringify(config));
};

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

/**
 * Sends SMS via the configured Gateway
 */
export const sendActualSMS = async (config: SMSConfig, phone: string, message: string) => {
  try {
    // This is a generic implementation. Most BD SMS Gateways use a GET or POST request.
    // Replace this logic with your specific provider's documentation requirements.
    const url = new URL(config.endpoint);
    
    // Common query params for many BD providers
    url.searchParams.append('api_key', config.apiKey);
    url.searchParams.append('sender_id', config.senderId);
    url.searchParams.append('number', phone);
    url.searchParams.append('message', message);

    const response = await fetch(url.toString(), {
      method: 'GET', // or POST depending on provider
    });

    return response.ok;
  } catch (error) {
    console.error("SMS API Call failed:", error);
    return false;
  }
};
