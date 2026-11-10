import axios, { AxiosResponse } from 'axios';
import cheerio from 'cheerio';
import { Request } from 'express';
import { ISearchedMoviesOrSeries } from '../types';

/**
 * Scrape searched movies or series
 * @param {Request} req
 * @param {AxiosResponse} res
 * @returns {Promise.<ISearchedMoviesOrSeries[]>} array of movies or series
 */
export const scrapeSearchedMoviesOrSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISearchedMoviesOrSeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISearchedMoviesOrSeries[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    const { title = '' } = req.params;
    const { page = 1 } = req.query;

    const searchUrl =
        $('body').attr('data-search_url') || 'https://gudangvape.com/';
    const thumbnailUrl =
        $('body').attr('data-thumbnail_url') ||
        'https://poster.assetsy.de/wp-content/uploads/';

    try {
        const apiUrl = `${
            searchUrl.endsWith('/') ? searchUrl : `${searchUrl}/`
        }search.php?s=${encodeURIComponent(title)}&page=${encodeURIComponent(
            String(page || 1)
        )}`;

        const apiRes = await axios.get(apiUrl, {
            headers: {
                Origin: process.env.LK21_URL || 'https://tv12.lk21official.cc',
                Referer: `${
                    process.env.LK21_URL || 'https://tv12.lk21official.cc'
                }/`,
            },
        });

        const items =
            (apiRes.data && (apiRes.data.data || apiRes.data.items)) || [];

        if (Array.isArray(items)) {
            items.forEach((item: any) => {
                const slug = String(item.slug || '').replace(/^\/+|\/+$/g, '');
                if (!slug) return;

                const type: 'movie' | 'series' =
                    item.type === 'series' ? 'series' : 'movie';
                const routePrefix = type === 'series' ? 'series' : 'movies';

                let posterImg = '';
                if (item.poster) {
                    try {
                        posterImg = new URL(
                            String(item.poster),
                            thumbnailUrl
                        ).toString();
                    } catch {
                        posterImg = String(item.poster);
                    }
                }

                payload.push({
                    _id: slug,
                    title: String(item.title || ''),
                    type,
                    posterImg,
                    url: `${protocol}://${host}/${routePrefix}/${slug}`,
                    genres: [],
                    directors: [],
                    casts: [],
                });
            });
        }
    } catch (err) {
        console.error(err);
    }

    return payload;
};
