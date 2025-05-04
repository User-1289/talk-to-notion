"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
const client_1 = require("@notionhq/client");
const NOTION_ACCESS_TOKEN = process.env.NOTION_ACCESS_TOKEN;
const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID;
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET;
const notion = new client_1.Client({
    auth: NOTION_ACCESS_TOKEN
});
const PORT = process.env.PORT || 3002;
app.get('/authorize', async (req, res) => {
    const code = req.query.code;
    if (!code)
        return res.status(400).json({ message: 'Missing code' });
    try {
        const response = await axios_1.default.post('https://api.notion.com/v1/oauth/token', {
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'http://localhost:3002/authorize'
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' +
                    Buffer.from(`${AUTH_CLIENT_ID}:${AUTH_CLIENT_SECRET}`).toString('base64'),
            },
        });
        //save the tokens to cookies
        res.cookie('access_token', response.data.access_token, {
            maxAge: 100000000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true in production
            sameSite: 'strict', // Set to 'strict' or 'lax' based on your needs
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to fetch token',
            error: error.response?.data || error.message,
        });
    }
});
app.get('/page/:query', async (req, res) => {
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
        });
        if (!searchResult.results.length) {
            return res.status(404).json({ message: 'No matching page found' });
        }
    }
    catch (error) {
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
    const pageContent = content.results.map((block) => {
        if (!("type" in block))
            return null;
        const type = block.type;
        const blockContent = block[type];
        return {
            type,
            content: blockContent,
        };
    }).filter((block) => block !== null);
    console.log("Page content:", pageContent);
    res.json({ message: 'Page content retrieved successfully', pageContent });
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
    console.error('Failed to start server:', err);
});
