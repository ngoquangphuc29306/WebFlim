export interface SearchSuggestion {
  slug: string;
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  thumbUrl?: string;
  year?: string | number;
  episodeCurrent?: string;
}
