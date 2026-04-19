require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const admin = require('firebase-admin');
const { toolDefinitions, executeTool } = require('./mcp-tools');

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const groqTools = toolDefinitions.map(tool => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: tool.parameters }
}));

const SYSTEM_PROMPT = `You are a helpful AI assistant for a short-term stay booking platform like Airbnb.
Help users search listings, book stays, review stays, and view bookings.
For dates use YYYY-MM-DD format. If no year specified assume 2025.`;

// In-memory history (for LLM context)
const memoryHistory = new Map();

async function saveToFirestore(sessionId, role, text) {
  await db.collection('sessions').doc(sessionId).collection('messages').add({
    role, text, timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

function getMemoryHistory(sessionId) {
  if (!memoryHistory.has(sessionId)) memoryHistory.set(sessionId, []);
  return memoryHistory.get(sessionId);
}

app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    // Save user message to Firestore (real-time)
    await saveToFirestore(sessionId, 'user', message);

    // Use in-memory history for LLM
    const history = getMemoryHistory(sessionId);
    history.push({ role: 'user', content: message });

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
    let finalResponse = null;

    for (let i = 0; i < 5; i++) {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile', messages, tools: groqTools, tool_choice: 'auto', max_tokens: 1024
      });
      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content;
        break;
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Tool: ${toolName}`, toolArgs);
        const result = await executeTool(toolName, toolArgs);
        console.log(`✅ Done: ${toolName}`);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
    }

    if (!finalResponse) finalResponse = 'Something went wrong. Please try again.';

    // Save to memory and Firestore
    history.push({ role: 'assistant', content: finalResponse });
    await saveToFirestore(sessionId, 'assistant', finalResponse);

    res.json({ reply: finalResponse, sessionId });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset', async (req, res) => {
  const { sessionId = 'default' } = req.body;
  memoryHistory.delete(sessionId);
  try {
    const snap = await db.collection('sessions').doc(sessionId).collection('messages').get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch {}
  res.json({ message: 'Session reset' });
});

app.get('/health', (req, res) => res.json({ status: 'ok', model: 'llama-3.3-70b-versatile', db: 'firestore' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AI Agent backend running on port ${PORT}`);
  console.log(`📡 StayAPI: ${process.env.STAYAPI_BASE_URL}`);
  console.log(`🤖 Model: llama-3.3-70b-versatile (Groq)`);
  console.log(`🔥 Firestore: connected (real-time logging)`);
});
