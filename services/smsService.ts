
import { GoogleGenAI } from "@google/genai";

export interface SMSConfig {
  endpoint: string;
  apiKey: string;
  senderId: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
}

// Internal helper to fetch and double-parse settings (envelope + content)
const fetchSetting = async (key: string): Promise<any> => {
  try {
    const res = await fetch(`api/settings.php?key=${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      // First parse: extracts the value (which is likely a JSON string itself)
      const data = JSON.parse(text);
      // Second parse: converts the stored JSON string back into its original object form
      return data ? JSON.parse(data as string) : null;
    } catch (e) {
      console.error(`Error parsing setting ${key}:`, e);
      return null;
    }
  } catch (e) {
    console.error(`Error fetching setting ${key}:`, e);
    return null;
  }
};

const saveSetting = async (key: string, value: any) => {
  try {
    await fetch(`api/settings.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: JSON.stringify(value) })
    });
  } catch (e) {
    console.error(`Error saving setting ${key}:`, e);
  }
};

export const getSMSConfig = async (): Promise<SMSConfig | null> => {
  return await fetchSetting('sms_config') as SMSConfig | null;
};

export const saveSMSConfig = async (config: SMSConfig) => {
  await saveSetting('sms_config', config);
};

export const getCustomTemplates = async (): Promise<SMSTemplate[]> => {
  const templates = await fetchSetting('sms_templates');
  return (templates as SMSTemplate[]) || [];
};

export const saveCustomTemplates = async (templates: SMSTemplate[]) => {
  await saveSetting('sms_templates', templates);
};

export const generateSMSTemplate = async (purpose: string, businessName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional and short SMS message for a business named "${businessName}". The purpose is: "${purpose}". 
      Use the tag "[name]" where the customer's name should be placed (e.g., "Hello [name], ..."). 
      Keep it under 160 characters. Return only the message text.`,
    });
    return response.text?.trim() || "Hello [name], thank you for shopping with us!";
  } catch (error) {
    console.error("Gemini SMS Generation Error:", error);
    return "Hello [name], special offer just for you! Visit our store today.";
  }
};

export const sendActualSMS = async (config: SMSConfig, phone: string, message: string) => {
  try {
    // Detect if unicode (Bengali) is present
    const gsmRegex = /^[\u0000-\u007F]*$/;
    const isUnicode = !gsmRegex.test(message);
    const type = isUnicode ? 'unicode' : 'plain';

    const url = new URL(config.endpoint);
    // Standard parameters for BD SMS Gateways (especially mram.com.bd styles)
    url.searchParams.append('api_key', config.apiKey);
    url.searchParams.append('sender_id', config.senderId);
    url.searchParams.append('recipient', phone); // Changed from 'number' to 'recipient'
    url.searchParams.append('message', message);
    url.searchParams.append('type', type); // Added type parameter

    const response = await fetch(url.toString(), {
      method: 'GET', // Most BD Gateways use GET for simple integration
      mode: 'no-cors' // Often needed if the gateway doesn't have proper CORS headers
    });
    
    // Note: with 'no-cors', we can't see the response body, but we assume success if no error is thrown
    return true; 
  } catch (error) {
    console.error("SMS sending error:", error);
    return false;
  }
};
