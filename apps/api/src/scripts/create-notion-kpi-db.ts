import { config } from 'dotenv';
import path from 'path';
import { Client } from '@notionhq/client';
import { KPI_NUMBER_PROPERTIES, KPI_TEXT_PROPERTIES } from '../integrations/notion';

config({ path: path.join(__dirname, '..', '..', '.env') });
config();

const notionToken = process.env.NOTION_TOKEN;
const existingDbId = process.env.NOTION_DB_ID_KPIS || process.env.NOTION_DB_ID;
const parentPageId = process.env.NOTION_KPI_PARENT_PAGE_ID;
const databaseName = process.env.NOTION_KPI_DB_NAME || 'KPI Snapshots (Clean)';

if (!notionToken) {
  throw new Error('NOTION_TOKEN is required to create a Notion KPI database.');
}

const notion = new Client({ auth: notionToken });

async function resolveParent() {
  if (existingDbId) {
    const db = await notion.databases.retrieve({ database_id: existingDbId });
    if (db.parent.type === 'page_id') {
      return { type: 'page_id', page_id: db.parent.page_id };
    }
    if (db.parent.type === 'database_id') {
      return { type: 'database_id', database_id: db.parent.database_id };
    }
  }

  if (parentPageId) {
    return { type: 'page_id', page_id: parentPageId };
  }

  throw new Error(
    'Missing parent. Set NOTION_DB_ID_KPIS or NOTION_KPI_PARENT_PAGE_ID.'
  );
}

async function main() {
  const parent = await resolveParent();

  const properties: Record<string, any> = {
    Name: { title: {} },
    Date: { date: {} },
    Store: { rich_text: {} },
  };

  KPI_NUMBER_PROPERTIES.forEach((name) => {
    properties[name] = { number: { format: 'number' } };
  });

  KPI_TEXT_PROPERTIES.forEach((name) => {
    properties[name] = { rich_text: {} };
  });

  const db = await notion.databases.create({
    parent,
    title: [{ text: { content: databaseName } }],
    properties,
  });

  console.log('New KPI database created:', { id: db.id, url: (db as any).url ?? null });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
