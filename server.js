const express = require('express');
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

const WORKSPACE = path.join(__dirname, '..');

// Serve static files
app.use(express.static('public'));

// API: System stats
app.get('/api/stats', async (req, res) => {
  try {
    const [cpu, mem, gpu, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
      si.osInfo()
    ]);
    
    res.json({
      cpu: {
        usage: cpu.currentLoad.toFixed(1),
        cores: cpu.cpus.length
      },
      memory: {
        used: (mem.used / 1024 / 1024 / 1024).toFixed(2),
        total: (mem.total / 1024 / 1024 / 1024).toFixed(2),
        percent: ((mem.used / mem.total) * 100).toFixed(1)
      },
      gpu: gpu.controllers.length > 0 ? gpu.controllers.map(g => ({
        model: g.model,
        vram: g.vram ? (g.vram / 1024).toFixed(1) + ' GB' : 'N/A'
      })) : [],
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        hostname: osInfo.hostname
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get file content as HTML
app.get('/api/file/:name', (req, res) => {
  const allowedFiles = ['IDENTITY.md', 'SOUL.md', 'USER.md', 'AGENTS.md', 'MEMORY.md'];
  const fileName = req.params.name.toUpperCase();
  
  if (!allowedFiles.includes(fileName)) {
    return res.status(403).json({ error: 'File not accessible' });
  }
  
  const filePath = path.join(WORKSPACE, fileName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const html = marked(content);
    res.json({ 
      name: fileName,
      html: html,
      raw: content
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: List memory files
app.get('/api/memory-files', (req, res) => {
  const memoryDir = path.join(WORKSPACE, 'memory');
  
  if (!fs.existsSync(memoryDir)) {
    return res.json({ files: [] });
  }
  
  try {
    const files = fs.readdirSync(memoryDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 10);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get memory file content
app.get('/api/memory/:file', (req, res) => {
  const memoryDir = path.join(WORKSPACE, 'memory');
  const filePath = path.join(memoryDir, req.params.file);
  
  if (!fs.existsSync(filePath) || !req.params.file.endsWith('.md')) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const html = marked(content);
    res.json({ 
      name: req.params.file,
      html: html,
      raw: content
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Status
app.get('/api/status', (req, res) => {
  res.json({
    name: 'Los Blanco',
    nickname: 'Blanco',
    status: 'online',
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`⚪ Los Blanco Dashboard running at http://localhost:${PORT}`);
});
