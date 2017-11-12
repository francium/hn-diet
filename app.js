function main() {

  /* Explicit global variables */
  const HTML = window.HTML;  // html.js
  const debounce = window.debounce;  // debounce.js

  const MAX_STORIES = 30;
  const DEBOUNCE_TIME = 1000;

  const splashEl = HTML.body.query('#splash');
  const storiesEl = HTML.body.query('#stories');
  const blacklistEl = HTML.body.query('#blacklist');

  blacklistEl.value = loadBlacklist();
  const blacklist = parseBlacklist(blacklistEl.value);

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
            stories[rank] = data;
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
        splashEl.style.zIndex = 9999;
        splashEl.style.opacity = 1;
      } else {
        splashEl.style.zIndex = -9999;
        splashEl.style.opacity = 0;
      }
    }
  }


  function viewStories(stories) {
    for (let i=0; i<stories.length; i++) {
      const story = stories[i];
      storiesEl.add(`div>p>a[href="${story.url}"]{${story.title}}`);
    }
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
    const valueTrimmed = value.trim();

    if (!valueTrimmed.length) {
      return [];
    }

    return valueTrimmed
      .trim()
      .split('\n')
      .map(phrase => phrase.trim());
  }


  function loadBlacklist(el) {
    const store = window.localStorage;
    return store.getItem('blacklist') || '';
  }


  function handleStoryLoad() {
      viewLoadingSplash(false);
      const filteredStories = filterStoriesByTitle(stories, blacklistFilter(blacklist));
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
