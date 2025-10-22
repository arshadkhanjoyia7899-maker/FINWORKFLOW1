
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, FlaggedTransaction, AiFlaggedTransaction, BilingualAlert } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

// FIX: Use GoogleGenAI instead of the deprecated GoogleGenerativeAI.
const ai = new GoogleGenAI({ apiKey: API_KEY });

const analyzeTransactions = async (policy: string, transactions: Transaction[]): Promise<AiFlaggedTransaction[]> => {
    const prompt = `
        You are an expert expense auditor. Given the following expense policy and a list of transactions, identify any transactions that might violate the policy, especially for ambiguous rules like 'personal or luxury items'. Focus only on non-obvious violations that require human-like judgment. Do not flag items that are clearly covered by a simple rule (like travel > 5000) as that is handled separately.

        Policy:
        ${policy}

        Transactions (JSON):
        ${JSON.stringify(transactions.slice(0, 50))} // Limiting to first 50 for performance

        Respond ONLY with a valid JSON array of flagged transaction objects. Each object must have 'transaction_id', 'reason', and 'confidence' ('low', 'medium', or 'high').
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            transaction_id: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                        },
                        required: ['transaction_id', 'reason', 'confidence']
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AiFlaggedTransaction[];
    } catch (error) {
        console.error("Error calling Gemini API for transaction analysis:", error);
        throw new Error("Failed to analyze transactions with AI.");
    }
};

const generateBilingualAlert = async (flaggedTx: FlaggedTransaction): Promise<BilingualAlert> => {
    const { transaction, reasons } = flaggedTx;
    const reasonText = reasons.map(r => r.detail).join('; ');

    const prompt = `
        You are a corporate communications assistant. Generate a concise, professional alert message for an employee regarding a flagged expense transaction. Provide the alert in both English and Arabic.

        Transaction Details:
        - Vendor: ${transaction.vendor}
        - Amount: ${transaction.amount_SAR} SAR
        - Date: ${transaction.date}
        - Reason for flagging: ${reasonText}

        Respond ONLY with a valid JSON object with 'english' and 'arabic' keys.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        english: { type: Type.STRING },
                        arabic: { type: Type.STRING }
                    },
                    required: ['english', 'arabic']
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as BilingualAlert;
    } catch (error) {
        console.error("Error calling Gemini API for bilingual alert:", error);
        throw new Error("Failed to generate bilingual alert.");
    }
};

export const geminiService = {
    analyzeTransactions,
    generateBilingualAlert
};
