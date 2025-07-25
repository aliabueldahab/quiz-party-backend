import express from 'express';
import authRoutes from './routes/auth.routes';
import { createServer } from 'http';
import { Server , Socket } from 'socket.io';




const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer);

app.set("io", io);

app.use('/api/auth', authRoutes);     


app.get('/', (req, res) => {
  res.send('Server is running');
});
httpServer.listen(PORT, async () => {
  try {
    console.log(`Connected to DB`);
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  }
});
