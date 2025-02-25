import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS to allow requests from any origin in development
// and from specific origins in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://responsive-css-converter.vercel.app', 'https://responsive-css-converter-git-main-robertdawsons-projects.vercel.app']
    : true,
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Add a simple health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

interface ExtractCSSRequest {
  url: string;
}

app.post('/api/extract-css', async (req: Request<object, object, ExtractCSSRequest>, res: Response) => {
  try {
    const { url } = req.body;
    console.log('Received request to extract CSS from:', url);

    if (!url) {
      console.log('URL is missing from request');
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      console.log('Invalid URL format:', url);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the webpage content
    console.log('Fetching webpage content...');
    const response = await fetch(url);

    if (!response.ok) {
      console.log('Failed to fetch webpage:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'Failed to fetch webpage',
        details: `Status: ${response.status} - ${response.statusText}`
      });
    }

    const html = await response.text();
    console.log('Successfully fetched webpage content');

    // Parse the HTML
    console.log('Parsing HTML...');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract CSS from <style> tags
    const styleTags = Array.from(document.querySelectorAll('style')) as HTMLStyleElement[];
    console.log(`Found ${styleTags.length} style tags`);
    const inlineCSS = styleTags
      .map(style => style.textContent)
      .filter((content): content is string => content !== null)
      .join('\n');

    // Extract CSS from <link> tags
    const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    console.log(`Found ${linkTags.length} stylesheet links`);

    const externalCSS = await Promise.all(
      linkTags.map(async (link) => {
        const href = link.getAttribute('href');
        if (!href) {
          console.log('Found link tag without href attribute');
          return '';
        }

        // Handle relative URLs
        const cssUrl = href.startsWith('http') ? href : new URL(href, url).toString();
        console.log('Fetching external stylesheet:', cssUrl);

        try {
          const cssResponse = await fetch(cssUrl);
          if (!cssResponse.ok) {
            console.log(`Failed to fetch CSS from ${cssUrl}:`, cssResponse.status, cssResponse.statusText);
            return '';
          }
          const cssText = await cssResponse.text();
          console.log(`Successfully fetched CSS from ${cssUrl}`);
          return cssText;
        } catch (error) {
          console.error(`Error fetching CSS from ${cssUrl}:`, error);
          return '';
        }
      })
    );

    // Combine all CSS
    const allCSS = [...externalCSS, inlineCSS].filter(Boolean).join('\n\n');
    console.log('Successfully combined all CSS');

    if (!allCSS.trim()) {
      console.log('No CSS content found');
      return res.status(404).json({ error: 'No CSS content found on the page' });
    }

    res.json({ css: allCSS });
  } catch (error) {
    console.error('Error extracting CSS:', error);
    res.status(500).json({
      error: 'Failed to extract CSS',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 