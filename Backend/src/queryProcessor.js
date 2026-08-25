/**
 * QueryProcessor - Domain and intent detection logic for query understanding.
 */
export class QueryProcessor {
  constructor() {
    this.GENERIC_WORDS = new Set([
      'what', 'which', 'where', 'when', 'how', 'why',
      'who', 'does', 'do', 'is', 'are', 'can',
      'could', 'would', 'should', 'tell', 'about',
      'give', 'please', 'the', 'a', 'an', 'at',
      'in', 'on', 'for', 'to', 'of', 'and', 'or',
      'with', 'from', 'me', 'my', 'i', 'we',
      'you', 'your'
    ]);

    this.DOMAINS = {
      scholarship: new Set([
        'scholarship', 'scholarships', 'merit', 'talent', 'means', 'financial', 'aid'
      ]),
      admission: new Set([
        'admission', 'apply', 'application', 'eligibility', 'tnea', 'joining', 'join'
      ]),
      placement: new Set([
        'placement', 'placements', 'company', 'companies', 'recruiter', 'recruiters',
        'recruitment', 'salary', 'package', 'job'
      ]),
      library: new Set([
        'library', 'libraries', 'book', 'books', 'journal', 'journals', 'opac',
        'reading', 'printing', 'ebook'
      ]),
      hostel: new Set([
        'hostel', 'accommodation', 'room', 'rooms', 'mess'
      ]),
      transport: new Set([
        'bus', 'transport', 'transportation', 'route', 'routes', 'pickup', 'drop',
        'timing', 'timings'
      ]),
      examination: new Set([
        'exam', 'examination', 'semester', 'arrear', 'arrears', 'regulation', 'internal',
        'hallticket'
      ]),
      department: new Set([
        'department', 'departments', 'course', 'courses', 'programme', 'program',
        'branch', 'cse', 'ece', 'eee', 'mechanical', 'civil'
      ]),
      contact: new Set([
        'contact', 'phone', 'telephone', 'email', 'address', 'location'
      ])
    };
  }

