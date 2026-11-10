import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISetOfGenres } from '@/types';
import genres from '@/json/genres.json';

/**
 * Scrape a set of genres asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISetOfGenres[]>} a set of genres
 */
export const scrapeSetOfGenres = async (
    req: Request,
    res: AxiosResponse
): Promise<ISetOfGenres[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISetOfGenres[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    const seen = new Set<string>();

    $('select[name="genre1"]')
        .first()
        .find('option')
        .each((i, el) => {
            const value = ($(el).attr('value') || '').trim().toLowerCase();
            const text = $(el).text().trim();

            if (!value || seen.has(value)) return;
            seen.add(value);

            const matchCount = text.match(/\((\d+)\)/);
            const name = text.replace(/\(\d+\)/, '').trim();

            const obj = {} as ISetOfGenres;
            obj['parameter'] = value;
            obj['name'] = name || value;
            obj['numberOfContents'] = matchCount ? Number(matchCount[1]) : 0;
            obj['url'] = `${protocol}://${host}/genres/${value}`;

            payload.push(obj);
        });

    return payload;
};
