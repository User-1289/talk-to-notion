import express from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';
const app = express();
app.use(cookieParser());
import { Client as nc } from "@notionhq/client";
import { getNotionQueryResponse, getNotionQueryResponseGemini } from './lib/openai';
import dotenv from 'dotenv';
import {retireveQuery} from './lib/notionActions';
dotenv.config();
const NOTION_ACCESS_TOKEN = process.env.NOTION_ACCESS_TOKEN
const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET

console.log("Notion Access Token:", NOTION_ACCESS_TOKEN);
console.log("Auth Client ID:", AUTH_CLIENT_ID);
console.log("Auth Client Secret:", AUTH_CLIENT_SECRET);
const notion = new nc({
  auth: NOTION_ACCESS_TOKEN
})

const PORT = process.env.PORT || 3002;

app.get('/authorize', async (req: any, res: any) => {
  const code = req.query.code as string;

  if (!code) return res.status(400).json({ message: 'Missing code' });

  try {
    const response = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3002/authorize'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );

    //save the tokens to cookies
    res.cookie('access_token', response.data.access_token, {
      maxAge: 100000000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set to true in production
      sameSite: 'strict', // Set to 'strict' or 'lax' based on your needs
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch token',
      error: error.response?.data || error.message,
    });
  }
});

app.get('/page/:query', async (req: any, res: any) => {
  const query = req.params.query;
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!query) {
    return res.status(400).json({ message: 'Missing query' });
  }

  let searchResult;
  try {
    searchResult = await notion.search({
      query: query, // Put your database title here
    })
    if (!searchResult.results.length) {
      return res.status(404).json({ message: 'No matching page found' });
    }
  } catch (error:any) {
    return res.status(500).json({
      message: 'Failed to search for page',
      error: error.message,
    });
  }

  // Get the first page from the search result
  const page = searchResult.results[0];

  //retrieve the children of the page
  const content = await notion.blocks.children.list({
    block_id: page.id,
  });
  console.log("Page block content response:", content.results);

  //loop through the blocks and get the content
  const pageContent = content.results.map((block: any) => {
    if (!("type" in block)) return null;

    const type = block.type;
    const blockContent = (block as any)[type];
    return {
      type,
      content: blockContent,
    };
  }
  ).filter((block: any) => block !== null);
  console.log("Page content:", pageContent);
  res.json({message: 'Page content retrieved successfully', pageContent });
});

app.get('block/add', async (req: any, res: any) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  //create a new block with the data in the body
  const { blockId, type, content } = req.body;
  if (!blockId || !type || !content) {
    return res.status(400).json({ message: 'Missing blockId, type or content' });
  }
  try {

  } catch (error:any) {
    return res.status(500).json({
      message: 'Failed to create block',
      error: error.message,
    });
  }
})

app.get('/notion/:query', async (req: any, res: any) => {
  const query = req.params.query;
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!query) {
    return res.status(400).json({ message: 'Missing query' });
  }

  let llmFormatted = await getNotionQueryResponseGemini(query);
  if (!llmFormatted) {
    return res.status(500).json({ message: 'Failed to get LLM response' });
  }
  console.log("LLM formatted response:", llmFormatted);
  //return res.json({ message: 'LLM response retrieved successfully', llmFormatted });

  try {
    let notionQueryRes = await retireveQuery(llmFormatted);
    if (!notionQueryRes) {
      return res.status(500).json({ message: 'Failed to get Notion query response' });
    }
    console.log("Notion query response:", notionQueryRes);
    return res.json({ message: 'Notion query response retrieved successfully', notionQueryRes });
  } catch (error:any) {
    console.error("Error in Notion query:", error);
    return res.status(500).json({ message: 'Failed to get Notion query response', error: error.message });
  }
})

app.get('/notion/execute', async (req: any, res: any) => {
  //get formatted response from the post body
  const { formattedResponse } = req.body;
  if (!formattedResponse) {
    return res.status(400).json({ message: 'Missing formatted response' });
  }

  
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});

