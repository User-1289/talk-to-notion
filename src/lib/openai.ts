import {z} from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from 'openai/helpers/zod';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})
const notionQueryResSchema = z.object({
    intent:z.enum(["retrieve", "create", "update", "delete"]),
    possibleTargetNames:z.array(z.string()),
    content:z.string(),
    isEnoughContent:z.boolean(),
    reasoningForContent:z.string(),
})

export async function getNotionQueryResponse(query: string) {
    try {
        let llmRes = await openai.chat.completions.create({
            model:'gpt-4.1-nano',
            messages:[
                {
                    role:'system',
                    "content":"You are given a natural language text and you need to extract some data that I need from it"
                }
                ,
                {
                    role:'user',
                    content:query
                },
                {
                    role:'user',
                    content:"Please extract the intent of the query, possible target names, content, whether the content is enough, and reasoning for the content. The response should be in JSON format."
                }
            ],
            response_format: zodResponseFormat(notionQueryResSchema, "notionQueryResSchema"),
        })
        console.log("LLM response:", llmRes);
        const response = notionQueryResSchema.parse(llmRes);
        console.log("Parsed response:", response);
        return response;
    } catch (error) {
        console.error("Error in getNotionQueryResponse:", error);
        throw error;
    }
}

export async function getNotionQueryResponseGemini(query: string) {
    try {
        const prompt = `You are given a natural language query related to Notion actions. Extract the required fields. Query: "${query}" 
        Please observe it and check if these details are enough to perform the action, only give isEnoughContent as true if you are sure that the content is enough to perform the action.
        Otherwise, give isEnoughContent as false and provide reasoning for it.
        The way to judge if context is enough is
        - If the query is asking to retrieve data, check if the query has enough information to retrieve the data, like the name of the page, the type of data, etc.
        - If the query is asking to create data, check if the query has enough information to create the data, like the data itself, where to create it, etc.
        - If the query is asking to update data, check if the query has enough information to update the data, like the name of the page, the type of data, etc.
        - If the query is asking to delete data, check if the query has enough information to delete the data, like the name of the page, the type of data, etc.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.STRING,
                            description: "One of: retrieve, create, update, delete",
                        },
                        possibleTargetNames: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                        content: {
                            type: Type.STRING,
                        },
                        isEnoughContent: {
                            type: Type.BOOLEAN,
                        },
                        reasoningForContent: {
                            type: Type.STRING,
                        },
                    },
                    required: ["intent", "possibleTargetNames", "content", "isEnoughContent", "reasoningForContent"],
                },
            },
        });

        const responseText = result.text || "";
        console.log("Raw Gemini response:", responseText);
        
        return JSON.parse(responseText)
    } catch (error) {
        console.error("Error in getNotionQueryResponseGemini:", error);
        throw error;
    }
}