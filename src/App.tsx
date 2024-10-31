import { useState } from 'react';
import { Download, Globe, Loader, AlertCircle, Search, Sun, Moon } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { ProgressBar } from './components/ProgressBar';
import { PageList } from './components/PageList';
import { crawlWebsite, scanPages, generateMarkdown } from './utils/crawler';
import { CrawlStatus, PageInfo } from './types';
import { useTheme } from './context/ThemeContext';
import { Toggle } from './components/Toggle';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [url, setUrl] = useState('');
  const [ignoreBlog, setIgnoreBlog] = useState(true);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [status, setStatus] = useState<CrawlStatus>({
    status: 'idle',
    message: '',
    progress: 0,
    totalPages: 0,
  });

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      normalizedUrl = `https://${url}`;
    }

    try {
      setStatus({
        status: 'scanning',
        message: 'Scanning website structure...',
        progress: 0,
        totalPages: 0,
      });

      const scannedPages = await scanPages(normalizedUrl, (current, total) => {
        setStatus(prev => ({
          ...prev,
          progress: (current / total) * 100,
          totalPages: total,
          message: `Scanning page ${current} of ${total}...`,
        }));
      }, ignoreBlog);

      setPages(scannedPages.map(page => ({ ...page, isSelected: true })));
      setStatus({
        status: 'ready',
        message: `Found ${scannedPages.length} pages. Select the pages you want to include.`,
        progress: 100,
        totalPages: scannedPages.length,
      });
    } catch (error) {
      setStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        progress: 0,
        totalPages: 0,
      });
    }
  };

  const handleCrawl = async () => {
    const selectedPages = pages.filter(page => page.isSelected);
    if (selectedPages.length === 0) {
      setStatus({
        status: 'error',
        message: 'Please select at least one page to crawl.',
        progress: 0,
        totalPages: 0,
      });
      return;
    }

    try {
      setStatus({
        status: 'crawling',
        message: 'Starting content extraction...',
        progress: 0,
        totalPages: selectedPages.length,
      });

      const results = await crawlWebsite(
        selectedPages.map(p => p.url),
        (current, total) => {
          setStatus(prev => ({
            ...prev,
            progress: (current / total) * 100,
            totalPages: total,
            message: `Extracting content from page ${current} of ${total}...`,
          }));
        }
      );

      const markdown = generateMarkdown(results);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'website-content.md';
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setStatus({
        status: 'completed',
        message: `Successfully extracted content from ${results.length} pages!`,
        progress: 100,
        totalPages: results.length,
      });
    } catch (error) {
      setStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        progress: 0,
        totalPages: 0,
      });
    }
  };

  const togglePage = (url: string) => {
    setPages(pages.map(page =>
      page.url === url ? { ...page, isSelected: !page.isSelected } : page
    ));
  };

  const selectAll = () => {
    setPages(pages.map(page => ({ ...page, isSelected: true })));
  };

  const deselectAll = () => {
    setPages(pages.map(page => ({ ...page, isSelected: false })));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="neumorphic-button p-2 rounded-full"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <Globe className="w-8 h-8 text-lime-400" />
            <h1 className="text-2xl font-bold">
              Website Crawler
            </h1>
          </div>

          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Website URL
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com"
                  className="input-field flex-1"
                  required
                />
                <Toggle
                  label="Ignore Blog"
                  checked={ignoreBlog}
                  onChange={setIgnoreBlog}
                />
              </div>
              <p className="mt-2 text-sm text-secondary">
                Enter a website URL with or without http(s)://
              </p>
            </div>

            {status.status === 'idle' || status.status === 'scanning' ? (
              <button
                type="submit"
                disabled={status.status === 'scanning'}
                className="neumorphic-button w-full"
              >
                {status.status === 'scanning' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin inline mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 inline mr-2" />
                    Scan Website
                  </>
                )}
              </button>
            ) : null}
          </form>

          {status.status !== 'idle' && (
            <div className="mt-8 space-y-4">
              <ProgressBar progress={status.progress} />
              <div className={`flex items-start gap-2 ${
                status.status === 'error' 
                  ? 'text-red-400' 
                  : 'text-secondary'
              }`}>
                {status.status === 'error' && (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm whitespace-pre-line">{status.message}</p>
              </div>
            </div>
          )}

          {(status.status === 'ready' || status.status === 'completed') && pages.length > 0 && (
            <>
              <div className="mt-8">
                <PageList
                  pages={pages}
                  onTogglePage={togglePage}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />
              </div>

              <button
                onClick={handleCrawl}
                disabled={status.status === 'crawling'}
                className="neumorphic-button w-full mt-6"
              >
                {status.status === 'crawling' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin inline mr-2" />
                    Extracting Content...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 inline mr-2" />
                    Download Selected Content
                  </>
                )}
              </button>
            </>
          )}

          {status.status === 'completed' && (
            <div className="mt-4 p-4 rounded-xl border border-lime-400/20 bg-lime-400/10">
              <p className="text-sm text-lime-400">
                ✓ Markdown file has been generated and downloaded
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}