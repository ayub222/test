import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISetOfCountries } from '../types';
import countries from '../json/countries.json';

/**
 * Scrape a set of countries asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISetOfCountries[]>} a set of countries
 */
export const scrapeSetOfCountries = async (
    req: Request,
    res: AxiosResponse
) => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISetOfCountries[] = [];
    const {
        protocol,
        headers: { host },
    } = req;

    const seen = new Set<string>();

    $('select[name="country"], select#country')
        .first()
        .find('option')
        .each((i, el) => {
            const value = ($(el).attr('value') || '').trim().toLowerCase();
            const text = $(el).text().trim();

            if (!value || seen.has(value)) return;
            seen.add(value);

            const matchCount = text.match(/\((\d+)\)/);
            const name = text.replace(/\(\d+\)/, '').trim();

            const obj = {} as ISetOfCountries;
            obj['parameter'] = value;
            obj['name'] = name || value;
            obj['numberOfContents'] = matchCount ? Number(matchCount[1]) : 0;
            obj['url'] = `${protocol}://${host}/countries/${value}`;

            payload.push(obj);
        });

    return payload;
};
