const { Config } = require('./index');

describe("Config", function() {
  describe("Returns Home Collection Slug Given a Domain" , function() {
    it("Returns home-collection id provided a hostname", function(){
      const config = Config.build({
        domains: [{slug: "mydomain", name: "mydomain", "home-collection-id": 1234}]
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe(1234);
    });

    it("returns home-collection as home if the domain is not found", function() {
      const config = Config.build({
        domains: []
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe("home");
      expect(config.getHomeCollectionSlug(null)).toBe("home");
      expect(config.getHomeCollectionSlug(undefined)).toBe("home");
    });

    it("still works if domain is missing", function() {
      const config = Config.build({
        domains: undefined
      });
      expect(config.getHomeCollectionSlug("mydomain")).toBe("home");
      expect(config.getHomeCollectionSlug(null)).toBe("home");
      expect(config.getHomeCollectionSlug(undefined)).toBe("home");
    });
  });

  describe("Returns Sections Given a Domain",  function() {
    let config= Config.build({
      sections:[
        {
          'domain-slug': 'cinema',
          name: 'Hollywood',
          id: 2,
        },
        {
          'domain-slug': null,
          name:'News',
          id:3
        },
        {
          'domain-slug': 'cinema',
          name: 'Bollywood',
          id: 10,
        },
      ]
    });

    it("gets all sections for a given domain", function() {
      expect(config.getDomainSections('cinema').map(s=> s.id)).toEqual([2, 10]);
    });

    it("returns empty array if no matching sections are found", function() {
      expect(config.getDomainSections('business').map(s=> s.id)).toEqual([]);
    });

    it("return all sections if domain slug is undefined", function() {
      expect(config.getDomainSections(undefined).map(s=> s.id)).toEqual([2, 3, 10]);
    });

    it("return empty list if domain slug is null", function() {
      expect(config.getDomainSections(null).map(s=> s.id)).toEqual([3]);
    });
  });

  it("returns domains to the default domain if domain slug is missing", function (){
    const config = Config.build({sections: [{id: 2, name: 'hollywood'}]});
    expect(config.getDomainSections(null).map(s => s.id)).toEqual([2]);
    expect(config.getDomainSections('cinema').map(s => s.id)).toEqual([2]);
    expect(config.getDomainSections(undefined).map(s => s.id)).toEqual([2]);
  })

  describe("memoize", function() {
    it("can memoize logic against some key", function () {
      const config = Config.build({});
      config.memoize("the-key", () => 1)
      expect(config.memoize("the-key", () => 2)).toBe(1);
    })

    it("allows you to memoize an undefined result", function() {
      const config = Config.build({});
      config.memoize("the-key", () => undefined)
      expect(config.memoize("the-key", () => true)).toBe(undefined);
    })
  })

  describe("memoizeAsync", function() {
    function sleep(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    }

    it("shares values with memoize", async function() {
      const config = Config.build({});
      config.memoize("the-key", () => 1)
      expect(await config.memoizeAsync("the-key", () => 2)).toBe(1);
    });

    it("evaluates only a single time when called parallely", async function() {
      const config = Config.build({});
      let numberOfTimes = 0;
      const c1 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; return 42; });
      const c2 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; return 42; });

      expect(await c1).toBe(42);
      expect(await c2).toBe(42);
      expect(numberOfTimes).toBe(1);
    })

    it("evaluates only a single time even when called serially", async function() {
      const config = Config.build({});
      let numberOfTimes = 0;

      const c1 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; return 42; });
      expect(await c1).toBe(42);

      const c2 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; return 42; });
      expect(await c2).toBe(42);

      expect(numberOfTimes).toBe(1);
    })

    it("calls things once, but fails when called parallely with a failing function", async function() {
      const config = Config.build({});
      let numberOfTimes = 0;

      const c1 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; throw new Error("foobar"); });
      const c2 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; throw new Error("foobar"); });

      expect(await c1.catch(e => e.message)).toBe("foobar");
      expect(await c2.catch(e => e.message)).toBe("foobar");

      expect(numberOfTimes).toBe(1);
    })

    it("calls things twice, but fails when called serially with a failing function", async function () {
      const config = Config.build({});
      let numberOfTimes = 0;

      const c1 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; throw new Error("foobar"); });
      expect(await c1.catch(e => e.message)).toBe("foobar");

      const c2 = config.memoizeAsync("the-key", async () => { await sleep(1); numberOfTimes = numberOfTimes + 1; throw new Error("foobar"); });
      expect(await c2.catch(e => e.message)).toBe("foobar");

      expect(numberOfTimes).toBe(2);
    })
  })
});
