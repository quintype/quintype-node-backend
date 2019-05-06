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
});
