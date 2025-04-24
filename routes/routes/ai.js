// /routes/ai.js

const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Store in .env
});

// Chat Route
router.post("/chat", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiReply = response.choices[0]?.message?.content;
    res.json({ reply: aiReply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Image Generation Route
router.post("/image", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await openai.images.generate({
      model: "gpt-4o-mini",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data[0]?.url;
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// routes/admin/aiChat.js

// Mock AI chat endpoint
// router.post('/admin/ai-chat', async (req, res) => {
//   try {
//     const { message } = req.body;

//     if (!message) {
//       return res.status(400).json({ error: "Message is required" });
//     }

//     // Mock response: you can customize this
//     const mockReplies = [
//       "Hello Admin! 👋 How can I assist you today?",
//       "Processing your request... ✅",
//       "I'm just a mock AI, but I'm doing my best! 🤖",
//       "Here’s a sample AI response based on your message: " + message,
//     ];

//     const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];

//     res.json({
//       reply: randomReply,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Something went wrong in mock AI" });
//   }
// });

router.post('/admin/ai-chat', async (req, res) => {
    try {
      const { message } = req.body;
  
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
  
      let reply = "As part of this demo, you are viewing a mock response.";
  
      // Check for keywords inside the message
      if (message.toLowerCase().includes('expert') || message.toLowerCase().includes('trip')) {
        reply = "🌍 Sure! Here are some expert tips for your trip:\n- Research local customs\n- Pack light\n- Have backup plans\n- Learn basic phrases of the local language.";
      } else if (message.toLowerCase().includes('sales') || message.toLowerCase().includes('pitch')) {
        reply = "🛍️ Here's a logical sales pitch outline:\n1. Identify the problem\n2. Present your product as the solution\n3. Showcase unique benefits\n4. End with a strong call-to-action.";
      } else if (message.toLowerCase().includes('organized') || message.toLowerCase().includes('tips')) {
        reply = "📝 10 Tips to Stay Organized:\n1. Use a planner\n2. Prioritize tasks daily\n3. Declutter weekly\n4. Set goals\n5. Break projects into steps\n6. Use reminders\n7. Review progress\n8. Delegate tasks\n9. Stay consistent\n10. Celebrate achievements!";
      } else if (message.toLowerCase().includes('code') || message.toLowerCase().includes('task')) {
        reply = "💻 Here's a sample code snippet:\n```javascript\nfunction addNumbers(a, b) {\n  if (typeof a !== 'number' || typeof b !== 'number') {\n    throw new Error('Invalid input');\n  }\n  return a + b;\n}\n```";
      } else {
        // default fallback
        reply = "🧠 This is a mock AI response. Try using words like 'title', 'code', or 'list' to get different kinds of answers!";
      }
  
      res.json({
        reply,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong in mock AI" });
    }
  });
  

module.exports = router;
