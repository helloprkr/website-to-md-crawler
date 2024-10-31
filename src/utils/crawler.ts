import { CrawlResult, PageInfo } from '../types';

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest='
];

export async function scanPages(
  rootUrl: string,
  onProgress: (current: number, total: number) => void,
  ignoreBlog: boolean = true
): Promise<PageInfo[]> {
  const visited = new Set<string>();
  const queue: { url: string; level: number }[] = [{ url: normalizeUrl(rootUrl), level: 1 }];
  const pages: PageInfo[] = [];
  let domain: string;

  try {
    domain = new URL(rootUrl).hostname;
  } catch (error) {
    throw new Error('Invalid URL format. Please enter a valid URL including http:// or https://');
  }

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  const MAX_PAGES = 100; // Limit to prevent infinite crawling

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const { url, level } = queue.shift()!;
    
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await fetchWithRetry(url);
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('text/html')) {
        continue;
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      const title = getPageTitle(doc) || url;
      pages.push({ url, title, level });

      // Find all possible links
      const links = new Set<string>();
      
      // Standard href links
      doc.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href) links.add(href);
      });

      // onclick links
      doc.querySelectorAll('[onclick]').forEach(el => {
        const onclick = el.getAttribute('onclick');
        if (onclick) {
          const matches = onclick.match(/window\.location\.href='([^']+)'|window\.location='([^']+)'/);
          if (matches) {
            links.add(matches[1] || matches[2]);
          }
        }
      });

      // data-href links
      doc.querySelectorAll('[data-href]').forEach(el => {
        const href = el.getAttribute('data-href');
        if (href) links.add(href);
      });

      // Process all found links
      const validLinks = Array.from(links)
        .map(href => {
          try {
            // Handle relative URLs
            if (href.startsWith('/')) {
              return new URL(href, url).href;
            }
            // Handle absolute URLs
            return new URL(href, href.includes('://') ? undefined : url).href;
          } catch {
            return null;
          }
        })
        .filter((href): href is string => 
          href !== null &&
          new URL(href).hostname === domain &&
          !isAssetUrl(href) &&
          (!ignoreBlog || !href.includes('/blog/')) &&
          !isExcludedPath(href)
        )
        .map(normalizeUrl);

      // Reset consecutive errors counter on success
      consecutiveErrors = 0;
      
      // Add new links to queue
      validLinks.forEach(link => {
        if (!visited.has(link) && !queue.some(item => item.url === link)) {
          queue.push({ url: link, level: level + 1 });
        }
      });

      onProgress(visited.size, visited.size + queue.length);
      
      // Respect rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.warn(`Failed to scan ${url}:`, error);
      consecutiveErrors++;
      
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(
          'Too many consecutive errors occurred. The website might be:\n' +
          '- Blocking automated access\n' +
          '- Rate limiting requests\n' +
          '- Having technical issues\n\n' +
          'Try again later or check if the website is accessible.'
        );
      }
    }
  }

  if (pages.length === 0) {
    throw new Error(
      'Unable to scan the website. This could be due to:\n' +
      '- The website blocking automated access\n' +
      '- Invalid URL or website structure\n' +
      '- Technical issues with the website\n\n' +
      'Please verify the URL and try again.'
    );
  }

  return pages;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          return response;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Proxy ${proxy} failed for ${url}:`, error);
        continue;
      }
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${retries} retries`);
}

function getPageTitle(doc: Document): string {
  // Try multiple sources for the title
  const sources = [
    () => doc.querySelector('h1')?.textContent,
    () => doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    () => doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    () => doc.querySelector('meta[name="title"]')?.getAttribute('content'),
    () => doc.querySelector('.post-title')?.textContent,
    () => doc.querySelector('.article-title')?.textContent,
    () => doc.querySelector('#title')?.textContent,
    () => doc.title
  ];

  for (const source of sources) {
    const title = source();
    if (title?.trim()) {
      return title.trim();
    }
  }

  return 'Untitled Page';
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slashes and index files
    return parsed.origin + 
           parsed.pathname
             .replace(/\/$/, '')
             .replace(/\/index\.(html?|php|asp|aspx|jsp)$/, '') + 
           parsed.search;
  } catch {
    return url;
  }
}

function isAssetUrl(url: string): boolean {
  const assetExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
    '.css', '.js', '.pdf', '.doc', '.docx', '.zip',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.woff', '.woff2', '.ttf', '.eot',
    '.ico', '.xml', '.json'
  ];
  const urlLower = url.toLowerCase();
  return assetExtensions.some(ext => urlLower.endsWith(ext)) ||
         urlLower.includes('/assets/') ||
         urlLower.includes('/static/') ||
         urlLower.includes('/media/') ||
         urlLower.includes('/download/') ||
         urlLower.includes('/fonts/') ||
         urlLower.includes('/images/');
}

function isExcludedPath(url: string): boolean {
  const excludedPatterns = [
    /\/(tag|category|author|page)\/\d+/,
    /\/#.*/,
    /\/feed\/?$/,
    /\/amp\/?$/,
    /\/print\/?$/,
    /\/share\/?$/,
    /\/cdn-cgi\//,
    /\/wp-/,
    /\?share=/,
    /\?print=/
  ];
  
  return excludedPatterns.some(pattern => pattern.test(url));
}

export async function crawlWebsite(
  urls: string[],
  onProgress: (current: number, total: number) => void
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  let processed = 0;

  for (const url of urls) {
    try {
      const response = await fetchWithRetry(url);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      const content = extractContent(doc);
      const title = getPageTitle(doc) || url;
      
      results.push({
        url,
        title,
        content,
        links: [],
        level: 1,
        timestamp: new Date().toISOString(),
      });

      processed++;
      onProgress(processed, urls.length);
      
      // Respect rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Failed to extract content from ${url}:`, error);
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to extract content from any of the selected pages.');
  }

  return results;
}

function extractContent(doc: Document): string {
  const content = doc.body.cloneNode(true) as HTMLElement;
  
  const unwantedSelectors = [
    'script', 'style', 'iframe', 'noscript',
    'header', 'footer', 'nav',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]',
    '[aria-hidden="true"]',
    '.cookie-banner',
    '.advertisement',
    '.popup',
    '.modal',
    '#cookie-notice',
    '.social-share',
    '.newsletter-signup'
  ];
  
  unwantedSelectors.forEach(selector => {
    content.querySelectorAll(selector).forEach(el => el.remove());
  });

  const mainContent = content.querySelector('main, [role="main"], article') || content;
  
  return mainContent.textContent?.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n') || '';
}

export function generateMarkdown(results: CrawlResult[]): string {
  let markdown = '# Website Content\n\n';
  
  const sorted = [...results].sort((a, b) => 
    a.level === b.level ? a.url.localeCompare(b.url) : a.level - b.level
  );

  markdown += '## Table of Contents\n\n';
  sorted.forEach(({ title, url, level }) => {
    const indent = '  '.repeat(level - 1);
    const safeTitle = title.replace(/[[\]]/g, '');
    const anchor = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '-'));
    markdown += `${indent}- [${safeTitle}](#${anchor})\n`;
  });

  markdown += '\n## Content\n\n';

  sorted.forEach(({ title, content, url, level, timestamp }) => {
    const heading = '#'.repeat(Math.min(level + 1, 6));
    const safeTitle = title.replace(/[[\]]/g, '');
    markdown += `${heading} ${safeTitle}\n\n`;
    markdown += `*Source: [${url}](${url})*\n`;
    markdown += `*Crawled: ${new Date(timestamp).toLocaleString()}*\n\n`;
    markdown += `${content}\n\n---\n\n`;
  });

  return markdown;
}