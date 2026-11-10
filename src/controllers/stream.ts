import axios from 'axios';
import { NextFunction as Next, Request, Response } from 'express';
import { scrapeStreamSources } from '../scrapers/stream';

type TController = (req: Request, res: Response, next?: Next) => Promise<void>;

/**
 * Controller for `/movies/:movieId/streams` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const streamMovie: TController = async (req, res) => {
    try {
        const { id, movieId } = req.params;
        const targetId = id || movieId || req.originalUrl.split('/').filter(Boolean).slice(-2)[0];

        const axiosRequest = await axios.get(
            `${process.env.LK21_URL}/${targetId}`
        );

        const payload = await scrapeStreamSources(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};

/**
 * Controller for `/series/:seriesId/streams` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const streamSeries: TController = async (req, res) => {
    try {
        const { id, seriesId } = req.params;
        const targetSeriesId = id || seriesId || req.originalUrl.split('/').filter(Boolean).slice(-2)[0];
        const { season = 1, episode = 1 } = req.query;

        const _ids = targetSeriesId.split('-');
        const year = _ids.pop();
        const baseSeriesId = _ids.join('-');

        const axiosRequest = await axios.get(
            `${process.env.ND_URL}/${baseSeriesId}-season-${season}-episode-${episode}-${year}`
        );

        const payload = await scrapeStreamSources(req, axiosRequest);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};
