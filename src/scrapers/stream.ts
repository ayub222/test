import { Request } from 'express';
import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { IStreamSources } from '../types';

/**
 * Scrape stream sources asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IStreamSources[]>} array of stream sources objects
 */
export const scrapeStreamSources = async (
    req: Request,
    res: AxiosResponse
): Promise<IStreamSources[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: IStreamSources[] = [];

    $('ul#player-list > li').each((i, el) => {
        const a = $(el).find('a');
        const obj = {} as IStreamSources;

        const resolutions: string[] = [];

        $(el)
            .find('div > span')
            .each((i, el2) => {
                resolutions.push($(el2).text());
            });

        obj['provider'] = a.text().trim() || a.attr('data-server') || '';
        obj['url'] = a.attr('data-url') || a.attr('href') || '';
        obj['resolutions'] = resolutions;

        if (obj['url']) {
            payload.push(obj);
        }
    });

    return payload;
};
