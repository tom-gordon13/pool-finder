
import * as cheerio from 'cheerio';
import { TimeSlot } from '../../types/pool';

export interface ScraperStrategy {
    canParse($: cheerio.Root, url: string): boolean;
    parse($: cheerio.Root, url: string): TimeSlot[];
}
