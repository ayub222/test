import axios from 'axios';
import { NextFunction as Next, Request, Response } from 'express';
import { scrapeMovieDetails, scrapeMovies } from '../scrapers/movie';

type TController = (req: Request, res: Response, next?: Next) => Promise<void>;

/**
 * Controller for `/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const latestMovies: TController = async (req, res) => {
    try {
        const { page = 1 } = req.query;

        // Try direct / latest endpoint
        try {
            const axiosRequest = await axios.get(
                `${process.env.LK21_URL}/latest${
                    Number(page) > 1 ? `/page/${page}` : ''
                }`
            );

            const payload = await scrapeMovies(req, axiosRequest);
            if (payload && payload.length > 0) {
                res.status(200).json(payload);
                return;
            }
        } catch {
            // Fallback to internal search API if Cloudflare blocks or scraper proxy expires
        }

        // Fallback: search query for current / recent year films via gudangvape (no Cloudflare challenge)
        const currentYear = new Date().getFullYear();
        const fallbackRes = await axios.get(
            `https://gudangvape.com/search.php?s=${currentYear}&page=${encodeURIComponent(
                String(page || 1)
            )}`,
            {
                headers: {
                    Origin: process.env.LK21_URL || 'https://tv12.lk21official.cc',
                    Referer: `${process.env.LK21_URL || 'https://tv12.lk21official.cc'}/`,
                },
            }
        );

        const items = fallbackRes.data?.data || [];
        const protocol = req.protocol;
        const host = req.headers.host;
        const fallbackPayload = items.map((item: any) => ({
            _id: item.slug,
            title: item.title,
            type: item.type || 'movie',
            posterImg: `https://poster.assetsy.de/wp-content/uploads/${item.poster}`,
            rating: String(item.rating || ''),
            url: `${protocol}://${host}/movies/${item.slug}`,
            qualityResolution: item.quality || 'HD',
            genres: [],
        }));

        res.status(200).json(fallbackPayload);
    } catch (err: any) {
        console.error(err);

        res.status(400).json({
            error: err?.message || 'Error occurred',
        });
    }
};

/**
 * Controller for `/popular/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const popularMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const axiosRequest = await axios.get(
            `${process.env.LK21_URL}/populer${
                Number(page) > 1 ? `/page/${page}` : ''
            }`
        );

        // scrape popular movies
        const payload = await scrapeMovies(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err: any) {
        console.error(err);

        res.status(400).json({
            error: err?.message || 'Error occurred',
            code: err?.code,
            responseStatus: err?.response?.status,
            responseData: typeof err?.response?.data === 'string' ? err.response.data.slice(0, 300) : err?.response?.data
        });
    }
};

/**
 * Controller for `/recent-release/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const recentReleaseMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const axiosRequest = await axios.get(
            `${process.env.LK21_URL}/release${
                Number(page) > 1 ? `/page/${page}` : ''
            }`
        );

        const payload = await scrapeMovies(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err: any) {
        console.error(err);

        res.status(400).json({
            error: err?.message || 'Error occurred',
            code: err?.code,
            responseStatus: err?.response?.status,
            responseData: typeof err?.response?.data === 'string' ? err.response.data.slice(0, 300) : err?.response?.data
        });
    }
};

/**
 * Controller for `/top-rated/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const topRatedMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const axiosRequest = await axios.get(
            `${process.env.LK21_URL}/rating${
                Number(page) > 1 ? `/page/${page}` : ''
            }`
        );

        const payload = await scrapeMovies(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err: any) {
        console.error(err);

        res.status(400).json({
            error: err?.message || 'Error occurred',
            code: err?.code,
            responseStatus: err?.response?.status,
            responseData: typeof err?.response?.data === 'string' ? err.response.data.slice(0, 300) : err?.response?.data
        });
    }
};

/**
 * Controller for `/movies/{movieId}` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const movieDetails: TController = async (req, res) => {
    try {
        const { id } = req.params;

        const axiosRequest = await axios.get(`${process.env.LK21_URL}/${id}`);

        const payload = await scrapeMovieDetails(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err: any) {
        console.error(err);

        res.status(400).json({
            error: err?.message || 'Error occurred',
            code: err?.code,
            responseStatus: err?.response?.status,
            responseData: typeof err?.response?.data === 'string' ? err.response.data.slice(0, 300) : err?.response?.data
        });
    }
};
