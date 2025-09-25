import { chromium } from 'playwright';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Pool URLs to process
const POOL_URLS = [
  {
    name: 'Balboa Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26439/2025-Balboa-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'Rossi Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26440/2025-Rossi-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'Hamilton Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26441/2025-Hamilton-Pool-Fall-Pool-Schedule'
  },
  // Add more pools as needed
  {
    name: 'Garfield Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26442/2025-Garfield-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'Mission Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26443/2025-Mission-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'Coffman Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26444/2025-Coffman-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'King Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26445/2025-King-Pool-Fall-Pool-Schedule'
  },
  {
    name: 'Sava Pool',
    url: 'https://sfrecpark.org/DocumentCenter/View/26446/2025-Sava-Pool-Fall-Pool-Schedule'
  }
];

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractPoolName(text) {
  const poolNameMatch = text.match(/(Balboa|Rossi|Hamilton|Garfield|Mission|Sava|Coffman|King|Recreation|Aquatic)/i);
  if (poolNameMatch) {
    return poolNameMatch[1];
  }
  return text.split(/[\s-_]/)[0] || 'Unknown';
}

async function analyzeScheduleImage(base64Image, poolName) {
  try {
    console.log(`🔍 Analyzing ${poolName} schedule with OpenAI Vision API...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert at reading San Francisco Parks pool schedules. Analyze this schedule screenshot and extract family swim hours.

Look for terms like:
- "Family Swim"
- "Open Swim"
- "Recreation Swim"
- "Public Swim"
- "General Swim"
- Any sessions open to families with children

Return ONLY a JSON object with this structure:
{
  "poolName": "Name of the pool",
  "sessions": [
    {
      "day": 0-6 (0=Monday, 1=Tuesday, etc.),
      "startTime": "HH:MM" (24-hour format),
      "endTime": "HH:MM" (24-hour format),
      "sessionType": "Family Swim"
    }
  ]
}

If no family swim sessions are found, return empty sessions array.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this ${poolName} pool schedule screenshot and extract all family swim hours. Look carefully at the schedule grid and identify when families can swim.`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(aiResponse);

      // Convert sessions to our format
      const sessions = parsed.sessions?.map(session => ({
        pool: extractPoolName(parsed.poolName || poolName),
        startTime: session.startTime,
        endTime: session.endTime,
        day: session.day,
        sessionType: session.sessionType || 'Family Swim'
      })) || [];

      return {
        poolName: parsed.poolName || poolName,
        sessions,
        lastUpdated: new Date().toISOString(),
        source: 'SF Parks .pub file'
      };

    } catch (parseError) {
      console.error('❌ Error parsing Vision API response:', parseError);
      return {
        poolName: poolName,
        sessions: [],
        lastUpdated: new Date().toISOString(),
        source: 'SF Parks .pub file',
        error: 'Failed to parse AI response'
      };
    }

  } catch (error) {
    console.error('❌ Error calling OpenAI Vision API:', error);
    return {
      poolName: poolName,
      sessions: [],
      lastUpdated: new Date().toISOString(),
      source: 'SF Parks .pub file',
      error: error.message
    };
  }
}

async function processPool(browser, pool) {
  const page = await browser.newPage();

  try {
    console.log(`🌐 Processing ${pool.name}: ${pool.url}`);

    // Navigate to the .pub file URL
    await page.goto(pool.url, { waitUntil: 'networkidle' });

    // Wait for the .pub file to load and be processed by browser
    await page.waitForTimeout(10000);

    // Take screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });

    // Convert to base64
    const base64Image = `data:image/png;base64,${screenshot.toString('base64')}`;

    // Analyze with OpenAI
    const result = await analyzeScheduleImage(base64Image, pool.name);

    console.log(`✅ ${pool.name}: Found ${result.sessions.length} family swim sessions`);

    return result;

  } catch (error) {
    console.error(`❌ Error processing ${pool.name}:`, error);
    return {
      poolName: pool.name,
      sessions: [],
      lastUpdated: new Date().toISOString(),
      source: 'SF Parks .pub file',
      error: error.message
    };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🤖 Starting automated pool schedule extraction...');

  // Launch browser
  const browser = await chromium.launch();

  try {
    const results = [];

    // Process each pool
    for (const pool of POOL_URLS) {
      const result = await processPool(browser, pool);
      results.push(result);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'public', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Save individual pool files
    for (const result of results) {
      const poolName = result.poolName.toLowerCase().replace(/\s+/g, '-');
      const filename = `${poolName}-schedule.json`;
      const filepath = path.join(dataDir, filename);

      await fs.writeFile(filepath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved ${filename}`);
    }

    // Save combined file
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      totalPools: results.length,
      totalSessions: results.reduce((sum, pool) => sum + pool.sessions.length, 0),
      pools: results
    };

    const combinedPath = path.join(dataDir, 'all-schedules.json');
    await fs.writeFile(combinedPath, JSON.stringify(combinedData, null, 2));

    console.log('✅ Pool schedule extraction completed!');
    console.log(`📊 Processed ${results.length} pools with ${combinedData.totalSessions} total family swim sessions`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}