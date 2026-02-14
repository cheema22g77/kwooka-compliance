interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface ScoredDocument extends Document {
  score: number;
  matchedTerms: string[];
}

interface BM25Config {
  k1: number;
  b: number;
}

export class BM25Search {
  private documents: Document[] = [];
  private tokenizedDocs: string[][] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private termDocFreq: Map<string, number> = new Map();
  private config: BM25Config;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = {
      k1: config.k1 ?? 1.5,
      b: config.b ?? 0.75
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
      .filter(token => !this.isStopWord(token));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
      'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
      'such', 'any', 'only', 'own', 'same', 'than', 'too', 'very', 'just'
    ]);
    return stopWords.has(word);
  }

  indexDocuments(documents: Document[]): void {
    this.documents = documents;
    this.tokenizedDocs = [];
    this.docLengths = [];
    this.termDocFreq.clear();

    for (const doc of documents) {
      const tokens = this.tokenize(doc.content);
      this.tokenizedDocs.push(tokens);
      this.docLengths.push(tokens.length);

      const uniqueTerms = new Set(tokens);
      for (const term of Array.from(uniqueTerms)) {
        this.termDocFreq.set(term, (this.termDocFreq.get(term) || 0) + 1);
      }
    }

    this.avgDocLength = this.docLengths.reduce((a, b) => a + b, 0) / this.docLengths.length || 1;
  }

  private idf(term: string): number {
    const N = this.documents.length;
    const docFreq = this.termDocFreq.get(term) || 0;
    if (docFreq === 0) return 0;
    return Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
  }

  private scoreDocument(queryTerms: string[], docIndex: number): number {
    const docTokens = this.tokenizedDocs[docIndex];
    const docLength = this.docLengths[docIndex];
    const { k1, b } = this.config;

    let score = 0;

    const termFreq = new Map<string, number>();
    for (const token of docTokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    for (const term of queryTerms) {
      const tf = termFreq.get(term) || 0;
      if (tf === 0) continue;

      const idf = this.idf(term);
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / this.avgDocLength));
      score += idf * (numerator / denominator);
    }

    return score;
  }

  search(query: string, topK: number = 10): ScoredDocument[] {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const scoredDocs: ScoredDocument[] = [];

    for (let i = 0; i < this.documents.length; i++) {
      const score = this.scoreDocument(queryTerms, i);
      if (score > 0) {
        const docTerms = new Set(this.tokenizedDocs[i]);
        const matchedTerms = queryTerms.filter(term => docTerms.has(term));
        scoredDocs.push({
          ...this.documents[i],
          score,
          matchedTerms
        });
      }
    }

    return scoredDocs
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  static expandNDISQuery(query: string): string {
    const synonyms: Record<string, string[]> = {
      'participant': ['client', 'customer', 'service user'],
      'provider': ['supplier', 'service provider', 'registered provider'],
      'plan': ['funding plan', 'support plan', 'ndis plan'],
      'support': ['assistance', 'service', 'help', 'care'],
      'compliance': ['conformance', 'adherence', 'regulatory'],
      'audit': ['review', 'assessment', 'inspection', 'evaluation'],
      'incident': ['event', 'occurrence', 'accident', 'reportable'],
      'worker': ['staff', 'employee', 'support worker', 'carer'],
      'screening': ['check', 'clearance', 'verification', 'wwcc'],
      'rights': ['entitlements', 'protections', 'safeguards'],
      'complaint': ['grievance', 'feedback', 'concern'],
      'medication': ['medicine', 'drugs', 'pharmaceutical'],
      'restraint': ['restrictive practice', 'restriction']
    };

    let expandedQuery = query.toLowerCase();
    for (const [term, syns] of Object.entries(synonyms)) {
      if (expandedQuery.includes(term)) {
        expandedQuery += ' ' + syns.join(' ');
      }
    }
    return expandedQuery;
  }
}

export class TFIDFSearch {
  private documents: Document[] = [];
  private tokenizedDocs: string[][] = [];
  private idfScores: Map<string, number> = new Map();

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  indexDocuments(documents: Document[]): void {
    this.documents = documents;
    this.tokenizedDocs = documents.map(doc => this.tokenize(doc.content));

    const N = documents.length;
    const termDocCount = new Map<string, number>();

    for (const tokens of this.tokenizedDocs) {
      const uniqueTerms = new Set(tokens);
      for (const term of Array.from(uniqueTerms)) {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
      }
    }

    for (const [term, count] of Array.from(termDocCount.entries())) {
      this.idfScores.set(term, Math.log(N / count));
    }
  }

  search(query: string, topK: number = 10): ScoredDocument[] {
    const queryTerms = this.tokenize(query);
    const scores: { doc: Document; score: number; matchedTerms: string[] }[] = [];

    for (let i = 0; i < this.documents.length; i++) {
      const docTokens = this.tokenizedDocs[i];
      const termFreq = new Map<string, number>();

      for (const token of docTokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }

      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        const tf = termFreq.get(term) || 0;
        const idf = this.idfScores.get(term) || 0;
        if (tf > 0) {
          score += (1 + Math.log(tf)) * idf;
          matchedTerms.push(term);
        }
      }

      if (score > 0) {
        scores.push({ doc: this.documents[i], score, matchedTerms });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ doc, score, matchedTerms }) => ({ ...doc, score, matchedTerms }));
  }
}
