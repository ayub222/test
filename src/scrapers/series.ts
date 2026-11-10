import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISeasonsList, ISeries, ISeriesDetails } from '../types';

/**
 * Scrape series asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeries>} array of series objects
 */
export const scrapeSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISeries[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    $('div.gallery-grid > article').each((i, el) => {
        const genreRaw =
            $(el).find('meta[itemprop="genre"]').attr('content') ||
            $(el).find('figcaption div.genre').text() ||
            '';
        const genres: string[] = genreRaw
            .split(',')
            .map((g) => g.trim().toLowerCase().replace(/\s+/g, '-'))
            .filter(Boolean);

        const href =
            $(el).find('figure > a').attr('href') ||
            $(el).find('a').first().attr('href') ||
            '';
        const seriesId = href.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';

        const imgEl = $(el).find('figure img');
        const rawSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
        const posterImg = rawSrc.startsWith('http')
            ? rawSrc
            : rawSrc
            ? `https:${rawSrc}`
            : '';

        const obj = {} as ISeries;

        obj['_id'] = seriesId;
        obj['title'] =
            imgEl.attr('alt') ||
            $(el).find('h3.poster-title').text().trim() ||
            '';
        obj['type'] = 'series';
        obj['posterImg'] = posterImg;
        obj['episode'] =
            Number($(el).find('span.episode strong').text().trim()) || 0;
        obj['rating'] =
            $(el).find('span.rating [itemprop="ratingValue"]').text().trim() ||
            $(el).find('span.rating').text().trim();
        obj['url'] = `${protocol}://${host}/series/${seriesId}`;
        obj['genres'] = genres;

        if (seriesId) {
            payload.push(obj);
        }
    });

    return payload;
};

/**
 * Scrape series details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeriesDetails>} series details object
 */
export const scrapeSeriesDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeriesDetails> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as ISeriesDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    obj['_id'] = originalUrl.split('/').filter(Boolean).pop() ?? '';
    obj['title'] = $('div.movie-info > h1').first().text().trim();
    obj['type'] = 'series';

    const detailImg = $('div.meta-info div.detail img');
    const rawPoster =
        detailImg.attr('data-src') ||
        detailImg.attr('src') ||
        $('#videoAd').attr('poster') ||
        '';
    obj['posterImg'] = rawPoster.startsWith('http')
        ? rawPoster
        : rawPoster
        ? `https:${rawPoster}`
        : '';

    let status = '';
    let releaseDate = '';
    let duration = '';

    $('div.movie-info div.info-tag > span').each((i, el) => {
        const text = $(el).text().trim();
        if (!text) return;
        if (/ongoing|complete|completed|tamat/i.test(text)) {
            status = text.toLowerCase();
        } else if (/\d+\s*(h|m|min|jam|menit)/i.test(text)) {
            duration = text;
        } else if (!releaseDate && /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}/.test(text)) {
            releaseDate = text;
        }
    });

    obj['status'] = status;
    obj['releaseDate'] = releaseDate;
    obj['duration'] = duration;
    obj['rating'] = $('div.rating-score span.rating-number').text().trim();

    $('div.movie-info div.tag-list a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (href.includes('/genre/') && text && !genres.includes(text)) {
            genres.push(text);
        } else if (
            href.includes('/country/') &&
            text &&
            !countries.includes(text)
        ) {
            countries.push(text);
        }
    });

    $('div.meta-info div.detail > p').each((i, el) => {
        const label = $(el).find('span').first().text().toLowerCase().trim();
        if (label.includes('sutradara')) {
            $(el)
                .find('a')
                .each((_, a) => {
                    const name = $(a).text().trim();
                    if (name) directors.push(name);
                });
        } else if (label.includes('bintang')) {
            $(el)
                .find('a')
                .each((_, a) => {
                    const name = $(a).text().trim();
                    if (name) casts.push(name);
                });
        } else if (label.includes('negara')) {
            $(el)
                .find('a')
                .each((_, a) => {
                    const name = $(a).text().trim();
                    if (name && !countries.includes(name)) {
                        countries.push(name);
                    }
                });
        } else if (label.includes('release') || label.includes('diterbitkan')) {
            const clone = $(el).clone();
            clone.find('span').remove();
            obj['releaseDate'] = clone.text().trim();
        }
    });

    const seasons: ISeasonsList[] = [];
    let totalEpisodesCount = 0;
    const seasonDataRaw = $('script#season-data').html();
    if (seasonDataRaw) {
        try {
            const seasonMap = JSON.parse(seasonDataRaw);
            Object.keys(seasonMap).forEach((sKey) => {
                const eps = Array.isArray(seasonMap[sKey])
                    ? seasonMap[sKey].length
                    : 0;
                totalEpisodesCount += eps;
                seasons.push({
                    season: Number(sKey),
                    totalEpisodes: eps,
                });
            });
        } catch (e) {
            // ignore JSON parse error
        }
    }

    const watchHistoryRaw = $('script#watch-history-data').html();
    if (watchHistoryRaw) {
        try {
            const wh = JSON.parse(watchHistoryRaw);
            if (wh.total_eps) {
                totalEpisodesCount = Number(wh.total_eps);
            }
        } catch (e) {
            // ignore JSON parse error
        }
    }

    obj['episode'] = totalEpisodesCount;
    obj['synopsis'] = $('div.meta-info div.synopsis').text().trim();
    obj['trailerUrl'] = $('a.yt-lightbox').first().attr('href') ?? '';
    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;
    obj['seasons'] = seasons;

    return obj;
};
