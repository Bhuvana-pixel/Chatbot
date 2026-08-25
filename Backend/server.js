import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RAGPipeline } from './src/ragPipeline.js';
import { getEmbedderInstance } from './src/embedder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: false
}));

// Parse JSON request bodies
app.use(express.json());

// Application state
let ragPipeline = null;
let initializationStatus = 'initializing';
let initializationError = null;

// ============================================================
// BACKGROUND PIPELINE INITIALIZATION
// ============================================================
async function initPipelineBackground() {
  console.log('\n' + '='.repeat(70));
  console.log('STARTING NATIONAL ENGINEERING COLLEGE CHATBOT BACKEND (Express)');
  console.log('='.repeat(70));

  try {
    // 1. Force the embedding model to download and load first
    await getEmbedderInstance();

    // 2. Initialize the full RAG pipeline
    ragPipeline = new RAGPipeline();
    initializationStatus = 'healthy';
    
    console.log('\n' + '='.repeat(70));
    console.log('RAG PIPELINE LOADED SUCCESSFULLY');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    initializationStatus = 'error';
    initializationError = error.message;

    console.error('\n' + '='.repeat(70));
    console.error('ERROR: FAILED TO INITIALIZE RAG PIPELINE');
    console.error('='.repeat(70));
    console.error(`Error Type : ${error.name}`);
    console.error(`Error      : ${error.message}`);
    console.error(error.stack);
    console.error('='.repeat(70) + '\n');
  }
}

// Start background initialization (does not block port listening)
initPipelineBackground();

// ============================================================
// ROUTES
// ============================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'National Engineering College Chatbot API',
    status: initializationStatus === 'healthy' ? 'running' : 'initializing',
    version: '2.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  if (initializationStatus === 'initializing') {
    return res.json({
      status: 'initializing',
      rag_pipeline: 'loading — please wait and retry'
    });
  }

  if (initializationStatus === 'error') {
    return res.status(500).json({
      status: 'error',
      rag_pipeline: 'failed to initialize',
      error: initializationError
    });
  }

  res.json({
    status: 'healthy',
    rag_pipeline: 'ready',
    retriever: 'Pinecone',
    generator: 'Groq',
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    index: 'college-admission-chatbot',
    namespace: 'nec_v2'
  });
});

// Ask endpoint
app.post('/ask', async (req, res) => {
  // Validate pipeline initialization
  if (initializationStatus === 'initializing') {
    return res.status(503).json({
      success: false,
      detail: 'RAG pipeline is still initializing. Please retry in 30 seconds.'
    });
  }

  if (initializationStatus === 'error' || !ragPipeline) {
    return res.status(503).json({
      success: false,
      detail: `RAG pipeline failed to initialize: ${initializationError || 'Unknown error'}`
    });
  }

  const { question } = req.body;

  // Validate request question
  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      detail: 'Question cannot be empty.'
    });
  }

  const cleanedQuestion = question.trim();
  if (!cleanedQuestion) {
    return res.status(400).json({
      success: false,
      detail: 'Question cannot be empty.'
    });
  }

  try {
    const answer = await ragPipeline.ask(cleanedQuestion);
    
    res.json({
      success: true,
      question: cleanedQuestion,
      answer,
      sources: [] // Retain matching key layout
    });
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('RAG ERROR');
    console.error('='.repeat(70));
    console.error(`Error Type : ${error.name}`);
    console.error(`Error      : ${error.message}`);
    console.error('='.repeat(70) + '\n');

    res.status(500).json({
      success: false,
      detail: 'Failed to generate an answer.'
    });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
