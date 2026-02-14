import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import poolsRouter from './routes/pools';
import locationsRouter from './routes/locations';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Enable CORS for all origins (mobile app needs this)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Location-scoped pools API
app.use('/locations', locationsRouter);

// Backwards-compat alias: /pools/* → /locations/boulder/pools/*
// When mounted at /pools, Express strips the /pools prefix so req.url starts
// with '/' (e.g. '/', '/nearby', '/search', '/some-id').
// We rewrite to '/boulder/pools' + original path so the locationsRouter
// can handle it via its /:location/pools/* routes.
app.use('/pools', (req: Request, _res: Response, next: NextFunction) => {
  const suffix = req.url === '/' ? '' : req.url;
  req.url = '/boulder/pools' + suffix;
  next();
}, locationsRouter);

// Trigger re-scrape (stub — logs and returns 202 Accepted)
app.post('/scrape', (_req: Request, res: Response) => {
  console.log('[scrape] Re-scrape triggered at', new Date().toISOString());
  res.status(202).json({
    status: 'accepted',
    message: 'Scrape job queued',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Pool Finder API running on http://localhost:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  GET  /locations`);
  console.log(`  GET  /locations/:location/pools`);
  console.log(`  GET  /locations/:location/pools/nearby?lat=&lng=&radius=`);
  console.log(`  GET  /locations/:location/pools/search?q=`);
  console.log(`  GET  /locations/:location/pools/availability?day=`);
  console.log(`  GET  /locations/:location/pools/:id`);
  console.log(`  --- Backwards-compat aliases (defaults to boulder) ---`);
  console.log(`  GET  /pools`);
  console.log(`  GET  /pools/nearby?lat=&lng=&radius=`);
  console.log(`  GET  /pools/search?q=`);
  console.log(`  GET  /pools/availability?day=`);
  console.log(`  GET  /pools/:id`);
  console.log(`  POST /scrape`);
});

export default app;
