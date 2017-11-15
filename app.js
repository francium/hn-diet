function main() {

  /* Explicit global imports (a poor man's imports) */
  const HTML = window.HTML;  // html.js
  const debounce = window.debounce;  // debounce.js

  const MAX_STORIES = 30;
  const DEBOUNCE_TIME = 1000;

  const HACKER_NEWS_URL_BASE = 'https://news.ycombinator.com';
  const HACKER_NEWS_URL_USER = HACKER_NEWS_URL_BASE + '/user?id={{ id }}';
  const HACKER_NEWS_URL_STORY = HACKER_NEWS_URL_BASE + '/item?id={{ id }}';

  const hn_api = {
    stories: {
      top: 'https://hacker-news.firebaseio.com/v0/topstories.json',
      newest: 'https://hacker-news.firebaseio.com/v0/newstories.json',
      best: 'https://hacker-news.firebaseio.com/v0/beststories.json'
    },
    story: storyId => {
      return `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`;
    }
  };

  const splashEl = HTML.body.query('#splash');
  const storiesEl = HTML.body.query('#stories');
  const blacklistEl = HTML.body.query('#blacklist > textarea');

  blacklistEl.value = loadBlacklist();
  const blacklist = parseBlacklist(blacklistEl.value);

  const stories = {
    length: 0
  };


  function httpGet(url) {
    return fetch(url)
      .then(response => {
        if (response.ok) return response.json();
        else             throw new Error('Response not ok', response.error);
      });
  }


  /**
   * Credits: stackoverflow/sky-sanders
   */
  function timeSince(unixtime) {
    const date = new Date(unixtime);
    const seconds = Math.round((new Date() - date) / 999);

    let interval = Math.round(seconds / 31535999);

    if (interval > 1) {
      return interval + " years ago";
    }
    interval = Math.round(seconds / 2592000);
    if (interval > 1) {
      return interval + " months ago";
    }
    interval = Math.round(seconds / 86400);
    if (interval > 1) {
      return interval + " days ago";
    }
    interval = Math.round(seconds / 3600);
    if (interval > 1) {
      return interval + " hours ago";
    }
    interval = Math.round(seconds / 60);
    return interval + " minutes ago";
  }


  function processStoryData(storyData) {
    storyData.time *= 1000;
    if (!storyData.url) {
      storyData.url = HACKER_NEWS_URL_STORY.replace('{{ id }}', storyData.id);
    }

    return storyData;
  }


  function loadEachStory(storyIds) {
    return new Promise((resolve, reject) => {

      const TIMEOUT = 1e4;  // 10s

      const rejectionTimeout = setTimeout(() => {
        reject('Timeout while waiting for stories to load');
      }, TIMEOUT);

      const storiesLeft = storyIds.reduce((hmap, id) => {
        hmap[id] = id;
        return hmap;
      }, {});
      storiesLeft.length = storyIds.length;
      function updateStoriesLeft(id) {
        if (storiesLeft[id]) {
          delete storiesLeft[id];
          storiesLeft.length--;
        }

        if (!storiesLeft.length) {
          resolve();
          clearTimeout(rejectionTimeout);
        }
      }

      storyIds.forEach((storyId, rank) => {
        httpGet(hn_api.story(storyId))
          .then(data => {
            stories[rank] = processStoryData(data);
            stories.length++;
            updateStoriesLeft(data.id);
          }).catch(error => {
            console.error(error);
          });
      });

    });
  }


  function loadTopStories() {
    return httpGet(hn_api.stories.top)
      .then(data => {
        return loadEachStory(data.slice(0, MAX_STORIES));
      }).catch(error => {
        console.error(error);
      });
  }


  function viewLoadingSplash(display) {
    if (splashEl) {
      if (display) {
        splashEl.style.display = '';
      } else {
        splashEl.style.display = 'none';
      }
    }
  }


  function viewStories(stories) {
    for (let i=0; i<stories.length; i++) {
      const story = stories[i];
      const storyUserUrl = HACKER_NEWS_URL_USER.replace('{{ id }}', story.by);
      const storyDiscussionUrl = HACKER_NEWS_URL_STORY.replace('{{ id }}', story.id);

      const storyEl = storiesEl.add(`div[class="story"]`);

      const storyTitleLineEl = storyEl.add(`div[class="storyTitleLine"]`);

      const titleEmmet = 'a[href="_url_" class="storyTitle"]'
          .replace('_url_', story.url);
      const titleEl = storyTitleLineEl.add(titleEmmet);
      titleEl.innerText = story.title;  // issue#1

      const urlEmmet = 'a[href="_url_" class="storyUrl"]'
          .replace('_url_', story.url);
      const urlEl = storyTitleLineEl.add(urlEmmet);
      urlEl.innerText = '(' + extractDomainName(story.url) + ')';  // issue#1

      const detailsEl = storyEl.add(`div[class="storyDetails"]`);
      const pointsEl = detailsEl.add(`span{${story.score} points}`);
      const byEl = detailsEl.add(`span{by }+a{${story.by}}`);
      const timeEl = detailsEl.add(`a{${timeSince(story.time)}}`);
      const commentsEl = detailsEl.add(`span{ | }+a{${story.descendants} comments}`);

      // issue#1
      titleEl.href = story.url;
      urlEl.href = story.url;
      byEl.href = storyUserUrl;
      timeEl.href = storyDiscussionUrl;
      commentsEl.href = storyDiscussionUrl;
    }
  }


  function extractDomainName(url) {
    const a = document.createElement('a');
    a.setAttribute('href', url);
    return a.hostname;
  }


  function clearViewStories() {
    while (storiesEl.childNodes.length) {
      storiesEl.removeChild(storiesEl.firstChild);
    }
  }


  function filterStoriesByTitle(stories, filterTitle, filterUrl) {
    let filtered = {
      length: 0
    };

    for (let i=0; i<stories.length; i++) {
      const story = stories[i];

      let clean = filterTitle(story.title);
      if (filterUrl) clean = clean && filterUrl(story.url);

      if (clean) {
        filtered[filtered.length++] = story;
      }
    }

    return filtered;
  }


  function blacklistFilter(phrases) {
    return function(title) {
      return phrases
        .map(phrase => {
          return !!new RegExp(phrase, 'i').exec(title);
        }).every(match => !match);
    };
  }


  function parseBlacklist(value) {
    const domains = [];
    const titles = [];

    const valueTrimmed = value.trim();

    if (valueTrimmed.length) {
      const lines = valueTrimmed
        .trim()
        .split('\n')
        .map(phrase => phrase.trim());

      lines.forEach(line => {
        if (line.slice(0, 5) === 'site:') {
          domains.push(line.slice(5, line.length).trim());
        } else {
          titles.push(line);
        }
      });
    }

    return {domains, titles};
  }


  function loadBlacklist(el) {
    const store = window.localStorage;
    return store.getItem('blacklist') || '';
  }


  function handleStoryLoad() {
      viewLoadingSplash(false);
      const filteredStories = filterStoriesByTitle(stories, blacklistFilter(blacklist.titles), blacklistFilter(blacklist.domains));
      viewStories(filteredStories);
  }


  const handleBlackList = debounce((event) => {
    const store = window.localStorage;
    store.setItem('blacklist', blacklistEl.value.trim());
  }, DEBOUNCE_TIME);
  blacklistEl.addEventListener('input', handleBlackList);

  viewLoadingSplash(true);
  clearViewStories();
  loadTopStories()
    .then(handleStoryLoad)
    .catch(error => {
      console.error(error);
    });

}

if (document.readState === 'complete') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
