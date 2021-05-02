import { ETorrentBaseTagColor, ETorrentStatus } from '@/shared/interfaces/enum'
import { AxiosRequestConfig, ResponseType } from 'axios'
import { transPostDataTo, fullUrl, timezoneOffset, fullUrlProtect } from './types'

export interface SearchResultItemTag {
  color?: string;
  name?: string;
}

export interface ElementQuery {
  // selector或 text 一定要有一个

  /**
   * 当text输入时，text会作为默认值
   * 特殊值：
   * - N/A 表示源站并没有提供该信息
   */
  text?: string | number | 'N/A',

  /**
   * 如果selector为 string[]， 则会依次尝试并找到第一个成功获取到有效信息的
   * 此外，此处约定了一些特殊的选择器
   *  - :self  该元素自身，对于html文档，一般用于tr自身属性，对于json文档，一般指root顶层
   */
  selector?: string | ':self' | string[] | null,

  /**
   * 对 Element 进行处理
   * 注意， elementProcess 不参与 mergeWith
   * - elementProcess：对 selector 出来的 Element 进行处理，此时不建议再定义 filters 或 switchFilters 以免出错
   */
  elementProcess?: (Function | string)[], // 自定义对于Element的处理方法，此时 attr 以及 data 选项均不生效，但 filters 和 switchFilters 仍生效
  attr?: string | null, // 使用 HTMLElement.getAttribute('') 进行取值，取不到值则置 ''
  data?: string | null, // 使用 HTMLElement.dataset[''] 进行取值，取不到值则置 ''
  case?: { [selector: string]: any }

  /**
   * 对获取结果进行处理，处理结果将作为最终的值输出
   * 注意： filters 和 switchFilters 不参与 mergeWith
   *  - filters： 对 选出来的 string 进行处理
   *  - switchFilters: 根据 最终使用的 selector Id 确定使用的filters，优先级更高
   */
  filters?: (Function | string)[],
  switchFilters?: (Function | string)[], // 会根据selector的位置来使用对应的filter
}

// 作为一个种子最基本应该有的属性
export interface Torrent {
  id: number | string;
  title: string; // 主标题
  subTitle?: string; // 次标题

  /**
   * 特别注意： link和url 两个的含义在旧版和目前版本中是完全相反的
   */
  url: string; // detail 页面
  link: string; // 种子链接

  time?: number; // 发布时间戳（毫秒级）
  size?: number; // 大小
  author?: number | string; // 发布人
  category?: string | number;

  seeders?: number; // 上传数量
  leechers?: number; // 下载数量
  completed?: number; // 完成数量
  comments?: number; // 评论数量

  tags?: SearchResultItemTag[];

  // 对于PT种子才 获取以下部分
  progress?: number | null; // 进度（100表示完成）
  status?: ETorrentStatus; // 状态
}

export interface searchCategoryOptions {
  name: string,
  value: string | number
}

export interface searchCategories {
  name: string | 'Category' | '类别', // 搜索大类名称
  key: string | '#changeDomain' | '#changePath', // 搜索大类
  notes?: string, // 分类说明
  options: searchCategoryOptions[],
  // 该搜索大类是否允许内部交叉 （ 不声明，则默认不允许（False） ）
  cross?: {
    /**
     * 当允许搜索类别内部交叉时，该搜索类别在请求时字段如何处理，如果是：
     *  - 'raw': 由 axios 自动转化为 &{key}[]={xxx} 的形式 （默认）
     *  - 'append': 转化为 &{key}{xxx}=1 的形式交给 axios 来请求，此时可以通过定义 key 来改写 key
     *  - 'appendQuote': 类同 'append'，只不过转成了 &{key}[{xxx}]=1
     */
    mode?: 'raw' | 'append' | 'appendQuote'
    key?: string // 当内部交叉时，params与已定义的 key 不一致时使用
  }
}

export interface searchParams {
  /**
   * 约定的特殊key （都以 # 开头）：
   *   - #changeDomain   更换请求的 baseUrl 为 value 值
   */
  key: string,
  value: string | number | string[] | number[]
}

export interface searchFilter {
  keywords?: string,
  extraParams?: searchParams[], // 其他请求参数信息
}

export interface SearchRequestConfig {
  filter: searchFilter,
  axiosConfig: AxiosRequestConfig
}

export interface UserInfo {
  id: number | string; // 用户ID
  name: string; // 用户名
  levelName?: string; // 等级名称

  uploaded: number; // 上传量
  downloaded: number; // 下载量
  ratio?: number; // 分享率，Ratio并不是必须获得的，如果站点未提供，助手会使用 uploaded/downloaded 自动计算

  seeding?: number; // 当前做种数量
  seedingSize?: number; // 做种体积
  leeching?: number; // 当前下载数量

  bonus?: number; // 魔力值/积分
  messageCount?: number; // 消息数量
  invites?: number; // 邀请数量

  joinTime?: number; // 入站时间
  avatar?: string; // 头像

  updateAt: number; // 更新时间

  [key: string]: any; // 其他信息
}

export type SiteSchema = 'AbstractBittorrentSite' | 'AbstractPrivateSite' |
  'NexusPHP' | 'Unit3D' |
  'Gazelle' | 'GazelleJSONAPI' |
  'AvistaZ'

