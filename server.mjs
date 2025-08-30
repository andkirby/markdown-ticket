import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Serve static files from the tasks directory
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksDir = path.join(__dirname, 'tasks');
    const files = await fs.readdir(tasksDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    res.json(mdFiles);
  } catch (error) {
    console.error('Error reading tasks directory:', error);
    res.json([]);
  }
});

// Serve individual task files
app.get('/api/tasks/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'tasks', filename);
    
    // Security check - ensure file is within tasks directory
    const resolvedPath = path.resolve(filePath);
    const tasksDir = path.resolve(__dirname, 'tasks');
    
    if (!resolvedPath.startsWith(tasksDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const content = await fs.readFile(resolvedPath, 'utf8');
    res.send(content);
  } catch (error) {
    console.error(`Error reading file ${req.params.filename}:`, error);
    res.status(404).json({ error: 'File not found' });
  }
});

// For any other route, return a simple message
app.get('*', (req, res) => {
  res.json({ message: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});