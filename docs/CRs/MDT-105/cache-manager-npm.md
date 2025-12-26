SOURCE: https://www.npmjs.com/package/cache-manager

# **Simple and fast NodeJS caching module.**

A cache module for NodeJS that allows easy wrapping of functions in cache, tiered caches, and a consistent interface.

* Made with Typescript and compatible with [ESModules](https://nodejs.org/docs/latest-v14.x/api/esm.html).  
* Easy way to wrap any function in cache, supports a mechanism to refresh expiring cache keys in background.  
* Tiered caches \-- data gets stored in each cache and fetched from the highest priority cache(s) first.  
* `nonBlocking` option that optimizes how the system handles multiple stores.  
* Use with any [Keyv](https://keyv.org/) compatible storage adapter.  
* 100% test coverage via [vitest](https://github.com/vitest-dev/vitest).

We moved to using [Keyv](https://keyv.org/) which are more actively maintained and have a larger community.

A special thanks to [Tim Phan](https://github.com/timphandev) who took `cache-manager` v5 and ported it to [Keyv](https://keyv.org/) which is the foundation of v6. 🎉 Another special thanks to [Doug Ayers](https://github.com/douglascayers) who wrote `promise-coalesce` which was used in v5 and now embedded in v6.

# **Migration from v6 to v7**

`v7` has only one breaking change which is changing the return type from `null` to `undefined` when there is no data to return. This is to align with the [Keyv](https://keyv.org/) API and to make it more consistent with the rest of the methods. Below is an example of how to migrate from `v6` to `v7`:

```javascript
import { createCache } from 'cache-manager';
const cache = createCache();
const result = await cache.get('key'); // result will be undefined if the key is not found or expired
console.log(result); // undefined
```

# **Migration from v5 to v6**

`v6` is a major update and has breaking changes primarily around the storage adapters. We have moved to using [Keyv](https://keyv.org/) which are more actively maintained and have a larger community. Below are the changes you need to make to migrate from `v5` to `v6`. In `v5` the `memoryStore` was used to create a memory store, in `v6` you can use any storage adapter that Keyv supports. Below is an example of how to migrate from `v5` to `v6`:

```javascript
import { createCache, memoryStore } from 'cache-manager';
const memoryCache = createCache(memoryStore({ max: 100, ttl: 10 * 1000 }));
```

In `v6` you can use any storage adapter that Keyv supports. Below is an example of using the in memory store with `Keyv`:

```javascript
import { createCache } from 'cache-manager';
const cache = createCache();
```

If you would like to do multiple stores you can do the following:

```javascript
import { createCache } from 'cache-manager';
import { createKeyv } from 'cacheable';
import { createKeyv as createKeyvRedis } from '@keyv/redis';
const memoryStore = createKeyv();
const redisStore = createKeyvRedis('redis://user:pass@localhost:6379');
const cache = createCache({ stores: [memoryStore, redisStore] });
```

When doing in memory caching and getting errors on `symbol` or if the object is coming back wrong like on `Uint8Array` you will want to set the `serialization` and `deserialization` options in Keyv to `undefined` as it will try to do json serialization.

```javascript
import { createCache } from "cache-manager";
import { Keyv } from "keyv";
const keyv = new Keyv();
keyv.serialize = undefined;
keyv.deserialize = undefined;
const memoryCache = createCache({ stores: [keyv] });
```

The other option is to set the serialization to something that is not `JSON.stringify`. You can read more about it here: [https://keyv.org/docs/keyv/\#custom-serializers](https://keyv.org/docs/keyv/#custom-serializers)

If you would like a more robust in memory storage adapter you can use `CacheableMemory` from Cacheable. Below is an example of how to migrate from `v5` to `v6` using `CacheableMemory`:

```javascript
import { createCache } from 'cache-manager';
import { createKeyv } from 'cacheable';
const cache = createCache({ stores: [createKeyv({ ttl: 60000, lruSize: 5000 })] });
```

To learn more about `CacheableMemory` please visit: [http://cacheable.org/docs/cacheable/\#cacheablememory---in-memory-cache](http://cacheable.org/docs/cacheable/#cacheablememory---in-memory-cache)

If you are still wanting to use the legacy storage adapters you can use the `KeyvAdapter` to wrap the storage adapter. Below is an example of how to migrate from `v5` to `v6` using `cache-manager-redis-yet` by going to [Using Legacy Storage Adapters](https://www.npmjs.com/package/cache-manager#using-legacy-storage-adapters).

If you are looking for older documentation you can find it here:

* [v5 Documentation](https://github.com/jaredwray/cacheable/blob/main/packages/cache-manager/READMEv5.md)  
* [v4 Documentation](https://github.com/jaredwray/cacheable/blob/main/packages/cache-manager/READMEv4.md)

## **Table of Contents**

* [Installation](https://www.npmjs.com/package/cache-manager#installation)  
* [Quick start](https://www.npmjs.com/package/cache-manager#quick-start)  
* [Using `CacheableMemory` or `lru-cache` as storage adapter](https://www.npmjs.com/package/cache-manager#using-cacheablememory-or-lru-cache-as-storage-adapter)  
* [Options](https://www.npmjs.com/package/cache-manager#options)  
* [Methods](https://www.npmjs.com/package/cache-manager#methods)  
  * [.set](https://www.npmjs.com/package/cache-manager#set)  
  * [.mset](https://www.npmjs.com/package/cache-manager#mset)  
  * [.get](https://www.npmjs.com/package/cache-manager#get)  
  * [.mget](https://www.npmjs.com/package/cache-manager#mget)  
  * [.ttl](https://www.npmjs.com/package/cache-manager#ttl)  
  * [.del](https://www.npmjs.com/package/cache-manager#del)  
  * [.mdel](https://www.npmjs.com/package/cache-manager#mdel)  
  * [.clear](https://www.npmjs.com/package/cache-manager#clear)  
  * [.wrap](https://www.npmjs.com/package/cache-manager#wrap)  
  * [.disconnect](https://www.npmjs.com/package/cache-manager#disconnect)  
* [Events](https://www.npmjs.com/package/cache-manager#events)  
  * [.set](https://www.npmjs.com/package/cache-manager#set)  
  * [.del](https://www.npmjs.com/package/cache-manager#del)  
  * [.clear](https://www.npmjs.com/package/cache-manager#clear)  
  * [.refresh](https://www.npmjs.com/package/cache-manager#refresh)  
* [Properties](https://www.npmjs.com/package/cache-manager#properties)  
  * [.cacheId](https://www.npmjs.com/package/cache-manager#cacheId)  
  * [.stores](https://www.npmjs.com/package/cache-manager#stores)  
* [Doing Iteration on Stores](https://www.npmjs.com/package/cache-manager#doing-iteration-on-stores)  
* [Update on `redis` and `ioredis` Support](https://www.npmjs.com/package/cache-manager#update-on-redis-and-ioredis-support)  
* [Using Legacy Storage Adapters](https://www.npmjs.com/package/cache-manager#using-legacy-storage-adapters)  
* [Contribute](https://www.npmjs.com/package/cache-manager#contribute)  
* [License](https://www.npmjs.com/package/cache-manager#license)

# **Installation**

```bash
npm install cache-manager
```

By default, everything is stored in memory; you can optionally also install a storage adapter; choose one from any of the storage adapters supported by Keyv:

```bash
npm install @keyv/redis
npm install @keyv/memcache
npm install @keyv/mongo
npm install @keyv/sqlite
npm install @keyv/postgres
npm install @keyv/mysql
npm install @keyv/etcd
```

In addition Keyv supports other storage adapters such as `lru-cache` and `CacheableMemory` from Cacheable (more examples below). Please read [Keyv document](https://keyv.org/docs/) for more information.

# **Quick start**

```javascript
import { Keyv } from 'keyv';
import { createCache } from 'cache-manager';
const cache = createCache() // Memory store by default
const cache = createCache({ stores: [new Keyv()] }) // Single store which is in memory
```

Here is an example of doing layer 1 and layer 2 caching with the in-memory being `CacheableMemory` from Cacheable and the second layer being `@keyv/redis`:

```javascript
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import { createCache } from 'cache-manager';
const cache = createCache({
  stores: [
    new Keyv({ store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }) }), // High performance in-memory cache with LRU and TTL
    new Keyv({ store: new KeyvRedis('redis://user:pass@localhost:6379') }), // Redis Store
  ],
})
```

Once it is created, you can use the cache object to set, get, delete, and wrap functions in cache.

```javascript
const cache = createCache({ ttl: 10000, refreshThreshold: 3000 })
await cache.set('foo', 'bar') // => bar
await cache.get('foo') // => bar
await cache.del('foo') // => true
await cache.get('foo') // => null
await cache.wrap('key', () => 'value') // => value
```

# **Using CacheableMemory or lru-cache as storage adapter**

Because we are using [Keyv](https://keyv.org/), you can use any storage adapter that Keyv supports such as `lru-cache` or `CacheableMemory` from Cacheable. Below is an example of using `CacheableMemory`:

In this example we are using `CacheableMemory` from Cacheable which is a fast in-memory cache that supports LRU and and TTL expiration.

```javascript
import { createCache } from 'cache-manager';
import { Keyv } from 'keyv';
import { KeyvCacheableMemory } from 'cacheable';
const store = new KeyvCacheableMemory({ ttl: 60000, lruSize: 5000 });
const keyv = new Keyv({ store });
const cache = createCache({ stores: [keyv] });
```

Here is an example using `lru-cache`:

```javascript
import { createCache } from 'cache-manager';
import { Keyv } from 'keyv';
import { LRU } from 'lru-cache';
const keyv = new Keyv({ store: new LRU({ max: 5000, maxAge: 60000 }) });
const cache = createCache({ stores: [keyv] });
```

## **Options**

* stores?: Keyv\[\]  
  List of Keyv instance. Please refer to the [Keyv document](https://keyv.org/docs/#3.-create-a-new-keyv-instance) for more information.  
* ttl?: number \- Default time to live in milliseconds.  
  The time to live in milliseconds. This is the maximum amount of time that an item can be in the cache before it is removed.  
* refreshThreshold?: number | (value:T) \=\> number \- Default refreshThreshold in milliseconds. You can also provide a function that will return the refreshThreshold based on the value.  
  If the remaining TTL is less than refreshThreshold, the system will update the value asynchronously in background.  
* refreshAllStores?: boolean \- Default false  
  If set to true, the system will update the value of all stores when the refreshThreshold is met. Otherwise, it will only update from the top to the store that triggered the refresh.  
* nonBlocking?: boolean \- Default false  
  If set to true, the system will not block when multiple stores are used. Here is how it affects the type of functions:  
  * `set and mset` \- will not wait for all stores to finish.  
  * `get and mget` \- will return the first (fastest) value found.  
  * `del and mdel` \- will not wait for all stores to finish.  
  * `clear` \- will not wait for all stores to finish.  
  * `wrap` \- will do the same as `get` and `set` (return the first value found and not wait for all stores to finish).  
* cacheId?: string \- Defaults to random string  
  Unique identifier for the cache instance. This is primarily used to not have conflicts when using `wrap` with multiple cache instances.

# **Methods**

## **set**

```typescript
set(key, value, [ttl]): Promise<value>
```

Sets a key value pair. It is possible to define a ttl (in milliseconds). An error will be throw on any failed

```javascript
await cache.set('key-1', 'value 1')
await cache.set('key 2', 'value 2', 5000) // expires after 5 seconds
```

See unit tests in [`test/set.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/set.test.ts) for more information.

## **mset**

```typescript
mset(keys: [ { key, value, ttl } ]): Promise<true>
```

Sets multiple key value pairs. It is possible to define a ttl (in milliseconds). An error will be throw on any failed

```javascript
await cache.mset([
  { key: 'key-1', value: 'value 1' },
  { key: 'key-2', value: 'value 2', ttl: 5000 },
]);
```

## **get**

`get(key): Promise<value>`

Gets a saved value from the cache. Returns a null if not found or expired. If the value was found it returns the value.

```javascript
await cache.set('key', 'value')
await cache.get('key') // => value
await cache.get('foo') // => null
```

See unit tests in [`test/get.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/get.test.ts) for more information.

## **mget**

`mget(keys: [key]): Promise<value[]>`

Gets multiple saved values from the cache. Returns a null if not found or expired. If the value was found it returns the value.

```javascript
await cache.mset([{ key: 'key-1', value: 'value 1' }, { key: 'key-2', value: 'value 2' }]);
await cache.mget(['key-1', 'key-2', 'key-3']) // => ['value 1', 'value 2', null]
```

## **ttl**

`ttl(key): Promise<number | null>`

Gets the expiration time of a key in milliseconds. Returns a null if not found or expired.

```javascript
await cache.set('key', 'value', 1000);
await cache.ttl('key'); // => the expiration time in milliseconds
await cache.get('foo'); // => null
```

See unit tests in [`test/ttl.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/ttl.test.ts) for more information.

## **del**

`del(key): Promise<true>`

Delete a key, an error will be throw on any failed.

```javascript
await cache.set('key', 'value')
await cache.get('key') // => value
await cache.del('key')
await cache.get('key') // => null
```

See unit tests in [`test/del.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/del.test.ts) for more information.

## **mdel**

`mdel(keys: [key]): Promise<true>`

Delete multiple keys, an error will be throw on any failed.

```javascript
await cache.mset([{ key: 'key-1', value: 'value 1' }, { key: 'key-2', value: 'value 2' }]);
await cache.mdel(['key-1', 'key-2'])
```

## **clear**

`clear(): Promise<true>`

Flush all data, an error will be throw on any failed.

```javascript
await cache.set('key-1', 'value 1')
await cache.set('key-2', 'value 2')
await cache.get('key-1') // => value 1
await cache.get('key-2') // => value 2
await cache.clear()
await cache.get('key-1') // => null
await cache.get('key-2') // => null
```

See unit tests in [`test/clear.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/clear.test.ts) for more information.

## **wrap**

`wrap(key, fn: async () => value, [ttl], [refreshThreshold]): Promise<value>`

Alternatively, with optional parameters as options object supporting a `raw` parameter:

`wrap(key, fn: async () => value, { ttl?: number, refreshThreshold?: number, raw?: true }): Promise<value>`

Wraps a function in cache. The first time the function is run, its results are stored in cache so subsequent calls retrieve from cache instead of calling the function.

If `refreshThreshold` is set and the remaining TTL is less than `refreshThreshold`, the system will update the value asynchronously. In the meantime, the system will return the old value until expiration. You can also provide a function that will return the refreshThreshold based on the value `(value:T) => number`.

If the object format for the optional parameters is used, an additional `raw` parameter can be applied, changing the function return type to raw data including expiration timestamp as `{ value: [data], expires: [timestamp] }`.

```javascript
await cache.wrap('key', () => 1, 5000, 3000) // call function then save the result to cache => 1
await cache.wrap('key', () => 2, 5000, 3000) // return data from cache, function will not be called again => 1
await cache.wrap('key', () => 2, { ttl: 5000, refreshThreshold: 3000, raw: true }) // => { value: 1, expires: [timestamp] }

await sleep(3000) // wait 3 seconds

await cache.wrap('key', () => 2, 5000, 3000) // return data from cache, call function in background => 1
await cache.wrap('key', () => 3, 5000, 3000) // return data from cache, function will not be called => 2
await cache.wrap('key', () => 4, 5000, () => 3000) // return data from cache, function will not be called => 4
await cache.wrap('error', () => { throw new Error('failed') }) // => error
```

NOTES:

* The store that will be checked for refresh is the one where the key will be found first (highest priority).  
* If the threshold is low and the worker function is slow, the key may expire and you may encounter a racing condition with updating values.  
* If no `ttl` is set for the key, the refresh mechanism will not be triggered.

See unit tests in [`test/wrap.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/wrap.test.ts) for more information.

## **disconnect**

`disconnect(): Promise<void>`

Will disconnect from the relevant store(s). It is highly recommended to use this when using a [Keyv](https://keyv.org/) storage adapter that requires a disconnect. For each storage adapter, the use case for when to use disconnect is different. An example is that `@keyv/redis` should be used only when you are done with the cache.

`await cache.disconnect();`

See unit tests in [`test/disconnect.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/disconnect.test.ts) for more information.

# **Properties**

## **cacheId**

`cacheId(): string`

Returns cache instance id. This is primarily used to not have conflicts when using `wrap` with multiple cache instances.

## **stores**

`stores(): Keyv[]`

Returns the list of Keyv instances. This can be used to get the list of stores and then use the Keyv API to interact with the store directly.

```javascript
const cache = createCache({ cacheId: 'my-cache-id' });
cache.cacheId(); // => 'my-cache-id'
```

See unit tests in [`test/cache-id.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/cache-id.test.ts) for more information.

# **Events**

## **set**

Fired when a key has been added or changed.

```javascript
cache.on('set', ({ key, value, error }) => { /* ... do something ... */ })
```

## **del**

Fired when a key has been removed manually.

```javascript
cache.on('del', ({ key, error }) => { /* ... do something ... */ })
```

## **clear**

Fired when the cache has been flushed.

```javascript
cache.on('clear', (error) => { if (error) { /* ... do something ... */ } })
```

## **refresh**

Fired when the cache has been refreshed in the background.

```javascript
cache.on('refresh', ({ key, value, error }) => { if (error) { /* ... do something ... */ } })
```

See unit tests in [`test/events.test.ts`](https://github.com/jaredwray/cacheable/blob/HEAD/packages/cache-manager/test/events.test.ts) for more information.

# **Doing Iteration on Stores**

You can use the `stores` method to get the list of stores and then use the Keyv API to interact with the store directly. Below is an example of iterating over all stores and getting all keys:

```javascript
import Keyv from 'keyv';
import { createKeyv } from '@keyv/redis';
import { createCache } from 'cache-manager';

const keyv = new Keyv();
const keyvRedis = createKeyv('redis://user:pass@localhost:6379');
const cache = createCache({ stores: [keyv, keyvRedis] });

await cache.set('key-1', 'value 1');
await cache.set('key-2', 'value 2');

const store = cache.stores[1]; // get the store you want to iterate over. In this example we are using the second store (redis)

if (store?.iterator) {
  for await (const [key, value] of store.iterator({})) {
    console.log(key, value);
  }
}
```

WARNING: Be careful when using `iterator` as it can cause major performance issues with the amount of data being retrieved. Also, Not all storage adapters support `iterator` so you may need to check the documentation for the storage adapter you are using.

# **Update on redis and ioredis Support**

We will not be supporting `cache-manager-ioredis-yet` or `cache-manager-redis-yet` in the future as we have moved to using `Keyv` as the storage adapter `@keyv/redis`.

# **Using Legacy Storage Adapters**

There are many storage adapters built for `cache-manager` and because of that we wanted to provide a way to use them with `KeyvAdapter`. Below is an example of using `cache-manager-redis-yet`:

```javascript
import { createCache, KeyvAdapter } from 'cache-manager';
import { Keyv } from 'keyv';
import { redisStore } from 'cache-manager-redis-yet';

const adapter = new KeyvAdapter(await redisStore());
const keyv = new Keyv({ store: adapter });
const cache = createCache({ stores: [keyv] });
```

This adapter will allow you to add in any storage adapter. If there are issues it needs to follow `CacheManagerStore` interface.
