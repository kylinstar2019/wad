(function () {
  'use strict';

  var currentLang = localStorage.getItem('preview_lang') || 'zh';
  var texts = window.__TEXTS__ || {};

  // lang → html lang / dir 映射
  var langMap = {
    zh: 'zh-CN', ja: 'ja', en: 'en', ar: 'ar'
  };

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('preview_lang', lang);
    document.documentElement.lang = langMap[lang] || lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.dataset.i18n;
      if (texts[lang] && texts[lang][key]) {
        el.textContent = texts[lang][key];
      }
    });
  }

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.dataset.lang);
    });
  });

  setLang(currentLang);

  // 简单 Markdown → HTML
  function markdownToHtml(md) {
    if (!md) return '';
    var html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((https?:\/\/[^\)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[(.*?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    var lines = html.split('\n');
    var out = [];
    var listBuf = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { if (listBuf.length) { out.push('<ul>' + listBuf.join('') + '</ul>'); listBuf = []; } continue; }
      if (line.indexOf('<li>') === 0) { listBuf.push(line); continue; }
      if (listBuf.length) { out.push('<ul>' + listBuf.join('') + '</ul>'); listBuf = []; }
      if (line[0] === '<') { out.push(line); }
      else { out.push('<p>' + line + '</p>'); }
    }
    if (listBuf.length) out.push('<ul>' + listBuf.join('') + '</ul>');
    return out.join('\n');
  }

  function t(key) { return (texts[currentLang] && texts[currentLang][key]) || key; }

  // ========== 列表页 ==========
  if (document.getElementById('articleList')) {
    (function () {
      var articles = window.__ARTICLES__ || [];
      var tags = window.__TAGS__ || [];
      var filterBar = document.getElementById('filterBar');
      var listEl = document.getElementById('articleList');
      var loadMoreEl = document.getElementById('loadMore');
      var noMoreEl = document.getElementById('noMore');
      var currentTag = '';
      var pageSize = 12;
      var currentPage = 1;

      tags.forEach(function (tag) {
        var btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        btn.addEventListener('click', function () {
          currentTag = tag; currentPage = 1; updateBtns(); render(true);
        });
        filterBar.appendChild(btn);
      });

      document.querySelector('.filter-btn[data-tag=""]').addEventListener('click', function () {
        currentTag = ''; currentPage = 1; updateBtns(); render(true);
      });

      function updateBtns() {
        document.querySelectorAll('.filter-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.tag === currentTag);
        });
      }

      function getFiltered() {
        if (!currentTag) return articles;
        return articles.filter(function (a) { return a.tag && a.tag.indexOf(currentTag) !== -1; });
      }

      function render(reset) {
        var filtered = getFiltered();
        var total = filtered.length;
        var start = reset ? 0 : listEl.children.length;
        var end = currentPage * pageSize;
        var items = filtered.slice(start, end);
        if (reset) listEl.innerHTML = '';

        items.forEach(function (a) {
          var card = document.createElement('a');
          card.className = 'article-card';
          card.href = 'detail.html?id=' + encodeURIComponent(a._id);

          var tagsHtml = (a.tag || []).map(function (x) {
            return '<span class="card-tag">' + esc(x) + '</span>';
          }).join('');

          card.innerHTML =
            '<div class="card-thumb"><img src="' + esc(a.thumbnail || '') + '" alt="" onerror="this.style.display=\'none\'"></div>' +
            '<div class="card-body">' +
              '<h3 class="card-title">' + esc(a.title || '') + '</h3>' +
              '<p class="card-summary">' + esc((a.summary || '').replace(/!\[.*?\]\(.*?\)/g, '')) + '</p>' +
              '<div class="card-meta">' + tagsHtml + '<span class="card-date">' + esc(a.modifiedDateStr || '') + '</span></div>' +
            '</div>';

          listEl.appendChild(card);
        });

        loadMoreEl.style.display = end >= total ? 'none' : 'block';
        noMoreEl.style.display = (end >= total && total > 0) ? 'block' : 'none';
        if (total === 0) noMoreEl.textContent = t('empty');
      }

      loadMoreEl.querySelector('button').addEventListener('click', function () {
        currentPage += 1; render(false);
      });

      render(true);
    })();
  }

  // ========== 详情页 ==========
  if (document.getElementById('articleDetail')) {
    (function () {
      var params = new URLSearchParams(window.location.search);
      var id = params.get('id');
      var detailEl = document.getElementById('articleDetail');

      document.getElementById('backBtn').addEventListener('click', function () {
        window.location.href = 'index.html';
      });

      if (!id) {
        detailEl.innerHTML = '<div class="detail-error">' + esc(t('missingId')) + '</div>';
        return;
      }

      fetch('../articles/' + encodeURIComponent(id) + '.json')
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (data) {
          var tagsHtml = (data.tag || []).map(function (x) {
            return '<span class="card-tag">' + esc(x) + '</span>';
          }).join('');

          detailEl.innerHTML =
            '<div class="detail-header">' +
              '<h1 class="detail-title">' + esc(data.title || '') + '</h1>' +
              '<div class="detail-meta">' +
                '<span class="detail-meta-item"><span class="detail-meta-label">' + t('author') + ': </span>' + esc(data.author || '') + '</span>' +
                '<span class="detail-meta-item"><span class="detail-meta-label">' + t('date') + ': </span>' + esc(data.modifiedDateStr || '') + '</span>' +
                tagsHtml +
              '</div>' +
            '</div>' +
            (data.thumbnail ? '<img class="detail-cover" src="' + esc(data.thumbnail) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
            '<div class="detail-content">' + markdownToHtml(data.content || '') + '</div>';

          document.title = esc(data.title || '') + ' - Preview';
        })
        .catch(function (err) {
          detailEl.innerHTML = '<div class="detail-error">' + esc(t('loadFail')) + '<br>' + esc(err.message) + '</div>';
        });
    })();
  }

  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
})();
