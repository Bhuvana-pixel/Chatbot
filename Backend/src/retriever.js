import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { embedText } from './embedder.js';

dotenv.config();

export class Retriever {
  static INDEX_NAME = 'college-admission-chatbot';
  static NAMESPACE = 'nec_v2';
  static DIMENSION = 384;
  static INITIAL_TOP_K = 30;
  static FINAL_TOP_K = 8;
  static MIN_PINECONE_SCORE = 0.20;

  static WEIGHT_PINECONE = 0.15;
  static WEIGHT_SEMANTIC = 0.20;
  static WEIGHT_QUESTION = 0.20;
  static WEIGHT_KEYWORD = 0.08;
  static WEIGHT_PHRASE = 0.07;
  static WEIGHT_DOMAIN = 0.10;
  static WEIGHT_INTENT = 0.20;

  static GENERIC_WORDS = new Set([
    'what', 'which', 'where', 'when', 'how', 'why',
    'who', 'does', 'do', 'is', 'are', 'can', 'could',
    'would', 'should', 'tell', 'about', 'give',
    'provide', 'provides', 'available', 'details',
    'detail', 'information', 'info', 'facility',
    'facilities', 'thing', 'things', 'list', 'listed',
    'latest', 'please', 'the', 'a', 'an', 'at', 'in',
    'on', 'for', 'to', 'of', 'and', 'or', 'with',
    'from', 'me', 'my', 'i', 'we', 'you', 'your'
  ]);

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY not found in environment variables.');
    }
    
    console.log('Connecting to Pinecone...');
    this.pc = new Pinecone({ apiKey });
    this.index = this.pc.index(Retriever.INDEX_NAME);
    console.log('Pinecone index connection successful.');
  }

  _normalizeText(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _tokens(text, removeGeneric = true) {
    const normalized = this._normalizeText(text);
    if (!normalized) return [];
    
    const tokens = normalized.split(' ').filter(token => token.length > 2);
    if (removeGeneric) {
      return tokens.filter(token => !Retriever.GENERIC_WORDS.has(token));
    }
    return tokens;
  }

  _detectDomain(query) {
    const tokens = new Set(this._tokens(query));
    const domains = {
      scholarship: new Set(['scholarship', 'scholarships', 'merit', 'talent', 'means', 'financial', 'aid']),
      placement: new Set(['placement', 'placements', 'company', 'companies', 'recruiter', 'recruiters', 'recruitment', 'salary', 'package', 'job']),
      library: new Set(['library', 'libraries', 'book', 'books', 'journal', 'journals', 'opac', 'reading', 'reprography', 'printing', 'ebook', 'ebooks']),
      admission: new Set(['admission', 'apply', 'application', 'eligibility', 'tnea', 'joining', 'join']),
      hostel: new Set(['hostel', 'accommodation', 'room', 'rooms', 'mess']),
      transport: new Set(['bus', 'transport', 'transportation', 'route', 'routes', 'pickup', 'drop', 'timing', 'timings']),
      examination: new Set(['exam', 'examination', 'semester', 'arrear', 'arrears', 'regulation', 'internal', 'hallticket']),
      contact: new Set(['contact', 'phone', 'telephone', 'email', 'address', 'location']),
      department: new Set(['department', 'departments', 'course', 'courses', 'programme', 'program', 'branch', 'cse', 'ece', 'eee', 'mechanical', 'civil'])
    };

    const scores = {};
    for (const [domain, words] of Object.entries(domains)) {
      let score = 0;
      for (const token of tokens) {
        if (words.has(token)) score++;
      }
      scores[domain] = score;
    }

    let best = 'general';
    let maxVal = 0;
    for (const [domain, val] of Object.entries(scores)) {
      if (val > maxVal) {
        maxVal = val;
        best = domain;
      }
    }
    return maxVal === 0 ? 'general' : best;
  }

  _detectIntent(query) {
    const q = this._normalizeText(query);
    const domain = this._detectDomain(query);

    if (domain === 'scholarship') {
      const phrases = [
        'what scholarships', 'which scholarships', 'scholarships available',
        'what scholarship', 'which scholarship', 'scholarship categories',
        'types of scholarship'
      ];
      if (phrases.some(p => q.includes(p))) return 'scholarship_list';
      if (q.includes('merit scholarship')) return 'scholarship_merit';
      if (q.includes('talent scholarship')) return 'scholarship_talent';
      if (q.includes('sports scholarship') || q.includes('scholarship for sports')) return 'scholarship_sports';
      if (q.includes('does nec provide scholarship') || q.includes('does nec offer scholarship')) {
        return 'scholarship_availability';
      }
      return 'scholarship_general';
    }

    if (domain === 'placement') {
      const phrases = [
        'what companies', 'which companies', 'companies visit',
        'companies come', 'companies recruit', 'who recruits', 'recruiters visit'
      ];
      if (phrases.some(p => q.includes(p))) return 'placement_companies';

      const stats = ['placement percentage', 'placement rate', 'placement statistics'];
      if (stats.some(p => q.includes(p))) return 'placement_statistics';

      if (['salary', 'package', 'ctc'].some(word => q.includes(word))) return 'placement_salary';
      return 'placement_general';
    }

    if (domain === 'admission') {
      const phrases = [
        'how can i get admission', 'how to get admission', 'how do i get admission',
        'how can i apply', 'how to apply', 'admission process'
      ];
      if (phrases.some(p => q.includes(p))) return 'admission_process';
      if (q.includes('admission through tnea') || q.includes('is admission through tnea') || q.includes('tnea')) {
        return 'admission_tnea';
      }
      if (q.includes('eligibility')) return 'admission_eligibility';
      if (q.includes('documents') || q.includes('certificates') || q.includes('required documents') || q.includes('certificates required')) {
        return 'admission_documents';
      }
      if (q.includes('where') && (q.includes('admission') || q.includes('information'))) {
        return 'admission_information';
      }
      return 'admission_general';
    }

    if (domain === 'library') {
      if (q.includes('facilities') || q.includes('facility')) return 'library_facilities';
      if (q.includes('timing') || q.includes('timings') || q.includes('open') || q.includes('opening')) return 'library_timing';
      if (['book', 'books', 'journal', 'journals'].some(word => q.includes(word))) return 'library_resources';
      return 'library_general';
    }

    if (domain === 'hostel') {
      if (['facility', 'facilities', 'available'].some(word => q.includes(word))) return 'hostel_facilities';
      if (['fee', 'fees', 'cost'].some(word => q.includes(word))) return 'hostel_fees';
      return 'hostel_general';
    }

    if (domain === 'transport') {
      if (q.includes('route') || q.includes('routes')) return 'transport_routes';
      if (q.includes('timing') || q.includes('timings')) return 'transport_timings';
      return 'transport_general';
    }

    if (domain === 'examination') {
      if (q.includes('exam') || q.includes('examination')) return 'examination_information';
      if (q.includes('regulation')) return 'examination_regulations';
      if (q.includes('arrear')) return 'examination_arrear';
      return 'examination_general';
    }

    if (domain === 'contact') return 'contact_information';

    // General
    if (q.startsWith('where')) return 'location';
    if (q.startsWith('when')) return 'date_time';
    if (q.startsWith('how')) return 'procedure';
    
    const prefixes = ['does ', 'do ', 'is ', 'are ', 'can ', 'has ', 'have '];
    if (prefixes.some(p => q.startsWith(p))) return 'yes_no';

    return 'general';
  }

  _intentKeywords(intent) {
    const keywords = {
      scholarship_list: ['scholarship', 'scholarships', 'merit', 'talent', 'means', 'sports'],
      scholarship_merit: ['merit', 'scholarship', 'college fee'],
      scholarship_talent: ['talent', 'scholarship'],
      scholarship_sports: ['sports', 'scholarship'],
      scholarship_availability: ['scholarship'],
      scholarship_general: ['scholarship'],
      placement_companies: ['company', 'companies', 'recruiter', 'recruiters', 'placement', 'recruitment'],
      placement_statistics: ['placement', 'statistics', 'percentage', 'rate'],
      placement_salary: ['salary', 'package', 'ctc'],
      placement_general: ['placement'],
      admission_process: ['admission', 'process', 'apply', 'application', 'tnea'],
      admission_tnea: ['tnea', 'admission'],
      admission_eligibility: ['admission', 'eligibility'],
      admission_documents: ['admission', 'documents', 'certificates', 'marksheet'],
      admission_information: ['admission', 'information'],
      admission_general: ['admission'],
      library_facilities: ['library', 'facilities', 'books', 'journals', 'reading', 'opac'],
      library_timing: ['library', 'timing', 'timings', 'open'],
      library_resources: ['library', 'books', 'journals'],
      library_general: ['library'],
      hostel_facilities: ['hostel', 'facilities', 'rooms', 'mess'],
      hostel_fees: ['hostel', 'fees', 'fee', 'cost'],
      hostel_general: ['hostel'],
      transport_routes: ['transport', 'bus', 'route', 'routes'],
      transport_timings: ['transport', 'bus', 'timing', 'timings'],
      transport_general: ['transport', 'bus'],
      examination_information: ['exam', 'examination', 'semester'],
      examination_regulations: ['exam', 'regulation'],
      examination_arrear: ['exam', 'arrear'],
      examination_general: ['exam', 'examination'],
      contact_information: ['contact', 'phone', 'email', 'address'],
      location: ['location', 'address', 'reach', 'map'],
      date_time: ['date', 'time', 'when'],
      procedure: ['process', 'procedure', 'steps', 'apply'],
      yes_no: ['yes', 'no'],
      general: []
    };
    return keywords[intent] || [];
  }

  _intentScore(query, candidate, intent = null) {
    if (!intent) intent = this._detectIntent(query);

    const question = candidate.question || '';
    const content = candidate.content || '';
    const category = candidate.category || '';
    const section = candidate.section || '';
    const filename = candidate.filename || '';

    const candidateText = this._normalizeText([question, content, category, section, filename].join(' '));

    const strongPhrases = {
      scholarship_list: [
        'what scholarships are available', 'what scholarship', 'which scholarships',
        'scholarship categories', 'types of scholarship'
      ],
      placement_companies: [
        'what companies', 'which companies', 'companies visit',
        'company master list', 'companies recruit', 'recruiters'
      ],
      admission_process: [
        'how can i get admission', 'how to get admission', 'how do i get admission',
        'admission process', 'how can i apply', 'how to apply'
      ],
      admission_tnea: [
        'admission through tnea', 'is admission through tnea'
      ],
      admission_documents: [
        'what documents', 'required documents', 'documents required',
        'certificates required'
      ],
      library_facilities: [
        'library facilities', 'library facility', 'central library'
      ],
      hostel_facilities: [
        'hostel facilities', 'hostel facility'
      ],
      transport_routes: [
        'transport routes', 'bus routes', 'bus route'
      ],
      transport_timings: [
        'transport timings', 'bus timings', 'bus timing'
      ]
    };

    const phrases = strongPhrases[intent] || [];
    for (const phrase of phrases) {
      if (candidateText.includes(phrase)) {
        return 1.0;
      }
    }

    const keywords = this._intentKeywords(intent);
    if (keywords.length === 0) return 0.0;

    let hits = 0;
    for (const keyword of keywords) {
      if (candidateText.includes(keyword)) hits++;
    }

    let keywordScore = hits / keywords.length;

    if (candidate.chunk_type === 'faq' && question) {
      keywordScore += 0.10;
    }

    return Math.min(keywordScore, 1.0);
  }

  _domainScore(query, candidate, domain = null) {
    if (!domain) domain = this._detectDomain(query);
    if (domain === 'general') return 0.0;

    const fields = [
      candidate.category,
      candidate.filename,
      candidate.section,
      candidate.question,
      candidate.content
    ];
    const text = this._normalizeText(fields.join(' '));

    const domainWords = {
      scholarship: ['scholarship', 'scholarships', 'merit', 'talent', 'means'],
      placement: ['placement', 'company', 'companies', 'recruiter', 'recruitment'],
      library: ['library', 'book', 'books', 'journal', 'opac'],
      admission: ['admission', 'tnea', 'application', 'eligibility'],
      hostel: ['hostel', 'room', 'rooms', 'mess'],
      transport: ['transport', 'bus', 'route'],
      examination: ['exam', 'examination', 'semester', 'arrear'],
      contact: ['contact', 'phone', 'email', 'address'],
      department: ['department', 'course', 'programme', 'branch']
    };

    const words = domainWords[domain] || [];
    if (words.length === 0) return 0.0;

    let hits = 0;
    for (const word of words) {
      if (text.includes(word)) hits++;
    }

    return Math.min(hits / 3.0, 1.0);
  }

  _keywordScore(query, candidate) {
    const queryTokens = new Set(this._tokens(query));
    if (queryTokens.size === 0) return 0.0;

    const candidateText = [candidate.question || '', candidate.content || ''].join(' ');
    const candidateTokens = new Set(this._tokens(candidateText));
    if (candidateTokens.size === 0) return 0.0;

    let overlap = 0;
    for (const token of queryTokens) {
      if (candidateTokens.has(token)) overlap++;
    }

    return Math.min(overlap / queryTokens.size, 1.0);
  }

  _questionTokenScore(query, candidate) {
    const question = candidate.question || '';
    if (!question) return 0.0;

    const queryTokens = this._tokens(query);
    const questionTokens = this._tokens(question);

    if (queryTokens.length === 0 || questionTokens.length === 0) return 0.0;

    const querySet = new Set(queryTokens);
    const questionSet = new Set(questionTokens);

    let overlapCount = 0;
    for (const t of querySet) {
      if (questionSet.has(t)) overlapCount++;
    }

    const precision = overlapCount / questionSet.size;
    const recall = overlapCount / querySet.size;

    if (precision + recall === 0) return 0.0;
    return (2 * precision * recall) / (precision + recall);
  }

  _phraseScore(query, candidate) {
    const q = this._normalizeText(query);
    const question = this._normalizeText(candidate.question || '');

    if (!q || !question) return 0.0;
    if (q === question) return 1.0;
    if (question.includes(q)) return 1.0;
    if (q.includes(question)) return 0.95;

    const qTokens = this._tokens(query);
    const cTokens = this._tokens(candidate.question);

    if (qTokens.length < 2 || cTokens.length < 2) return 0.0;

    const qBigrams = new Set();
    for (let i = 0; i < qTokens.length - 1; i++) {
      qBigrams.add(`${qTokens[i]} ${qTokens[i+1]}`);
    }

    const cBigrams = new Set();
    for (let i = 0; i < cTokens.length - 1; i++) {
      cBigrams.add(`${cTokens[i]} ${cTokens[i+1]}`);
    }

    let overlapCount = 0;
    for (const bigram of qBigrams) {
      if (cBigrams.has(bigram)) overlapCount++;
    }

    if (qBigrams.size === 0) return 0.0;
    return Math.min(overlapCount / qBigrams.size, 1.0);
  }

  _cosine(vectorA, vectorB) {
    if (!vectorA || !vectorB) return 0.0;
    try {
      let dotProduct = 0.0;
      let normA = 0.0;
      let normB = 0.0;
      for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
      }
      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      if (denominator === 0) return 0.0;
      return dotProduct / denominator;
    } catch (e) {
      return 0.0;
    }
  }

  _detectRequestedYears(query) {
    const q = this._normalizeText(query);
    const years = new Set();

    // Range patterns: 2023-24, 2022 to 2023
    const rangeRegex = /\b(20\d{2})\s*(?:-|to)\s*(\d{2}|20\d{2})\b/g;
    let match;
    while ((match = rangeRegex.exec(q)) !== null) {
      const startYear = parseInt(match[1], 10);
      let endYear = parseInt(match[2], 10);
      if (endYear < 100) {
        endYear = Math.floor(startYear / 100) * 100 + endYear;
      }
      years.add(startYear);
      years.add(endYear);
    }

    // Single years
    const yearRegex = /\b(20\d{2})\b/g;
    while ((match = yearRegex.exec(q)) !== null) {
      years.add(parseInt(match[1], 10));
    }

    return Array.from(years).sort((a, b) => b - a);
  }

  _candidateYears(candidate) {
    const fields = [
      candidate.year || '',
      candidate.filename || '',
      candidate.section || '',
      candidate.question || '',
      candidate.content || ''
    ];
    const text = this._normalizeText(fields.join(' '));
    const years = new Set();

    const rangeRegex = /\b(20\d{2})\s*(?:-|to)\s*(\d{2}|20\d{2})\b/g;
    let match;
    while ((match = rangeRegex.exec(text)) !== null) {
      const startYear = parseInt(match[1], 10);
      let endYear = parseInt(match[2], 10);
      if (endYear < 100) {
        endYear = Math.floor(startYear / 100) * 100 + endYear;
      }
      years.add(startYear);
      years.add(endYear);
    }

    const yearRegex = /\b(20\d{2})\b/g;
    while ((match = yearRegex.exec(text)) !== null) {
      years.add(parseInt(match[1], 10));
    }

    return years;
  }

  _placementYearScore(query, candidate, domain = null) {
    if (!domain) domain = this._detectDomain(query);
    if (domain !== 'placement') return 0.0;

    const requested = this._detectRequestedYears(query);
    const candidateYears = this._candidateYears(candidate);

    if (requested.length > 0) {
      let best = 0.0;
      for (const year of requested) {
        if (candidateYears.has(year)) {
          best = Math.max(best, 1.0);
        }
        if (candidateYears.has(year - 1)) {
          best = Math.max(best, 0.95);
        }
      }
      return best;
    }

    if (candidateYears.has(2026) || candidateYears.has(2025)) return 1.0;
    if (candidateYears.has(2024)) return 0.90;
    if (candidateYears.has(2023)) return 0.80;
    if (candidateYears.has(2022)) return 0.70;
    return 0.0;
  }

  _placementSourceScore(candidate) {
    const fields = [
      candidate.filename || '',
      candidate.section || '',
      candidate.category || '',
      candidate.content || ''
    ];
    const text = this._normalizeText(fields.join(' '));
    const strong = [
      'official placement statistics', 'official placement',
      'placement statistics', 'placement records',
      'year wise placement', 'placement details', 'nirf'
    ];

    if (strong.some(phrase => text.includes(phrase))) {
      return 1.0;
    }
    if (text.includes('placement')) return 0.40;
    return 0.0;
  }

  _expandQuery(query) {
    const lower = query.toLowerCase();
    const expansions = [];

    if (['admission', 'apply', 'application', 'eligibility', 'tnea'].some(w => lower.includes(w))) {
      expansions.push('admission application eligibility TNEA counselling');
    }

    if (['scholarship', 'scholarships', 'merit', 'talent', 'financial'].some(w => lower.includes(w))) {
      expansions.push('scholarship merit talent financial assistance means');
    }

    if (['placement', 'placements', 'company', 'companies', 'recruiter', 'recruiters'].some(w => lower.includes(w))) {
      expansions.push('placement companies recruiters recruitment salary package');
    }

    const statWords = ['placement statistics', 'placement percentage', 'placement rate', 'placement stats'];
    if (statWords.some(w => lower.includes(w))) {
      expansions.push('NEC placement statistics 2025 2026 2024 2025 2023 2024 2022 2023 official placement records NIRF');
    }

    if (['library', 'book', 'books', 'reading'].some(w => lower.includes(w))) {
      expansions.push('library books journals OPAC reading facilities');
    }

    if (['hostel', 'accommodation', 'room', 'mess'].some(w => lower.includes(w))) {
      expansions.push('hostel accommodation rooms mess');
    }

    if (['bus', 'transport', 'route', 'routes'].some(w => lower.includes(w))) {
      expansions.push('transport bus routes timings');
    }

    if (expansions.length > 0) {
      return `${query} ${expansions.join(' ')}`;
    }
    return query;
  }

  async _search(vector) {
    const response = await this.index.namespace(Retriever.NAMESPACE).query({
      vector,
      topK: Retriever.INITIAL_TOP_K,
      includeMetadata: true
    });
    return response;
  }

  _convertMatch(match, source) {
    const metadata = match.metadata || {};
    const score = match.score || 0;
    const question = metadata.question || '';
    const answer = metadata.answer || '';
    let content = metadata.content || '';

    if (!content) {
      if (question && answer) {
        content = `Question: ${question}\nAnswer: ${answer}`;
      } else {
        content = answer || question;
      }
    }

    return {
      id: match.id || '',
      pinecone_score: score,
      content,
      question,
      answer,
      filename: metadata.filename || '',
      category: metadata.category || '',
      section: metadata.section || metadata.section_title || '',
      chunk_type: metadata.chunk_type || metadata.type || '',
      file_type: metadata.file_type || '',
      page_number: metadata.page_number,
      year: metadata.year,
      retrieval_source: source
    };
  }

  _merge(first, second) {
    const merged = {};
    for (const result of [...first, ...second]) {
      const resultId = result.id;
      if (!resultId) continue;
      
      if (!merged[resultId]) {
        merged[resultId] = result;
      } else {
        merged[resultId].retrieval_source = 'both';
      }
    }
    return Object.values(merged);
  }

  async _rerank(query, candidates, queryVector = null, domain = null, intent = null) {
    if (candidates.length === 0) return [];

    if (!queryVector) queryVector = await embedText(query);
    if (!domain) domain = this._detectDomain(query);
    if (!intent) intent = this._detectIntent(query);

    const normalizedQuery = this._normalizeText(query);

    // Compute embeddings for all candidates
    const candidateVectors = await Promise.all(
      candidates.map(async (candidate) => {
        const question = String(candidate.question || '');
        const content = String(candidate.content || '');
        const text = `${question}\n${content}`.substring(0, 4000);
        return embedText(text);
      })
    );

    const questionVectors = await Promise.all(
      candidates.map(async (candidate) => {
        const question = String(candidate.question || '');
        if (question) {
          return embedText(question);
        }
        return null;
      })
    );

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      const pineconeScore = Math.max(0.0, Math.min(1.0, Number(candidate.pinecone_score || 0)));
      const semanticScore = Math.max(0.0, Math.min(1.0, this._cosine(queryVector, candidateVectors[i])));
      
      const question = candidate.question || '';
      let questionSemantic = 0.0;
      if (question && questionVectors[i]) {
        questionSemantic = Math.max(0.0, Math.min(1.0, this._cosine(queryVector, questionVectors[i])));
      }

      const questionToken = this._questionTokenScore(query, candidate);
      const questionScore = 0.60 * questionSemantic + 0.40 * questionToken;
      const keywordScore = this._keywordScore(query, candidate);
      const phraseScore = this._phraseScore(query, candidate);
      const domainScore = this._domainScore(query, candidate, domain);
      const intentScore = this._intentScore(query, candidate, intent);

      const placementYearScore = this._placementYearScore(query, candidate, domain);
      const placementSourceScore = domain === 'placement' ? this._placementSourceScore(candidate) : 0.0;

      let finalScore = (
        Retriever.WEIGHT_PINECONE * pineconeScore
        + Retriever.WEIGHT_SEMANTIC * semanticScore
        + Retriever.WEIGHT_QUESTION * questionScore
        + Retriever.WEIGHT_KEYWORD * keywordScore
        + Retriever.WEIGHT_PHRASE * phraseScore
        + Retriever.WEIGHT_DOMAIN * domainScore
        + Retriever.WEIGHT_INTENT * intentScore
      );

      if (domain === 'placement') {
        finalScore += 0.18 * placementYearScore;
        finalScore += 0.08 * placementSourceScore;
      }

      if (intentScore >= 0.95) {
        finalScore += 0.12;
      } else if (intentScore >= 0.75) {
        finalScore += 0.06;
      }

      const normalizedQuestion = this._normalizeText(question);
      if (normalizedQuery === normalizedQuestion && normalizedQuestion) {
        finalScore += 0.15;
      }

      if (String(candidate.chunk_type).toLowerCase() === 'faq' && question) {
        finalScore += 0.02;
      }

      finalScore = Math.max(0.0, Math.min(1.0, finalScore));

      candidate.semantic_score = semanticScore;
      candidate.question_semantic_score = questionSemantic;
      candidate.question_token_score = questionToken;
      candidate.question_score = questionScore;
      candidate.keyword_score = keywordScore;
      candidate.phrase_score = phraseScore;
      candidate.domain_score = domainScore;
      candidate.intent_score = intentScore;
      candidate.placement_year_score = placementYearScore;
      candidate.placement_source_score = placementSourceScore;
      candidate.final_score = finalScore;
    }

    candidates.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    return candidates;
  }

  _removeDuplicates(results) {
    const final = [];
    const seenIds = new Set();
    const seenContent = new Set();

    for (const result of results) {
      const resultId = result.id;
      const content = this._normalizeText(result.content || '');

      if (seenIds.has(resultId)) continue;
      if (content && seenContent.has(content)) continue;

      seenIds.add(resultId);
      if (content) seenContent.add(content);

      final.push(result);
    }
    return final;
  }

  async retrieve(question, topK = null) {
    if (!question) return [];
    const query = String(question).trim();
    if (!query) return [];

    const startTime = Date.now();
    const expandedQuery = this._expandQuery(query);
    const domain = this._detectDomain(query);
    const intent = this._detectIntent(query);

    console.log('\n' + '='.repeat(70));
    console.log('NEC V7 INTENT-AWARE RETRIEVER (Node.js)');
    console.log('='.repeat(70));
    console.log('\nOriginal Query:', query);
    console.log('\nExpanded Query:', expandedQuery);
    console.log(`\nDetected Domain : ${domain}`);
    console.log(`Detected Intent : ${intent}`);

    console.log('\nSearching Pinecone...');
    const originalVector = await embedText(query);
    const expandedVector = await embedText(expandedQuery);

    // Call Pinecone searches concurrently using Promise.all
    const [originalResponse, expandedResponse] = await Promise.all([
      this._search(originalVector),
      this._search(expandedVector)
    ]);

    const originalMatches = originalResponse.matches || [];
    console.log(`Original Matches: ${originalMatches.length}`);

    const originalResults = originalMatches.map(m => this._convertMatch(m, 'original'));

    const expandedMatches = expandedResponse.matches || [];
    console.log(`Expanded Matches: ${expandedMatches.length}`);

    const expandedResults = expandedMatches.map(m => this._convertMatch(m, 'expanded'));

    let candidates = this._merge(originalResults, expandedResults);
    console.log(`\nUnique Candidates: ${candidates.length}`);

    // Filter candidates below min threshold
    candidates = candidates.filter(c => c.pinecone_score >= Retriever.MIN_PINECONE_SCORE);
    console.log(`Candidates after threshold: ${candidates.length}`);

    console.log('\nRunning intent-aware reranking...');
    candidates = await this._rerank(query, candidates, originalVector, domain, intent);
    candidates = this._removeDuplicates(candidates);

    const limit = topK !== null ? topK : Retriever.FINAL_TOP_K;
    const results = candidates.slice(0, limit);

    console.log('\n' + '='.repeat(70));
    console.log(`FINAL RESULTS: ${results.length}`);
    console.log('='.repeat(70));

    results.forEach((result, idx) => {
      console.log(`\n[${idx + 1}] Final=${(result.final_score || 0).toFixed(4)} | Pinecone=${(result.pinecone_score || 0).toFixed(4)}`);
      console.log(`Semantic        : ${(result.semantic_score || 0).toFixed(4)}`);
      console.log(`Question Sem.   : ${(result.question_semantic_score || 0).toFixed(4)}`);
      console.log(`Question Token  : ${(result.question_token_score || 0).toFixed(4)}`);
      console.log(`Keyword         : ${(result.keyword_score || 0).toFixed(4)}`);
      console.log(`Phrase          : ${(result.phrase_score || 0).toFixed(4)}`);
      console.log(`Domain          : ${(result.domain_score || 0).toFixed(4)}`);
      console.log(`Intent          : ${(result.intent_score || 0).toFixed(4)}`);
      console.log(`Placement Year  : ${(result.placement_year_score || 0).toFixed(4)}`);
      console.log(`Placement Source: ${(result.placement_source_score || 0).toFixed(4)}`);
      console.log(`Type            : ${result.chunk_type || ''}`);
      console.log(`Category        : ${result.category || ''}`);
      console.log(`File            : ${result.filename || ''}`);
      if (result.question) {
        console.log(`Question        : ${result.question}`);
      }
      const preview = String(result.content || '').replace(/\s+/g, ' ');
      console.log(`Content         : ${preview.substring(0, 400)}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Retrieval time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    return results;
  }
}
