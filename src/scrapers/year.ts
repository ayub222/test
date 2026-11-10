import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISetOfYears } from '../types';

/**
 * Scrape a set of release years asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISetOfYears[]>} a set of release years
 */
export const scrapeSetOfYears = async (
    req: Request,
    res: AxiosResponse
): Promise<ISetOfYears[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISetOfYears[] = [];
    const {
        protocol,
        headers: { host },
    } = req;

    const seen = new Set<string>();

    $('select[name="tahun"], select#year')
        .first()
        .find('option')
        .each((i, el) => {
            const value = ($(el).attr('value') || '').trim();
            const text = $(el).text().trim();

            if (!value || value === '0' || seen.has(value)) return;
            seen.add(value);

            const matchCount = text.match(/\((\d+)\)/);

            const obj = {} as ISetOfYears;
            obj['parameter'] = value;
            obj['numberOfContents'] = matchCount ? Number(matchCount[1]) : 0;
            obj['url'] = `${protocol}://${host}/years/${value}`;

            payload.push(obj);
        });

    return payload;
};
