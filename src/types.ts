export interface PageInfo {
  url: string;
  title: string;
  level: number;
  isSelected?: boolean;
}

export interface CrawlResult extends PageInfo {
  content: string;
  links: string[];
  timestamp: string;
}

export interface CrawlStatus {
  status: 'idle' | 'scanning' | 'ready' | 'crawling' | 'completed' | 'error';
  message: string;
  progress: number;
  totalPages: number;
}