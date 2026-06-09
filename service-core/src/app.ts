import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve logs directory: use AI_PIPELINE_LOG_PATH's parent if set, otherwise default
const logsDir = process.env.AI_PIPELINE_LOG_PATH
  ? path.dirname(process.env.AI_PIPELINE_LOG_PATH)
  : path.resolve(__dirname, '..', 'logs');
fs.mkdirSync(logsDir, { recursive: true });

const requestLogStream = fs.createWriteStream(
  path.join(logsDir, 'requests.txt'),
  { flags: 'a' }
);

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time[0]ms', { stream: requestLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
