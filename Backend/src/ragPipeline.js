import { QueryProcessor } from './queryProcessor.js';
import { Retriever } from './retriever.js';
import { Generator } from './generator.js';

export class RAGPipeline {
  constructor() {
    console.log('\n' + '='.repeat(70));
    console.log('NATIONAL ENGINEERING COLLEGE');
    console.log('V6 RAG CHATBOT (Node.js)');
    console.log('='.repeat(70));

    console.log('\nLoading NLP Query Processor...');
    this.queryProcessor = new QueryProcessor();
    console.log('NLP Query Processor initialized.');

    console.log('\nLoading Retriever...');
    this.retriever = new Retriever();
    console.log('Retriever ready.');

    console.log('\nLoading Generator...');
    this.generator = new Generator();
    console.log('Generator ready.');

    console.log('\n' + '='.repeat(70));
    console.log('RAG PIPELINE READY');
    console.log('='.repeat(70));
  }

  isGreeting(query) {
    const q = String(query || '').toLowerCase().trim();
    const greetings = new Set([
      'hi', 'hello', 'hey', 'hai',
      'good morning', 'good afternoon', 'good evening',
      'hi nec', 'hello nec'
    ]);
    return greetings.has(q);
  }

  greetingResponse() {
    return (
      'Hello! 👋 I am the National Engineering College AI assistant. ' +
      'I can help you with admissions, academics, scholarships, placements, ' +
      'hostel, library, transport and other NEC-related information.'
    );
  }

  buildContext(results) {
    if (!results || results.length === 0) {
      return '';
    }

    const contextParts = [];
    results.forEach((result, index) => {
      const question = result.question || '';
      const answer = result.answer || '';
      const content = result.content || '';
      const filename = result.filename || '';
      const category = result.category || '';

      let sourceText = '';
      if (question && answer) {
        sourceText = `Question: ${question}\nAnswer: ${answer}`;
      } else {
        sourceText = content;
      }

      contextParts.push(
        `SOURCE ${index + 1}\nCategory: ${category}\nFile: ${filename}\n${sourceText}`.trim()
      );
    });

    return contextParts.join('\n\n');
  }

  async ask(userQuery) {
    if (!userQuery) {
      return 'Please enter a question.';
    }

    const query = String(userQuery).trim();
    if (!query) {
      return 'Please enter a question.';
    }

    if (this.isGreeting(query)) {
      return this.greetingResponse();
    }

    // NLP Analysis
    const nlp = this.queryProcessor.process(query);

    console.log('\n' + '='.repeat(70));
    console.log('NLP ANALYSIS (Node.js)');
    console.log('='.repeat(70));
    console.log(`Original Query : ${nlp.original_query}`);
    console.log(`Clean Query    : ${nlp.clean_query}`);
    console.log(`Domain         : ${nlp.domain}`);
    console.log(`Intent         : ${nlp.intent}`);
    console.log(`Expanded Query : ${nlp.expanded_query}`);

    // Retrieval
    console.log('\nRunning retrieval...');
    const results = await this.retriever.retrieve(nlp.clean_query, 6);

    if (!results || results.length === 0) {
      return "I couldn't find reliable information about that in the NEC knowledge base.";
    }

    // Context preparation
    const context = this.buildContext(results);

    console.log('\n' + '='.repeat(70));
    console.log('CONTEXT PREPARED');
    console.log('='.repeat(70));
    console.log(`Context Sources: ${results.length}`);

    // Generation
    console.log('\nGenerating final answer...');
    const answer = await this.generator.generate(
      nlp.clean_query,
      context,
      nlp.domain,
      nlp.intent
    );

    return answer;
  }
}
