
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
    if (!text || text === "null") return null;
    try {
      const data = JSON.parse(text);
      // Safe parsing: if the result of the first parse is still a string, parse it again.
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      console.error(`Error parsing setting for key ${key}:`, e);
      return null;
    }
  } catch (e) {
    console.error(`Error fetching setting for key ${key}:`, e);
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

export const generateSMSTemplate = async (purpose: string, businessName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional SMS message for "${businessName}". Purpose: "${purpose}". Use [name] for customer name. Short & crisp.`,
    });
    return response.text?.trim() || "Hello [name], thank you for shopping with us!";
  } catch (error) {
    console.error("Gemini SMS template generation failed:", error);
    return "Hello [name], check out our new collection!";
  }
};

export const sendActualSMS = async (config: SMSConfig, phone: string, message: string): Promise<{success: boolean, message: string}> => {
  try {
    const gsmRegex = /^[\u0000-\u007F]*$/;
    const isUnicode = !gsmRegex.test(message);
    const type = isUnicode ? 'unicode' : 'text';

    // ফোন নম্বর ফরম্যাট করা (৮৮ প্রিফিক্স নিশ্চিত করা)
    let formattedPhone = phone.trim().replace(/[^\d]/g, '');
    if (formattedPhone.length === 11 && formattedPhone.startsWith('01')) {
      formattedPhone = '88' + formattedPhone;
    }

    // আপনার দেওয়া ডকুমেন্টেশন অনুযায়ী বডি তৈরি
    const response = await fetch('api/send_sms.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        senderid: config.senderId,
        type: type,
        msg: message,        // 'message' এর বদলে 'msg'
        contacts: formattedPhone // 'number' এর বদলে 'contacts'
      })
    });
    
    if (!response.ok) {
      return { success: false, message: `Server Error: ${response.statusText}` };
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("SMS sending failed:", error);
    return { success: false, message: error.message || 'Unknown network error' };
  }
};
