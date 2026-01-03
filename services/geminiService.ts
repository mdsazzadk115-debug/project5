
import { GoogleGenAI, Type } from "@google/genai";
import { DashboardStats } from "../types";

export const getBusinessInsights = async (stats: DashboardStats) => {
  try {
    // Initialize inside the function to capture the environment's API key correctly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these business stats:
      Profit: ৳${stats.netProfit}
      Total Expenses: ৳${stats.totalExpenses}
      Total Orders: ${stats.orders}
      Total Customers: ${stats.customers}
      
      Provide 3 short, actionable business insights to improve performance based on these metrics.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["insights"]
        }
      }
    });

    // Use .text property directly
    const result = JSON.parse(response.text || '{"insights": []}');
    return result.insights;
  } catch (error) {
    console.error("Error fetching Gemini insights:", error);
    return ["Optimize marketing spend to reach more customers.", "Review shipping costs to improve net margin.", "Run a loyalty campaign for your existing customer base."];
  }
};
