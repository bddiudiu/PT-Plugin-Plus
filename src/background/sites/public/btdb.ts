import { searchFilter, SiteMetadata } from '@/shared/interfaces/sites'
import BittorrentSite from '@/background/sites/schema/AbstractBittorrentSite'
import { AxiosRequestConfig } from 'axios'

// FIXME Cloudflare DDoS Protect
export const siteMetadata: SiteMetadata = {
  name: 'BTDB',
  description: 'BTDB is a Public BitTorrent DHT search engine.',
  url: 'https://btdb.eu/',
  legacyUrl: [
    'https://btdb.to/'
  ],
  selector: {
    search: {
      rows: { selector: 'div.media' },
      id: { selector: 'h2.item-title a', attr: 'href', filters: [(q:string) => q.match(/([^/]+)$/)![1]] },
      title: { selector: 'h2.item-title a', attr: 'title' },
      url: { selector: 'h2.item-title a', attr: 'href' },
      link: { selector: 'a[onclick*="magnet:?xt="]', attr: 'onclick', filters: [(q:string) => q.match(/'(magnet:\?xt=.+?)'/)![1]] },
      // TODO time ago
      size: { selector: 'small:nth-of-type(1) strong' },
      seeders: { selector: 'small:nth-of-type(3) strong', filters: [(q: string) => q.replace(/,/ig, '')] },
      leechers: { selector: 'small:nth-of-type(4) strong', filters: [(q: string) => q.replace(/,/ig, '')] },
      category: { text: 'Other' }
    }
  }
}

// noinspection JSUnusedGlobalSymbols
export default class BtDB extends BittorrentSite {
  protected transformSearchFilter (filter: searchFilter): AxiosRequestConfig {
    const config = super.transformSearchFilter(filter)
    if (filter.keywords) {
      config.url = filter.keywords ? `/search/${filter.keywords}/` : '/recent'
    }

    return config
  }
}