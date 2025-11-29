import { describe, expect, it, beforeEach, vi } from "vitest";
import { PageTreeBuilder, PageTreeNode } from "../../src/server/builder-api/src/utils/page-tree-builder";
import { createSupabaseAdminMock } from "../mocks/supabase-admin.mock";

describe("PageTreeBuilder", () => {
  const mockAppId = "test-app-123";
  let mockSupabase: any;
  let pageTreeBuilder: PageTreeBuilder;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with supabase, appId, and default logging disabled", () => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      expect(pageTreeBuilder).toBeInstanceOf(PageTreeBuilder);
    });

    it("should initialize with logging enabled when specified", () => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId, true);
      expect(pageTreeBuilder).toBeInstanceOf(PageTreeBuilder);
    });
  });

  describe("getPagesTree", () => {
    it("should fetch and build complete page trees with primary and language pages", async () => {
      const mockPages = [
        // Primary pages
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: "page-1" },
        // Language pages
        { id: "lang-1", name: "Inicio", slug: "/es/home", pageType: "page", primaryPage: "page-1", parent: null },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPages, error: null }),
        }),
      });

      mockSupabase = { from: mockFrom };

      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      const result = await pageTreeBuilder.getPagesTree();

      expect(result.primaryTree).toHaveLength(1);
      expect(result.primaryTree[0].id).toBe("page-1");
      expect(result.primaryTree[0].children).toHaveLength(1);
      expect(result.languageTree).toHaveLength(1);
      expect(result.totalPrimaryPages).toBe(2);
      expect(result.totalLanguagePages).toBe(1);
    });

    it("should include partial pages (globals/forms) in primary tree", async () => {
      const mockPages = [
        // Regular primary pages
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null },
        // Partial pages (globals/forms) - now treated as primary pages
        { id: "global-1", name: "Header", slug: "", pageType: "global", primaryPage: null, parent: null },
        { id: "form-1", name: "Contact Form", slug: "", pageType: "form", primaryPage: null, parent: null },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockPages, error: null }),
        }),
      });

      mockSupabase = { from: mockFrom };

      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      const result = await pageTreeBuilder.getPagesTree();

      // All three should be in primary tree since partialTree was removed
      expect(result.primaryTree).toHaveLength(3);
      expect(result.totalPrimaryPages).toBe(3);
      expect(result.totalLanguagePages).toBe(0);
      
      // Verify all page types are included
      const pageTypes = result.primaryTree.map(p => p.pageType);
      expect(pageTypes).toContain("page");
      expect(pageTypes).toContain("global");
      expect(pageTypes).toContain("form");
    });

    it("should handle empty pages array", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      mockSupabase = { from: mockFrom };

      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      const result = await pageTreeBuilder.getPagesTree();

      expect(result.primaryTree).toHaveLength(0);
      expect(result.languageTree).toHaveLength(0);
      expect(result.totalPrimaryPages).toBe(0);
      expect(result.totalLanguagePages).toBe(0);
    });

    it("should throw error when database query fails", async () => {
      const dbError = { message: "Database connection failed", code: "DB_ERROR" };
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        }),
      });

      mockSupabase = { from: mockFrom };

      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      
      await expect(pageTreeBuilder.getPagesTree()).rejects.toThrow();
    });

    it("should handle null data from database", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      mockSupabase = { from: mockFrom };

      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
      const result = await pageTreeBuilder.getPagesTree();

      expect(result.primaryTree).toHaveLength(0);
      expect(result.languageTree).toHaveLength(0);
    });
  });

  describe("buildPrimaryTree", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should build a flat tree with root pages only", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: null },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe("page-1");
      expect(tree[0].children).toHaveLength(0);
      expect(tree[1].id).toBe("page-2");
    });

    it("should build a nested tree with parent-child relationships", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1" },
        { id: "page-3", name: "Product Details", slug: "/products/details", pageType: "page", primaryPage: null, parent: "page-2" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe("page-1");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe("page-2");
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id).toBe("page-3");
    });

    it("should handle orphaned pages (parent not found) by treating them as root nodes", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "Orphan", slug: "/orphan", pageType: "page", primaryPage: null, parent: "non-existent" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);

      expect(tree).toHaveLength(2);
      expect(tree.find(node => node.id === "page-2")).toBeDefined();
    });

    it("should handle empty pages array", () => {
      const tree = pageTreeBuilder.buildPrimaryTree([]);
      expect(tree).toHaveLength(0);
    });

    it("should build tree with multiple siblings at different levels", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: null },
        { id: "page-3", name: "Services", slug: "/services", pageType: "page", primaryPage: null, parent: "page-1" },
        { id: "page-4", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);

      expect(tree).toHaveLength(2);
      expect(tree[0].children).toHaveLength(2);
    });
  });

  describe("buildLanguageTree", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should build language tree based on primary tree structure", () => {
      const primaryPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: "page-1" },
      ];

      const languagePages = [
        { id: "lang-1", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", parent: null },
        { id: "lang-2", name: "Acerca de", slug: "/es/about", pageType: "page", primaryPage: "page-2", parent: "lang-1" },
      ];

      const primaryTree = pageTreeBuilder.buildPrimaryTree(primaryPages);
      const languageTree = pageTreeBuilder.buildLanguageTree(languagePages, primaryTree);

      expect(languageTree).toHaveLength(1);
      expect(languageTree[0].id).toBe("lang-1");
      expect(languageTree[0].children).toHaveLength(1);
      expect(languageTree[0].children[0].id).toBe("lang-2");
    });

    it("should handle multiple language variants for same primary page", () => {
      const primaryPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
      ];

      const languagePages = [
        { id: "lang-es", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", parent: null },
        { id: "lang-fr", name: "Accueil", slug: "/fr", pageType: "page", primaryPage: "page-1", parent: null },
      ];

      const primaryTree = pageTreeBuilder.buildPrimaryTree(primaryPages);
      const languageTree = pageTreeBuilder.buildLanguageTree(languagePages, primaryTree);

      expect(languageTree).toHaveLength(2);
    });

    it("should handle empty language pages array", () => {
      const primaryPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
      ];

      const primaryTree = pageTreeBuilder.buildPrimaryTree(primaryPages);
      const languageTree = pageTreeBuilder.buildLanguageTree([], primaryTree);

      expect(languageTree).toHaveLength(0);
    });

    it("should handle empty primary tree", () => {
      const languagePages = [
        { id: "lang-1", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", parent: null },
      ];

      const languageTree = pageTreeBuilder.buildLanguageTree(languagePages, []);

      expect(languageTree).toHaveLength(0);
    });
  });

  describe("findPageInPrimaryTree", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should find a root page in the tree", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: null },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);
      const found = pageTreeBuilder.findPageInPrimaryTree("page-1", tree);

      expect(found).toBeDefined();
      expect(found?.id).toBe("page-1");
    });

    it("should find a nested page in the tree", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1" },
        { id: "page-3", name: "Details", slug: "/products/details", pageType: "page", primaryPage: null, parent: "page-2" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);
      const found = pageTreeBuilder.findPageInPrimaryTree("page-3", tree);

      expect(found).toBeDefined();
      expect(found?.id).toBe("page-3");
    });

    it("should return null when page is not found", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);
      const found = pageTreeBuilder.findPageInPrimaryTree("non-existent", tree);

      expect(found).toBeNull();
    });

    it("should handle empty tree", () => {
      const found = pageTreeBuilder.findPageInPrimaryTree("page-1", []);
      expect(found).toBeNull();
    });
  });

  describe("findPageInLanguageTree", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should find a language page in the tree", () => {
      const primaryPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
      ];

      const languagePages = [
        { id: "lang-1", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", parent: null },
      ];

      const primaryTree = pageTreeBuilder.buildPrimaryTree(primaryPages);
      const languageTree = pageTreeBuilder.buildLanguageTree(languagePages, primaryTree);
      const found = pageTreeBuilder.findPageInLanguageTree("lang-1", languageTree);

      expect(found).toBeDefined();
      expect(found?.id).toBe("lang-1");
    });

    it("should return null when page is not found", () => {
      const found = pageTreeBuilder.findPageInLanguageTree("non-existent", []);
      expect(found).toBeNull();
    });
  });
  describe("collectNestedChildIds", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should collect all nested child IDs from a node", () => {
      const pages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1" },
        { id: "page-3", name: "Details", slug: "/products/details", pageType: "page", primaryPage: null, parent: "page-2" },
        { id: "page-4", name: "Reviews", slug: "/products/reviews", pageType: "page", primaryPage: null, parent: "page-2" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);
      const ids = pageTreeBuilder.collectNestedChildIds(tree[0]);

      expect(ids).toHaveLength(3);
      expect(ids).toContain("page-2");
      expect(ids).toContain("page-3");
      expect(ids).toContain("page-4");
    });

    it("should return empty array for node without children", () => {
      const node: PageTreeNode = {
        id: "page-1",
        name: "Home",
        slug: "/",
        pageType: "page",
        primaryPage: null,
        parent: null,
        children: [],
      };

      const ids = pageTreeBuilder.collectNestedChildIds(node);
      expect(ids).toHaveLength(0);
    });

    it("should handle deeply nested children", () => {
      const pages = [
        { id: "page-1", name: "Root", slug: "/", pageType: "page", primaryPage: null, parent: null },
        { id: "page-2", name: "Level 1", slug: "/l1", pageType: "page", primaryPage: null, parent: "page-1" },
        { id: "page-3", name: "Level 2", slug: "/l1/l2", pageType: "page", primaryPage: null, parent: "page-2" },
        { id: "page-4", name: "Level 3", slug: "/l1/l2/l3", pageType: "page", primaryPage: null, parent: "page-3" },
      ];

      const tree = pageTreeBuilder.buildPrimaryTree(pages);
      const ids = pageTreeBuilder.collectNestedChildIds(tree[0]);

      expect(ids).toHaveLength(3);
      expect(ids).toEqual(["page-2", "page-3", "page-4"]);
    });
  });

  describe("findLanguagePagesForPrimary", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should find all language variants for a primary page", () => {
      const primaryPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null },
      ];

      const languagePages = [
        { id: "lang-es", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", parent: null },
        { id: "lang-fr", name: "Accueil", slug: "/fr", pageType: "page", primaryPage: "page-1", parent: null },
        { id: "lang-de", name: "Startseite", slug: "/de", pageType: "page", primaryPage: "page-1", parent: null },
      ];

      const primaryTree = pageTreeBuilder.buildPrimaryTree(primaryPages);
      const languageTree = pageTreeBuilder.buildLanguageTree(languagePages, primaryTree);
      const variants = pageTreeBuilder.findLanguagePagesForPrimary("page-1", languageTree);

      expect(variants).toHaveLength(3);
    });

    it("should return empty array when no language pages exist", () => {
      const variants = pageTreeBuilder.findLanguagePagesForPrimary("page-1", []);
      expect(variants).toHaveLength(0);
    });
  });

  describe("collectNestedLanguageIds", () => {
    beforeEach(() => {
      mockSupabase = createSupabaseAdminMock({});
      pageTreeBuilder = new PageTreeBuilder(mockSupabase, mockAppId);
    });

    it("should collect all nested language page IDs", () => {
      const langNode = {
        id: "lang-1",
        name: "Inicio",
        slug: "/es",
        pageType: "page",
        primaryPage: "page-1",
        parent: null,
        children: [
          {
            id: "lang-2",
            name: "Productos",
            slug: "/es/productos",
            pageType: "page",
            primaryPage: "page-2",
            parent: "lang-1",
            children: [],
          },
        ],
      };

      const ids = pageTreeBuilder.collectNestedLanguageIds(langNode);

      expect(ids).toHaveLength(1);
      expect(ids).toContain("lang-2");
    });

    it("should return empty array for node without children", () => {
      const langNode = {
        id: "lang-1",
        name: "Inicio",
        slug: "/es",
        pageType: "page",
        primaryPage: "page-1",
        parent: null,
        children: [],
      };

      const ids = pageTreeBuilder.collectNestedLanguageIds(langNode);
      expect(ids).toHaveLength(0);
    });

    it("should handle node without children property", () => {
      const langNode = {
        id: "lang-1",
        name: "Inicio",
        slug: "/es",
        pageType: "page",
        primaryPage: "page-1",
        parent: null,
      };

      const ids = pageTreeBuilder.collectNestedLanguageIds(langNode);
      expect(ids).toHaveLength(0);
    });
  });
});
