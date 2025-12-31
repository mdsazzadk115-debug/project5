
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

const fetchSetting = async (key: string): Promise<any> => {
  try {
    const res = await fetch(`api/settings.php?key=${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      const data = JSON.parse(text);
      return data ? JSON.parse(data as string) : null;
    } catch (e) {
      return null;
    }
  } catch (e) {
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

/**
 * Generates an SMS template using Gemini.
 * Explicit return type Promise<string> helps resolve inference issues in components.
 */
export const generateSMSTemplate = async (purpose: string, businessName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional SMS message for "${businessName}". Purpose: "${purpose}". Use [name] for customer name. Short & crisp.`,
    });
    // response.text is a getter that returns the generated text or undefined
    return response.text?.trim() || "Hello [name], thank you for shopping with us!";
  } catch (error) {
    console.error("Gemini SMS template generation failed:", error);
    return "Hello [name], check out our new collection!";
  }
};

export const sendActualSMS = async (config: SMSConfig, phone: string, message: string) => {
  try {
    const gsmRegex = /^[\u0000-\u007F]*$/;
    const isUnicode = !gsmRegex.test(message);
    const type = isUnicode ? 'unicode' : 'text';

    // Format phone to include 88 prefix if missing
    let formattedPhone = phone.trim().replace(/[^\d]/g, '');
    if (formattedPhone.length === 11 && formattedPhone.startsWith('01')) {
      formattedPhone = '88' + formattedPhone;
    }

    const response = await fetch('api/send_sms.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: config.endpoint,
        api_key: config.apiKey,
        senderid: config.senderId, // mram uses 'senderid'
        number: formattedPhone,    // mram uses 'number'
        message: message,
        type: type
      })
    });
    
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("SMS sending failed:", error);
    return false;
  }
};
