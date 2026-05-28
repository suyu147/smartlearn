export interface TavilySearchResult {
  answer: string;
  sources: Array<{ title: string; url: string; content?: string }>;
  context: string;
  query: string;
  responseTime?: number;
}

export async function searchWithTavily(_options: {
  query: string;
  apiKey: string;
}): Promise<TavilySearchResult> {
  return {
    answer: '',
    sources: [],
    context: '',
    query: _options.query,
    responseTime: 0,
  };
}

export function formatSearchResultsAsContext(
  result: TavilySearchResult,
): string {
  if (!result.sources.length) return '';
  return result.sources
    .map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`)
    .join('\n');
}