export type SiteFeature = 'queryUserInfo'

/**
 * 站点配置，这部分配置由系统提供，并随着每次更新而更新，不受用户配置的任何影响
 * 当且仅当 基于模板构建时，该部分配置可以由用户修改
 */
export interface SiteMetadata {
  name: string; // 站点名
  aka?: string | string[]; // 站点别名
  description?: string; // 站点说明
  tags?: string[]; // 站点标签

  /**
   * 指定继承模板类型，如果未填写的话，但文件抛出了 default class 的话，会忽略掉此处的参数
   * 否则会根据其所在的目录进行自动更正为缺省值：
   *  - public 目录下， schema 的缺省值为 AbstractBittorrentSite
   *  - private 目录下， schema 的缺省值为 AbstractPrivateSite
   *
   */
  schema?: SiteSchema;

  /**
   * 完整的网站地址，如果网站支持 `https` ，请优先考虑填写 `https` 的地址
   * 部分站点可能对于站点链接存在更为隐秘的要求，则请对链接进行 btoa ，以防止在配置时泄露
   * （但这并不能阻止用户通过插件的网络请求等其他途径知道对应网址
   */
  url: fullUrl | fullUrlProtect; // 完整的网站地址，如果网站支持 `https` ，请优先考虑填写 `https` 的地址
  favicon?: string; // 站点 favicon.ico 的url，例如 https://ourbits.club/favicon.ico

  /**
   * 和url相同作用和写法，唯一不同是将会覆写url的行为（因为url不允许用户编辑）
   * 即，当 legacyUrl 存在时：
   *  - 在搜索中，如果用户设置时未传入 activateUrl ，则使用 legacyUrl[0]
   *  - 在页面中， [url, ...legacyUrl] 效果相同
   */
  legacyUrl?: (fullUrl | fullUrlProtect)[];

  collaborator?: string | string[]; // 协作者，建议使用 string[] 进行定义
  timezoneOffset?: timezoneOffset;

  host?: string; // 站点域名，如果不存在，则从url中获取
  formerHosts?: string[]; // 站点过去曾经使用过的域名（现在已不再使用）

  search?: {
    /**
     * 搜索时进行请求，为了避免过于麻烦的配置项
     * 设置了默认的 AxiosRequestConfig 为 { responseType: 'document', url: '/' }
     * 则意味则如果是 json 返回，应该自己覆写 responseType
     */
    requestConfig?: AxiosRequestConfig & { transferPostData?: transPostDataTo },

    keywordsParam?: string, // 当不指定且未改写时，会导致keyword未被搜索使用
    categories?: searchCategories[] // 站点对应搜索入口的种子分类信息
  } // 站点搜索方法如何配置

  detail?: {
    type?: ResponseType, // 当不指定时，默认为 document
  }

  /**
   * 该配置项仅对 基于 PrivateSite 模板，且未改写 flushUserInfo 的站点生效
   */
  userInfo?: {
    /**
     * 如果可以，则从插件历史缓存的数据中获取那些数据（一般是比较恒定的数据，如 id, name, joinTime ）
     * 并可以帮助我们减少网络请求的字段
     */
    pickLast?: (keyof UserInfo)[],

    /**
     * 有执行顺序，从上到下依次执行，第一个不应该有断言 assertion，后续配置项可以有断言
     */
    process: {
      requestConfig: AxiosRequestConfig & { transferPostData?: transPostDataTo }, // { url: '/', params: {}, responseType: 'document' } 会作为基件
      /**
       * 请求参数替换断言
       * key为之前步骤获取到的用户信息字典，value为需要替换的键值，如果：
       *  requestConfig.url 中有类似 `$value$` 的字段，则替换 url
       *  不然会生成 params: {value: key}
       */
      assertion?: {
        [key in keyof UserInfo]?: string
      },
      fields: (keyof UserInfo)[]
    }[]
  }

  selector?: {
    search?: {
      /**
       * 种子列表定位。
       * filter 配置项用于对 selector 获取到的rows进行处理，
       * 如果filter不存在，则其他部分选项起作用：
       *  - merge  用于合并部分使用多行表示一个种子的情况，仅在返回为 Document 时生效
       */
      rows?: {
        selector: string | ':self',
        filter?: <T>(rows: T) => T
        merge?: number,
      }
    } & { [torrentKey in keyof Torrent]?: ElementQuery } // 种子相关选择器
      & { tags?: { selector: string, name: (keyof typeof ETorrentBaseTagColor) | string, color?: string }[] } // Tags相关选择器

    detail?: {
      link?: ElementQuery // 用于获取下载链接不在搜索页，而在详情页的情况
      [key: string]: ElementQuery | undefined // FIXME
    } & { [torrentKey in keyof Torrent]?: ElementQuery } // 种子相关选择器

    userInfo?: { [userinfoKey in keyof UserInfo]?: ElementQuery } // 用户信息相关选择器
  }

  feature?: { // 站点支持方法
    [key in SiteFeature]: boolean
  }
}

export interface SiteConfig extends SiteMetadata {
  activateUrl?: string; // 用户在搜索时使用的地址
  entryPoint?: string; // 用户在options首页点击时，打开的站点地址
}
