
import { GoogleGenAI } from "@google/genai";

export interface SMSConfig {
  endpoint: string;
  apiKey: string;
  senderId: string;
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
      // Casting 'data' to string because stored settings are JSON-encoded twice
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

export const generateSMSTemplate = async (purpose: string, businessName: string) => {
  try {
    // Initialize inside the function to capture the environment's API key correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional and short SMS message for a business named "${businessName}". The purpose is: "${purpose}". Keep it under 160 characters. Return only the message text.`,
    });
    return response.text?.trim() || "Thank you for shopping with us!";
  } catch (error) {
    console.error("Gemini SMS Generation Error:", error);
    return "Special offer just for you! Visit our store today.";
  }
};

export const sendActualSMS = async (config: SMSConfig, phone: string, message: string) => {
  try {
    const url = new URL(config.endpoint);
    url.searchParams.append('api_key', config.apiKey);
    url.searchParams.append('sender_id', config.senderId);
    url.searchParams.append('number', phone);
    url.searchParams.append('message', message);
    const response = await fetch(url.toString());
    return response.ok;
  } catch (error) {
    console.error("SMS sending error:", error);
    return false;
  }
};
