import { chromium } from 'playwright';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Pool URLs to process - Google Drive PDFs
const POOL_URLS = [
  {
    name: 'Balboa',
    url: 'https://drive.google.com/file/d/1F6ofavKm6fJG6yJnwJAJnaDqI3AW-OGG/view'
  },
  {
    name: 'Coffman',
    url: 'https://drive.google.com/file/d/1WdRNBlrTSlN9RYiQnkufgbpKS7DNLQV5/view'
  },
  {
    name: 'Garfield',
    url: 'https://drive.google.com/file/d/1jwHSGy2LQpNI9NzQgzdKEff3eP4tUsW4/view'
  },
  {
    name: 'Hamilton',
    url: 'https://drive.google.com/file/d/1egPK2XoxOUo3qcJN7e3CPkOuH_7hcVZ5/view'
  },
  {
    name: 'Mission',
    url: 'https://drive.google.com/file/d/1hMQSR-tzURRSeqk5ZUDrmSTHpVh61gdK/view'
  },,
  {
    name: 'MLK',
    url: 'https://drive.google.com/file/d/1LEOsgD5cYiEh3nRepIPeEFZ35g64xVq0/view'
  },
  {
    name: 'North Beach',
    url: 'https://drive.google.com/file/d/170XXhZSC_2M6hW0c2e_YviW9kjeWVg6a/view'
  },
  {
    name: 'Rossi',
    url: 'https://drive.google.com/file/d/1Waj_q5jrqWl3q6QJp656h1ZMxmtl4Dh3/view'
  },
  {
    name: 'Sava',
    url: 'https://drive.google.com/file/d/1Da1_NkTDszm6kwxLIdpcrTBPCBSZbHga/view'
  }
];

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractPoolName(text) {
  const poolNameMatch = text.match(/(Balboa|Rossi|Hamilton|Garfield|Mission|North Beach|Sava|Coffman|MLK|Recreation|Aquatic)/i);
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
          content: `You are a parent who is carefully reading San Francisco Parks pool schedules. Analyze this schedule screenshot and extract family swim hours where you can take your kids swimming.

Look for terms like:
- "Family Swim"
- "Open Swim"
- "Rec Swim"
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

    // Set viewport for better PDF rendering
    await page.setViewportSize({ width: 1200, height: 1600 });

    // Navigate to Google Drive PDF
    await page.goto(pool.url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for PDF to load in Google Drive viewer
    await page.waitForTimeout(8000);

    // Look for the PDF content area in Google Drive
    try {
      // Try to find the PDF viewer iframe or content
      const pdfContent = await page.locator('iframe[src*="pdf"], [data-testid="page-rendered"], .ndfHFb-c4YZDc-Wrql6b').first();

      if (await pdfContent.isVisible()) {
        console.log(`📄 ${pool.name}: PDF loaded in Google Drive viewer`);
      }
    } catch (e) {
      console.log(`📄 ${pool.name}: PDF viewer detection failed, proceeding with screenshot`);
    }

    // Take screenshot of the entire page showing the PDF
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