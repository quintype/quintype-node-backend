# @quintype/backend

This library is used for making API calls to a Quintype API server

### How to use this library

It is highly recommended that you use the object wrappers for each API call. For example, please use

```javascript
Story.getStoryBySlug(client, "slug").then(story => story.domainFunction())
```

rather than

```javascript
// Do not use this
client.getStoryBySlug("slug").then(story => doSomethingWithStoryJson(story))
```

### Return Values

In cases where a 404 is possible (such as getting a story or a collection by slug), the following return types are possible (taking `Story.getStoryBySlug` as an example)

* In case of a success, the promise resolves to an object of the Story class
* In case of a 404, such as a not found slug, the promise resolves to null
* In case of a 5xx or any other status code, the promise is rejected with an exception


### Memoizing Common Data

The config provides a way to memoize commonly used logic. This is stored in memory, and is never purged.

```
config.memoize("key-to-memoize-against", () => complexSyncLogic());
```
