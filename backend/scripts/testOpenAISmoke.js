require('dotenv').config();
const openaiService = require('../services/openaiService');

async function run() {
  try {
    const response = await openaiService.smokeTest();
    console.log('OpenAI smoke test response:', response);
  } catch (error) {
    console.error('OpenAI smoke test failed:', error.message);
    process.exitCode = 1;
  }
}

run();
