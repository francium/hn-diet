> Dieting: the practice of consuming content in a regulated and supervised fashion

Inspired by Paul Houle's [Hacker News for Hackers
article](ontology2.com/essays/HackerNewsForHackers/).

Paul mentions the irrelevance of many articles posted to Hacker News. Depending on who
you ask, these articles will vary. This is of course not a complex machine learning
solution to determine the relevance of articles based on your preferences as he describes
in his article. But it will allow you to filter out keywords you are not very keen on --
be it a political figure, a latest trend, or just a company that's getting too
much attention.

This tool makes use of [Hacker News' API](https://github.com/HackerNews/API) to get the
stories. The current implementation, partially due to the API, isn't optimal. For
example, you have to request each story as a separate request. Some optimizations should
reduce this overhead, such as local caching.

The current filter is based on a blacklist of phrases and domains. Each lines (of the
text area on the web page) is used to filter the story titles or domain if prefixed with
'site:'.

Example of a blacklist:

```
site: wired.com
site: cnn.com
Congress
```

This blacklist will filter out any domain that has the string "wired.com" or "cnn.com",
as well as filter out any story title that has "Congress" in it.

Blacklists are stored locally and auto save. The page much be reloaded for the changes to
apply (sorry no fancy stuff, this is all very prototypical right now).

*Note: This is definitely hacked together right now. An
[issue](https://github.com/francium/hn-diet/issues/2) has been created to make the code
less horrible.*
