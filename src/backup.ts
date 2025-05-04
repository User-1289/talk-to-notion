import { Client as nc } from "@notionhq/client";

const notion = new nc({
  auth: "ntn_D40993838234P7jatP3G8hhkTfKo62riA6QKDANfdne9uN",
});

async function main() {
  const searchResult = await notion.search({
    query: "Dev Kanban Board", // Put your database title here
    filter: {
      property: "object",
      value: "database",
    },
  });

  if (!searchResult.results.length) {
    console.error("No matching database found");
    return;
  }

  const database = searchResult.results[0];
  console.log("Found database:", database.id);

  const queryResponse = await notion.databases.query({
    database_id: database.id,
  });

  for (const page of queryResponse.results) {
    console.log("Page ID:", page.id);

    const fullPage = await notion.pages.retrieve({ page_id: page.id });
    console.log("Page metadata:", fullPage);

    const content = await getPageContent(page.id);

    for (const block of content) {
      if (!("type" in block)) continue;

      const type = block.type;
      const blockContent = (block as any)[type];
      console.log(`Block type: ${type}`);
      console.log("Content:", blockContent);
    }
  }
}

async function getPageContent(pageId: string) {
  const response = await notion.blocks.children.list({
    block_id: pageId,
  });

  console.log("Page block content response:", response.results);
  return response.results;
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((err) => {
    console.error(err);
  });

  app.get('/page/:query', async (req: any, res: any) => {
    const query = req.params.query;
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    let searchResult;
    try {
      searchResult = await notion.search({
        query: query, // Put your database title here
        filter: {
          property: 'object',
          value: 'page',
        },
      })
      if (!searchResult.results.length) {
        return res.status(404).json({ message: 'No matching page found' });
      }
    } catch (error) {
      
    }
  });