  normalize(text) {
    let clean = String(text || '').trim().toLowerCase();

    const replacements = {
      'pls': 'please',
      'plz': 'please',
      'scholrship': 'scholarship',
      'scholrships': 'scholarships',
      'admsn': 'admission',
      'admision': 'admission',
      'clg': 'college',
      'collg': 'college',
      'compny': 'company',
      'companies': 'companies'
    };

    for (const [oldWord, newWord] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${oldWord}\\b`, 'g');
      clean = clean.replace(regex, newWord);
    }

    clean = clean.replace(/\s+/g, ' ');
    return clean.trim();
  }

  tokens(text) {
    const sanitized = text.replace(/[^a-zA-Z0-9\s]/g, ' ');
    const list = sanitized.toLowerCase().split(/\s+/);
    return list.filter(token => token.length > 2 && !this.GENERIC_WORDS.has(token));
  }

  detectDomain(query) {
    const queryTokens = new Set(this.tokens(query));
    const scores = {};

    for (const [domain, keywords] of Object.entries(this.DOMAINS)) {
      let intersectionCount = 0;
      for (const token of queryTokens) {
        if (keywords.has(token)) {
          intersectionCount++;
        }
      }
      scores[domain] = intersectionCount;
    }

    let bestDomain = 'general';
    let maxScore = 0;

    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain;
      }
    }

    return bestDomain;
  }

  detectIntent(query, domain) {
    const q = query.toLowerCase();

    if (domain === 'scholarship') {
      const listPhrases = [
        'what scholarships', 'which scholarships', 'scholarships available',
        'what scholarship', 'which scholarship', 'scholarship categories',
        'types of scholarship'
      ];
      if (listPhrases.some(phrase => q.includes(phrase))) {
        return 'scholarship_list';
      }
      if (q.includes('merit scholarship')) return 'scholarship_merit';
      if (q.includes('talent scholarship')) return 'scholarship_talent';
      if (q.includes('sports scholarship')) return 'scholarship_sports';
      if (q.includes('does nec provide scholarship') || q.includes('does nec offer scholarship')) {
        return 'scholarship_availability';
      }
      return 'scholarship_general';
    }

    if (domain === 'admission') {
      const processPhrases = [
        'how can i get admission', 'how to get admission', 'how do i get admission',
        'how can i apply', 'how to apply', 'admission process'
      ];
      if (processPhrases.some(phrase => q.includes(phrase))) {
        return 'admission_process';
      }
      if (q.includes('tnea')) return 'admission_tnea';
      if (q.includes('eligibility')) return 'admission_eligibility';
      if (q.includes('document') || q.includes('certificate') || q.includes('marksheet')) {
        return 'admission_documents';
      }
      if (q.includes('where') && q.includes('admission')) {
        return 'admission_information';
      }
      return 'admission_general';
    }

    if (domain === 'placement') {
      const companyPhrases = [
        'what companies', 'which companies', 'companies visit',
        'companies recruit', 'who recruits', 'recruiters'
      ];
      if (companyPhrases.some(phrase => q.includes(phrase))) {
        return 'placement_companies';
      }
      if (['salary', 'package', 'ctc'].some(word => q.includes(word))) {
        return 'placement_salary';
      }
      if (['statistics', 'percentage', 'rate'].some(word => q.includes(word))) {
        return 'placement_statistics';
      }
      return 'placement_general';
    }

    if (domain === 'library') {
      if (q.includes('facility') || q.includes('facilities')) return 'library_facilities';
      if (q.includes('timing') || q.includes('timings') || q.includes('open')) return 'library_timing';
      if (['book', 'books', 'journal'].some(word => q.includes(word))) return 'library_resources';
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
      if (q.includes('arrear')) return 'examination_arrear';
      if (q.includes('regulation')) return 'examination_regulations';
      return 'examination_information';
    }

    // General question types
    if (q.startsWith('where')) return 'location';
    if (q.startsWith('when')) return 'date_time';
    if (q.startsWith('how')) return 'procedure';

    const yesNoPrefixes = ['does ', 'do ', 'is ', 'are ', 'can ', 'has ', 'have '];
    if (yesNoPrefixes.some(prefix => q.startsWith(prefix))) {
      return 'yes_no';
    }

    return 'general';
  }

  expandQuery(query, domain, intent) {
    const expansions = [];

    if (domain === 'admission') {
      expansions.push('admission application eligibility TNEA counselling');
    } else if (domain === 'scholarship') {
      expansions.push('scholarships merit talent financial assistance means');
    } else if (domain === 'placement') {
      expansions.push('placement companies recruiters recruitment salary package');
    } else if (domain === 'library') {
      expansions.push('library books journals OPAC facilities resources');
    } else if (domain === 'hostel') {
      expansions.push('hostel accommodation rooms mess facilities');
    } else if (domain === 'transport') {
      expansions.push('transport bus routes timings');
    } else if (domain === 'examination') {
      expansions.push('examination semester regulations academic rules');
    }

    if (intent === 'admission_process') {
      expansions.push('how to get admission admission procedure TNEA');
    } else if (intent === 'admission_documents') {
      expansions.push('required documents certificates marksheets admission');
    } else if (intent === 'scholarship_list') {
      expansions.push('scholarship categories merit talent sports means');
    } else if (intent === 'placement_companies') {
      expansions.push('companies visiting campus recruiters company list');
    } else if (intent === 'library_facilities') {
      expansions.push('library facilities services books reading hall journals');
    }

    if (expansions.length === 0) {
      return query;
    }

    return `${query} ${expansions.join(' ')}`.trim();
  }

  process(rawQuery) {
    const cleaned = this.normalize(rawQuery);
    const domain = this.detectDomain(cleaned);
    const intent = this.detectIntent(cleaned, domain);
    const expanded = this.expandQuery(cleaned, domain, intent);

    return {
      original_query: rawQuery,
      clean_query: cleaned,
      expanded_query: expanded,
      domain,
      intent
    };
  }
}
