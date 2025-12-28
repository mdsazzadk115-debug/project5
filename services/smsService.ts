import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface SMSConfig {
  endpoint: string;
  apiKey: string;
  senderId: string;
}

const fetchSetting = async (key: string) => {
  try {
    const res = await fetch(`api/settings.php?key=${key}`);
    const data = await res.json();
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const saveSetting = async (key: string, value: any) => {
  await fetch(`api/settings.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
};

export const getSMSConfig = async (): Promise<SMSConfig | null> => {
  return await fetchSetting('sms_config');
};

export const saveSMSConfig = async (config: SMSConfig) => {
  await saveSetting('sms_config', config);
};

export const generateSMSTemplate = async (purpose: string, businessName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional and short SMS message for a business named "${businessName}". The purpose is: "${purpose}". Keep it under 160 characters. Return only the message text.`,
    });
    return response.text?.trim() || "Thank you for shopping with us!";
  } catch (error) {
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
    return false;
  }
};