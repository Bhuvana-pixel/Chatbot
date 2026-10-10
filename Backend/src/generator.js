import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

export class Generator {
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not found in environment variables.');
    }
    this.groq = new Groq({ apiKey });
    let model = (process.env.GROQ_MODEL || 'openai/gpt-oss-20b').trim();
    if (model.includes('compound') || model === 'llama-3.1-8b-instant' || !model) {
      model = 'openai/gpt-oss-20b';
    }
    this.modelName = model;
    this.maxContextLength = 6000;
  }

  _cleanContext(context) {
    let cleaned = String(context || '').trim();
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

    if (cleaned.length > this.maxContextLength) {
      cleaned = cleaned.substring(0, this.maxContextLength) + '\n[Context truncated]';
    }
    return cleaned;
  }

  _systemPrompt(domain, intent) {
    return `You are the NEC college chatbot.

Answer ONLY from the retrieved NEC context.

Rules:
- Do not invent NEC facts.
- Do not use outside knowledge.
- Give the answer directly.
- Keep answers concise.
- Use bullets for lists.
- Use numbered steps for procedures.
- Preserve dates, numbers, names, fees and percentages.
- If the context is insufficient, say:
"I couldn't find that information in the current NEC knowledge base."
- Do not mention RAG, Pinecone, embeddings, NLP or internal systems.

Domain: ${domain}
Intent: ${intent}`.trim();
  }

  _userPrompt(query, context) {
    return `Question:
${query}

NEC Context:
${context}

Answer directly:`.trim();
  }

  _cleanAnswer(answer) {
    if (!answer) return '';
    let cleaned = answer.trim();
    cleaned = cleaned.replace(/^final answer\s*:\s*/i, '');
    cleaned = cleaned.replace(/^answer\s*:\s*/i, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }

  _contextIsInsufficient(context) {
    if (!context) return true;
    if (context.trim().length < 20) return true;
    return false;
  }

  async generate(query, context, domain = 'general', intent = 'general') {
    if (!query) {
      return 'Please enter a question.';
    }

    const cleanCtx = this._cleanContext(context);

    if (this._contextIsInsufficient(cleanCtx)) {
      return "I couldn't find enough information about that in the current NEC knowledge base.";
    }

    console.log('\n' + '='.repeat(70));
    console.log('NEC GENERATOR (Node.js/Groq)');
    console.log('='.repeat(70));
    console.log(`Model          : ${this.modelName}`);
    console.log(`Domain         : ${domain}`);
    console.log(`Intent         : ${intent}`);
    console.log(`Context length : ${cleanCtx.length}`);

    const systemPrompt = this._systemPrompt(domain, intent);
    const userPrompt = this._userPrompt(query, cleanCtx);

    const fallbackModels = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
    const candidateModels = [this.modelName, ...fallbackModels.filter(m => m !== this.modelName)];

    for (const currentModel of candidateModels) {
      try {
        const response = await this.groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: currentModel,
          temperature: 0,
          max_tokens: 1024
        });

        const rawAnswer = response.choices[0]?.message?.content || '';
        const cleanAns = this._cleanAnswer(rawAnswer);

        if (cleanAns) {
          return cleanAns;
        }
      } catch (error) {
        console.error(`Groq generation failed with model '${currentModel}':`, error?.message || error);
      }
    }

    return 'I am unable to generate the answer right now. Please make sure the Groq API configuration is correct.';
  }
}
