import { Client as nc } from "@notionhq/client";
import dotenv from 'dotenv';
dotenv.config();
const NOTION_ACCESS_TOKEN = process.env.NOTION_ACCESS_TOKEN
const notion = new nc({
  auth: NOTION_ACCESS_TOKEN
})

export async function retireveQuery(llmFormattedQuery: any) {
  try {
    const { intent, possibleTargetNames, content, isEnoughContent, reasoningForContent } = llmFormattedQuery;
    console.log("LLM formatted query:", llmFormattedQuery);

    if (!intent || !possibleTargetNames || !content || isEnoughContent === undefined || !reasoningForContent) {
      throw new Error("Invalid LLM formatted query");
    }
    const searchResults = await notion.search({
      query: possibleTargetNames[0],
      sort: {
        direction: "descending",
        timestamp: "last_edited_time"
      }
    });
    console.log("Search results:", searchResults.results[0]);

    let matched = searchResults.results[0]
    //const matched = searchResults.results.find((result: any) => {
    //  const title = result.properties?.Name?.title?.[0]?.plain_text || result.title?.[0]?.plain_text || "";
    //  return possibleTargetNames.some((name:any) => title.toLowerCase().includes(name.toLowerCase()));
    //});

    if(intent==="create"){
      const createBlock = await notion.blocks.children.append({
        block_id: matched?.id || "",
        children: [
          {
            type: "to_do",
            to_do:{
              rich_text:[
                {
                  type: "text",
                  text: {
                    content: content,
                  },
                },
              ]
            }
          },
        ],
      });
      console.log("Block created:", createBlock);
      return createBlock;
    }

    if (!matched) {
      throw new Error("No matching Notion page or database found.");
    }
    console.log("Matched Notion page or database:", matched);

    const matchedId = matched.id;
    const isDatabase = matched.object === "database";

    if (isDatabase) {
      const dbQuery = await notion.databases.query({
        database_id: matchedId,
        filter: {
          property: "Status",
          status: {
            equals: "Not Started"
          }
        }
      });
      console.log("Database query result:", dbQuery);
      return dbQuery;
    } else {
      const page = await notion.blocks.retrieve({ block_id: matchedId });
      console.log("Retrieved page:", page);
      return page;
    }

  } catch (error) {
    console.error("Error in retireveQuery:", error);
    throw error;
  }
}