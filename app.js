(function main() {

  const MAX_STORIES = 3;

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

  const stories = {};


  function httpGet(url) {
    return fetch(url)
      .then(response => {
        if (response.ok) return response.json();
        else             throw new Error('Response not ok', response.error);
      });
  }


  function loadEachStory(storyIds) {
    return new Promise((resolve, reject) => {

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
        }
      }

      const TIMEOUT = 1e4;  // 10s
      setTimeout(() => reject('Timeout while waiting for stories to load'), TIMEOUT);

      storyIds.forEach((storyId, rank) => {
        httpGet(hn_api.story(storyId))
          .then(data => {
            stories[rank] = data;
            updateStoriesLeft(data.id);
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


  loadTopStories()
    .then(() => {
      console.log('loaded all stories');
      for (let i=0; i<MAX_STORIES; i++) {
        const story = stories[i];
        console.log(story);
      }
    }).catch(error => {
      console.error(error);
    });

})();
