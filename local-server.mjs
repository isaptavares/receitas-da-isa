import express from 'express';
import cors from 'cors';
import handler from './api/extract-video.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/extract-video', async (req, res) => {
  // Wrap the Vercel serverless function request and response
  const vercelReq = {
    method: req.method,
    body: req.body,
    headers: req.headers
  };
  
  const vercelRes = {
    setHeader: (key, val) => res.setHeader(key, val),
    status: (code) => {
      res.status(code);
      return vercelRes;
    },
    json: (data) => res.json(data),
    end: () => res.end()
  };

  try {
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error("Local Server Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local Vercel API running at http://localhost:${PORT}`);
});
