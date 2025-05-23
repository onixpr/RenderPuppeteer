const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Puppeteer service is running!');
});

app.post('/scrape', async (req, res) => {
  const { url, selectors } = req.body;

  if (!url) {
    res.status(400).json({ success: false, error: 'Missing URL' });
    return;
  }

  let browser;
  const results = {};

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (selectors) {
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          results[key] = await page.$eval(selector, el => el.textContent.trim());
        } catch (e) {
          results[key] = `Selector error: ${e.message}`;
        }
      }
    }

    results.pageTitle = await page.title();

    res.set('Connection', 'close');
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Error:', error);
    res.set('Connection', 'close');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
