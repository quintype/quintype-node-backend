This library is used for making API calls to a Quintype backend for a [malibu](https://github.com/quintype/malibu) based app. It is usually not required to add this directly to your application, instead the classes here are re exported by `@quintype/framework`.

## How to use this library

This library provides types and functions for fetching data. These functions are meant to be called from the node server, typically from the `loadData` function of the malibu application. This is not suitable from use from the browser. All classes defined here are re exported by `@quintype/framework`, so this documentation will import from `@quintype/framework/server/api-client` in many examples.

Most types expose static functions for fetching data, which return a promise of data. The returned value has all fields that is returned by the API, as well as functions to help you load more data. Finally, objects expose an `asJson()` to be called when the object is to be serialized. A sample workflow follows:

```javascript
import { Story } from "@quintype/framework/server/api-client";

async function loadStoryPageData(client, slug) {
  const story = await Story.getStoryBySlug(client, slug);
  if(!story) {
    return404();
  }
  const relatedStories = story.getRelatedStories(client);
  return {
    story: story.asJson(),
    relatedStories: relatedStories.map(story => story.asJson())
  }
}
```

## Return Values

In cases where a 404 is possible (such as getting a story or a collection by slug), the following return types are possible (taking `Story.getStoryBySlug` as an example)

* In case of a success, the promise resolves to an object of the Story class
* In case of a 404, such as a not found slug, the promise resolves to null
* In case of a 5xx or any other status code, the promise is rejected with an exception

## Performance

Do note that the config object can be used as a Key Value store that can memoize synchronous functions for 2 minutes. See {@link Config#memoize}
