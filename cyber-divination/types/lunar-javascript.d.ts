declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
  }

  export class Lunar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Lunar;
    /** 由公历 Date 直接构造（梅花易数取农历年月日用） */
    static fromDate(date: Date): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    /** 立春定年的年干支（命理年，与八字年柱一致） */
    getYearInGanZhiByLiChun(): string;
    /** 当前时辰地支（子/丑/…/亥） */
    getTimeZhi(): string;
    getSolar(): Solar;
    getEightChar(): EightChar;
  }

  export class EightChar {
    setSect(sect: number): void;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getDayXunKong(): string;
    getTimeXunKong(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getTaiYuan(): string;
    getMingGong(): string;
    getShenGong(): string;
    getYun(gender: number, sect: number): Yun;
  }

  export class Yun {
    setSect(sect: number): void;
    getStartYear(): number;
    getStartAge(): number;
    isForward(): boolean;
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
  }
}