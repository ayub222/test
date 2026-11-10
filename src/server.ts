import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

process.env.LK21_URL = process.env.LK21_URL || 'https://tv12.lk21official.cc';
process.env.ND_URL = process.env.ND_URL || 'https://tv1.layanfilem.my';
process.env.DL_URL = process.env.DL_URL || 'https://dadadidi.de';
process.env.SCRAPER_API_KEY =
    process.env.SCRAPER_API_KEY || 'cda4f4641c6de6313838a5cf6e5595a1';

// Intercept outgoing GET requests to LK21 / NontonDrama to route via ScraperAPI if configured
axios.interceptors.request.use((config) => {
    const key = process.env.SCRAPER_API_KEY;
    if (key && config.url && config.method?.toLowerCase() === 'get') {
        const urlStr = config.url;
        if (
            urlStr.includes('lk21official') ||
            urlStr.includes('layanfilem') ||
            urlStr.includes('lk21.de') ||
            urlStr.includes('nontondrama')
        ) {
            config.url = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(
                urlStr
            )}`;
        }
    }
    return config;
});

axios.defaults.headers.common['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
axios.defaults.headers.common['Accept'] =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
axios.defaults.headers.common['Accept-Language'] = 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7';

import express, { Application, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import routes from './routes';

const app: Application = express();

// middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors({ origin: '*' }));

app.use(routes);

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'Unofficial LK21 (LayarKaca21) and NontonDrama APIs',
        data: {
            LK21_URL: process.env.LK21_URL,
            ND_URL: process.env.ND_URL,
        },
    });
});

export default app;
