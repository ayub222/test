import axios from 'axios';
import cheerio from 'cheerio';
import { Request } from 'express';
import { IDownloads } from '../types';
import { AxiosResponse } from 'axios';

/**
 * Scrape downloads asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IDownloads[]>} array of Downloads objects
 */
export const scrapeDownloads = async (
    req: Request,
    res: AxiosResponse
): Promise<IDownloads[]> => {
    const $: cheerio.Root = cheerio.load(res.data);

    let downloads: IDownloads[] = [];

    $('tbody > tr').each(function (i, el) {
        let server = $(el).find('strong').text()!;
        let link = $(el).find('a').attr('href')!;
        //@ts-ignore
        let quality = $(el).find('a').attr('class')?.substring(9, 13) || '';
        if (link) {
            downloads.push({
                server,
                link,
                quality,
            });
        }
    });

    if (downloads.length === 0) {
        const qualities: string[] = [];
        $('div.movie-info div.info-tag > span').each((i, el) => {
            const text = $(el).text().trim();
            if (
                text &&
                !/\d+\s*(h|m|min|jam|menit)/i.test(text) &&
                !/^\d+\+$|^SU$|^R$|^PG/i.test(text)
            ) {
                qualities.push(text);
            }
        });
        const quality = qualities.join(' ') || 'HD';

        let dlLink = '';
        $('div.movie-action a, nav.mobile-bottom-bar a').each((i, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim().toLowerCase();
            if (
                !dlLink &&
                href.startsWith('http') &&
                (text.includes('download') ||
                    $(el).find('i.fa-download').length > 0)
            ) {
                dlLink = href;
            }
        });

        if (dlLink) {
            downloads.push({
                server: 'LK21 Download Portal',
                link: dlLink,
                quality,
            });
        }
    }

    return downloads;
};

/**
 * Scrape getCookie asynchronously
 * @param {id} string
 */
export const getCookie = async (id: string) => {
    try {
        const headers = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept-Encoding': 'application/json',
        };
        const response = await axios.get(`${process.env.DL_URL}/get/${id}`, {
            headers: headers,
        });
        const data = response.data;
        const search = "setCookie('validate'";
        const idx = data.indexOf(search);
        const hasil = data.substring(idx + 23, idx + 63);
        const result = 'validate=' + hasil;
        return result;
    } catch (error) {
        throw new Error('failed get cookie');
    }
};
