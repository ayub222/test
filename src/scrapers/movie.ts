import { Request } from 'express';
import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { IMovies, IMovieDetails } from '@/types';

/**
 * Scrape movies asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovies[]>} array of movies objects
 */
export const scrapeMovies = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovies[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: IMovies[] = [];
    const {
        protocol,
        headers: { host },
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
        const movieId = href.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';

        const imgEl = $(el).find('figure img');
        const rawSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
        const posterImg = rawSrc.startsWith('http')
            ? rawSrc
            : rawSrc
            ? `https:${rawSrc}`
            : '';

        const obj = {} as IMovies;

        obj['_id'] = movieId;
        obj['title'] =
            imgEl.attr('alt') ||
            $(el).find('h3.poster-title').text().trim() ||
            '';
        obj['type'] = 'movie';
        obj['posterImg'] = posterImg;
        obj['rating'] =
            $(el).find('span.rating [itemprop="ratingValue"]').text().trim() ||
            $(el).find('span.rating').text().trim();
        obj['url'] = `${protocol}://${host}/movies/${movieId}`;
        obj['qualityResolution'] = $(el).find('span.label').text().trim();
        obj['genres'] = genres;

        if (movieId) {
            payload.push(obj);
        }
    });

    return payload;
};

/**
 * Scrape movie details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovieDetails>} movie details object
 */
export const scrapeMovieDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovieDetails> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as IMovieDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    obj['_id'] = originalUrl.split('/').filter(Boolean).pop() ?? '';
    obj['title'] = $('div.movie-info > h1').first().text().trim();
    obj['type'] = 'movie';

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

    const qualities: string[] = [];
    let duration = '';
    $('div.movie-info div.info-tag > span').each((i, el) => {
        const text = $(el).text().trim();
        if (!text) return;
        if (/\d+\s*(h|m|min|jam|menit)/i.test(text)) {
            duration = text;
        } else if (!/^\d+\+$|^SU$|^R$|^PG/i.test(text)) {
            qualities.push(text);
        }
    });

    obj['quality'] = qualities.join(' ');
    obj['duration'] = duration;
    obj['rating'] = $('div.rating-score span.rating-number').text().trim();
    obj['releaseDate'] = '';

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

    obj['synopsis'] = $('div.meta-info div.synopsis').text().trim();
    obj['trailerUrl'] = $('a.yt-lightbox').first().attr('href') ?? '';
    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;

    return obj;
};
