#!/usr/bin/env node
/**
 * Pull PocketBase collection schemas and sample data
 * Saves to docs/collections/ for reference during refactoring
 */

import { createNullableStringUnion } from "typescript";

const PB_API = "https://api-db.reiwarden.io.vn";

interface PBCollection {
  id: string;
  name: string;
  type: string;
  system: boolean;
  schema: Array<any>;
  created: string;
  updated: string;
  indexes?: string[];
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
}

async function pullCollections(token?: string) {
  try {
    console.log("🔗 Connecting to PocketBase:", PB_API);

    // Fetch all collections
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${PB_API}/api/collections`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch collections:", response.statusText);
      console.error("Status:", response.status);
      const text = await response.text();
      console.error("Response:", text);
      process.exit(1);
    }

    const data = (await response.json()) as {
      items: PBCollection[];
    };

    console.log(
      `✅ Found ${data.items.length} collections\n`
    );

    // Document each collection
    const collections = data.items.filter((c) => !c.system);

    for (const collection of collections) {
      console.log(`📋 ${collection.name}:`);
      console.log(`   ID: ${collection.id}`);
      console.log(`   Type: ${collection.type}`);
      console.log(`   Created: ${collection.created}`);

      if (collection.schema && collection.schema.length > 0) {
        console.log(`   Fields (${collection.schema.length}):`);
        for (const field of collection.schema) {
          const required = field.required ? " [required]" : "";
          console.log(`     - ${field.name} (${field.type})${required}`);

          // Show field options if present
          if (field.options) {
            if (field.options.values) {
              console.log(
                `       Values: ${field.options.values.join(", ")}`
              );
            }
            if (field.type === "relation" && field.options.collectionId) {
              console.log(`       References: ${field.options.collectionId}`);
            }
          }
        }
      }
      console.log();
    }

    // Generate markdown documentation
    generateMarkdown(collections);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function generateMarkdown(collections: PBCollection[]) {
  let markdown = `# PocketBase Collections Schema
Generated: ${new Date().toISOString()}

## Collection Overview
\`\`\`
${collections.map((c) => `${c.name.padEnd(20)} - ${c.schema?.length || 0} fields`).join("\n")}
\`\`\`

## Detailed Schemas

`;

  for (const collection of collections) {
    markdown += `### ${collection.name}

| Field | Type | Required | Notes |
|-------|------|----------|-------|
`;

    if (collection.schema) {
      for (const field of collection.schema) {
        const required = field.required ? "✓" : "";
        let notes = "";

        if (field.options?.values) {
          notes = `Enum: ${field.options.values.join(", ")}`;
        } else if (
          field.type === "relation" &&
          field.options?.collectionId
        ) {
          notes = `FK → ${field.options.collectionId}`;
        }

        markdown += `| ${field.name} | ${field.type} | ${required} | ${notes} |\n`;
      }
    }

    // Add RLS rules if present
    if (
      collection.listRule ||
      collection.viewRule ||
      collection.createRule ||
      collection.updateRule ||
      collection.deleteRule
    ) {
      markdown += "\n**RLS Rules:**\n";
      if (collection.listRule) markdown += `- List: ${collection.listRule}\n`;
      if (collection.viewRule) markdown += `- View: ${collection.viewRule}\n`;
      if (collection.createRule)
        markdown += `- Create: ${collection.createRule}\n`;
      if (collection.updateRule)
        markdown += `- Update: ${collection.updateRule}\n`;
      if (collection.deleteRule)
        markdown += `- Delete: ${collection.deleteRule}\n`;
    }

    markdown += "\n";
  }

  // Save to file
  const fs = require("fs");
  const path = require("path");

  const docsDir = path.join(process.cwd(), "docs", "collections");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, "SCHEMA.md");
  fs.writeFileSync(outputPath, markdown);

  console.log(`\n📝 Schema documentation saved to: ${outputPath}`);
}

// Run
const token = process.env.PB_TOKEN;
pullCollections(token);
