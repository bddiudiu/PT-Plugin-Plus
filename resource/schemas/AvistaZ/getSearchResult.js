(function (options) {
  class Parser {
    constructor() {
      this.haveData = false;
      if (/\/auth\/login/.test(options.responseText)) {
        options.errorMsg = `[${options.site.name}]需要登录后再搜索`;
        return;
      }

      this.haveData = true;
    }

    /**
     * 获取搜索结果
     */
    getResult() {
      if (!this.haveData) {
        return [];
      }
      let site = options.site;
      let selector = options.resultSelector || "div.table-responsive > table:first";
      let table = options.page.find(selector);
      // 获取种子列表行
      let rows = table.find("> tbody > tr");
      if (rows.length == 0) {
        options.errorMsg = `[${options.site.name}]没有定位到种子列表，或没有相关的种子`;
        return [];
      }
      let results = [];
      // 获取表头
      let header = table.find("> thead > tr > th");
      if (header.length == 0) {
        header = rows.eq(0).find("th,td");
      }

      // 用于定位每个字段所列的位置
      let fieldIndex = {
        // 发布时间
        time: -1,
        // 大小
        size: -1,
        // 上传数量
        seeders: -1,
        // 下载数量
        leechers: -1,
        // 完成数量
        completed: -1,
        // 评论数量
        comments: -1,
        // 发布人
        author: header.length - 1,
        // 分类
        category: 0
      };

      if (site.url.lastIndexOf("/") != site.url.length - 1) {
        site.url += "/";
      }

      // 获取字段所在的列
      for (let index = 0; index < header.length; index++) {
        let cell = header.eq(index);
        let text = cell.text();

        // 评论数
        if (cell.find("a[href*='comments']").length) {
          fieldIndex.comments = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 发布时间
        if (cell.find("a[href*='age']").length) {
          fieldIndex.time = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 大小
        if (cell.find("a[href*='size']").length) {
          fieldIndex.size = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 种子数
        if (cell.find("a[href*='seed']").length) {
          fieldIndex.seeders = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 下载数
        if (cell.find("a[href*='leech']").length) {
          fieldIndex.leechers = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 完成数
        if (cell.find("a[href*='complete']").length) {
          fieldIndex.completed = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }

        // 分类
        if (cell.is(".torrents-icon")) {
          fieldIndex.category = index;
          fieldIndex.author = index == fieldIndex.author ? -1 : fieldIndex.author;
          continue;
        }
      }

      try {
        // 遍历数据行
        for (let index = 1; index < rows.length; index++) {
          const row = rows.eq(index);
          let cells = row.find(">td");

          let title = row.find("a.torrent-filename, a.torrent-link");
          let link = title.attr("href");
          if (link.substr(0, 4) !== "http") {
            link = `${site.url}${link}`;
          }

          // 获取下载链接
          let url = row.find("a[href*='/download/torrent/']").attr("href");

          if (url.substr(0, 4) !== "http") {
            url = `${site.url}${url}`;
          }

          let data = {
            title: title.text(),
            subTitle: this.getSubTitle(title, row),
            link,
            url: url,
            size: cells.eq(fieldIndex.size).text().trim() || 0,
            time: fieldIndex.time == -1 ? "" : cells.eq(fieldIndex.time).find("span[title]").attr("title") || cells.eq(fieldIndex.time).text() || "",
            author: fieldIndex.author == -1 ? "" : cells.eq(fieldIndex.author).text() || "",
            seeders: fieldIndex.seeders == -1 ? "" : cells.eq(fieldIndex.seeders).text() || 0,
            leechers: fieldIndex.leechers == -1 ? "" : cells.eq(fieldIndex.leechers).text() || 0,
            completed: fieldIndex.completed == -1 ? "" : cells.eq(fieldIndex.completed).text() || 0,
            comments: fieldIndex.comments == -1 ? "" : cells.eq(fieldIndex.comments).text() || 0,
            site: site,
            tags: this.getTags(row, options.torrentTagSelectors),
            entryName: options.entry.name,
            category: fieldIndex.category == -1 ? null : this.getCategory(cells.eq(fieldIndex.category))
          };
          results.push(data);
        }
      } catch (error) {
        console.log(error);
        options.errorMsg = `[${options.site.name}]获取种子信息出错: ${error.stack}`;
      }

      return results;
    }

    /**
     * 获取标签
     * @param {*} row 
     * @param {*} selectors 
     * @return array
     */
    getTags(row, selectors) {
      let tags = [];
      if (selectors && selectors.length > 0) {
        selectors.forEach(item => {
          if (item.selector) {
            let result = row.find(item.selector)
            if (result.length) {
              tags.push({
                name: item.name,
                color: item.color
              });
            }
          }
        });
      }
      return tags;
    }

    /**
     * 获取副标题
     * @param {*} title 
     * @param {*} row 
     */
    getSubTitle(title, row) {
      return "";
    }

    /**
     * 获取分类
     * @param {*} cell 当前列
     */
    getCategory(cell) {
      let result = {
        name: cell.find("i:first").attr("title"),
        link: ""
      };
      if (result.name) {
        result.name = result.name.replace(" Torrent", "");
      }
      return result;
    }
  }

  let parser = new Parser(options)
  options.results = parser.getResult()
  console.log(options.results);
})(options)