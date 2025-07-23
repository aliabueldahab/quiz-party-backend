import express from 'express';
import authRoutes from './routes/auth.routes';



const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.use('/api/auth', authRoutes);     


app.get('/', (req, res) => {
  res.send('Welcome to Bank API');
});

app.listen(PORT, async () => {
  try {
    console.log(`Connected to DB`);
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  }
});
