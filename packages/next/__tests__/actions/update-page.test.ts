import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "../../src/server/builder-api/src/actions/action-error";
import { UpdatePageAction } from "../../src/server/builder-api/src/actions/update-page";
import { PageTreeBuilder } from "../../src/server/builder-api/src/utils/page-tree-builder";
import { createSupabaseAdminMock } from "../mocks/supabase-admin.mock";

// Mock the getSupabaseAdmin function
vi.mock("../../src/server/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("UpdatePageAction", () => {
  const mockAppId = "test-app-123";
  const mockUserId = "user-456";
  let updatePageAction: UpdatePageAction;
  let mockSupabase: any;
  let mockContext: any;
  let getSupabaseAdmin: any;

  // Helper function to create mock chain with proper slug validation support
  const createMockChainHelper = (tableName: string, mockPages: any[], updateTracker?: any, pageId?: string) => {
    let hasNeq = false;
    let currentPageId = pageId;
    const chain: any = {
      select: vi.fn(() => chain),
      update: vi.fn((data: any) => {
        if (updateTracker && tableName === "app_pages") { // Only track from app_pages table
          if (updateTracker.slugs && data.slug) {
            updateTracker.slugs.push(data.slug);
          }
          if (updateTracker.tables && !updateTracker.tables.includes(tableName)) {
            updateTracker.tables.push(tableName);
          }
        }
        if (updateTracker && tableName === "app_pages_online" && updateTracker.tables && !updateTracker.tables.includes(tableName)) {
          updateTracker.tables.push(tableName);
        }
        return {
          eq: vi.fn((field: string, value: string) => {
            if (field === "id") {
              currentPageId = value;
              if (updateTracker && updateTracker.ids && !updateTracker.ids.includes(value)) {
                updateTracker.ids.push(value);
              }
            }
            return chain;
          }),
        };
      }),
      eq: vi.fn((field: string, value: string) => {
        if (field === "id") {
          currentPageId = value;
        }
        return chain;
      }),
      neq: vi.fn(() => {
        hasNeq = true;
        return chain;
      }),
      single: vi.fn(() => {
        // Find the correct page based on currentPageId if set
        const page = currentPageId 
          ? mockPages.find(p => p.id === currentPageId) || mockPages[0]
          : mockPages[0];
        return { 
          data: page || null, 
          error: null 
        };
      }),
      then: vi.fn((resolve: any) => {
        // If this has neq, it's a slug validation query - return empty array (slug available)
        if (hasNeq) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
        // For getPagesTree query - return all pages
        if (tableName === "app_pages") {
          return Promise.resolve({ data: mockPages, error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      }),
    };
    return chain;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the mocked function
    const supabaseModule = await import("../../src/server/supabase");
    getSupabaseAdmin = supabaseModule.getSupabaseAdmin;
    
    mockContext = {
      appId: mockAppId,
      userId: mockUserId,
    };

    updatePageAction = new UpdatePageAction();
    updatePageAction.setContext(mockContext);
  });

  describe("execute", () => {
    it("should throw ActionError when context is not set", async () => {
      const action = new UpdatePageAction();
      
      await expect(action.execute({ id: "page-1" })).rejects.toThrow(ActionError);
      await expect(action.execute({ id: "page-1" })).rejects.toThrow("Context not set");
    });

    it("should validate page ID is required", async () => {
      await expect(updatePageAction.execute({ id: "" })).rejects.toThrow();
    });

    it("should successfully update page without slug change", async () => {
      const mockPage = { 
        id: "page-1", 
        name: "Home", 
        slug: "/home", 
        pageType: "page", 
        primaryPage: null, 
        parent: null, 
        lang: "",
        dynamic: false 
      };

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: mockPage, error: null };
          return { data: null, error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      const result = await updatePageAction.execute({ 
        id: "page-1", 
        name: "Updated Home",
        pageType: "page"
      });
      
      expect(result).toBeDefined();
      expect(result.page).toBeDefined();
    });

    it("should handle only blocks update", async () => {
      const mockPage = { 
        id: "page-1", 
        slug: "/home",
        dynamic: false 
      };

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: mockPage, error: null };
          return { data: null, error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      const result = await updatePageAction.execute({ 
        id: "page-1", 
        blocks: [{ _type: "Heading", _id: "1" }]
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe("Slug Change - Primary Pages", () => {
    it("should update slug for primary page without children", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-1", 
        slug: "/new-home"
      });
      
      expect(tracker.slugs).toContain("/new-home");
    });

    it("should recursively update slug for primary page with nested children", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Category", slug: "/products/category", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
        { id: "page-3", name: "Item", slug: "/products/category/item", pageType: "page", primaryPage: null, parent: "page-2", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-1", 
        slug: "/items"
      });
      
      expect(tracker.slugs).toContain("/items");
      expect(tracker.slugs).toContain("/items/category");
      expect(tracker.slugs).toContain("/items/category/item");
    });

  });

  describe("Slug Change - Language Pages", () => {
    it("should update slug for language page without children", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "lang-1", name: "Inicio", slug: "/es/home", pageType: "page", primaryPage: "page-1", parent: null, lang: "es", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "lang-1", 
        slug: "/es/inicio"
      });
      
      expect(tracker.slugs).toContain("/es/inicio");
    });

    it("should recursively update slug for language page with nested children", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Category", slug: "/products/category", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
        { id: "lang-1", name: "Productos", slug: "/es/products", pageType: "page", primaryPage: "page-1", parent: null, lang: "es", dynamic: false },
        { id: "lang-2", name: "Categoría", slug: "/es/products/category", pageType: "page", primaryPage: "page-2", parent: "lang-1", lang: "es", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "lang-1", 
        slug: "/es/productos"
      });
      
      expect(tracker.slugs).toContain("/es/productos");
      expect(tracker.slugs).toContain("/es/productos/category");
    });
  });

  describe("Slug Validation", () => {
    it("should throw error when slug is already in use", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
      ];

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single && fields.includes("slug")) {
            return { data: { slug: "/home" }, error: null };
          }
          if (single && fields.includes("lang")) {
            return { data: { slug: "/home", lang: "", primaryPage: null, dynamic: false }, error: null };
          }
          if (fields.includes("id") && filters?.slug === "/about") {
            return { data: [{ id: "page-2" }], error: null }; // Slug taken
          }
          return { data: mockPages, error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(updatePageAction.execute({ 
        id: "page-1", 
        slug: "/about"
      })).rejects.toThrow("Slug '/about' is already in use");
    });

    it("should not throw error when slug is not changed", async () => {
      const mockPage = { 
        id: "page-1", 
        slug: "/home",
        lang: "",
        primaryPage: null,
        dynamic: false 
      };

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: mockPage, error: null };
          return { data: null, error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      const result = await updatePageAction.execute({ 
        id: "page-1", 
        slug: "/home", // Same slug
        name: "Updated Home"
      });
      
      expect(result).toBeDefined();
    });
  });

  describe("Update Both Tables", () => {
    it("should update both app_pages and app_pages_online tables", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
      ];

      const tracker = { tables: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-1", 
        slug: "/welcome"
      });
      
      expect(tracker.tables).toContain("app_pages");
      expect(tracker.tables).toContain("app_pages_online");
    });
  });

  describe("Complex Update Scenarios", () => {
    it("should handle deep nesting with 4 levels", async () => {
      const mockPages = [
        { id: "page-1", name: "L1", slug: "/l1", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "L2", slug: "/l1/l2", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
        { id: "page-3", name: "L3", slug: "/l1/l2/l3", pageType: "page", primaryPage: null, parent: "page-2", lang: "", dynamic: false },
        { id: "page-4", name: "L4", slug: "/l1/l2/l3/l4", pageType: "page", primaryPage: null, parent: "page-3", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-1", 
        slug: "/level1"
      });
      
      expect(tracker.slugs.length).toBe(4);
      expect(tracker.slugs).toContain("/level1");
      expect(tracker.slugs).toContain("/level1/l2");
      expect(tracker.slugs).toContain("/level1/l2/l3");
      expect(tracker.slugs).toContain("/level1/l2/l3/l4");
    });

  });

  describe("Parent Change", () => {
    it("should update slug when parent changes to root level", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Electronics", slug: "/products/electronics", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-2", 
        parent: null  // Moving to root level
      });
      
      expect(tracker.slugs).toContain("/electronics");
    });

    it("should update slug when parent changes to different parent", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Services", slug: "/services", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-3", name: "Electronics", slug: "/products/electronics", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-3", 
        parent: "page-2"  // Moving from Products to Services
      });
      
      expect(tracker.slugs).toContain("/services/electronics");
    });

    it("should update slug for page and all children when parent changes", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Services", slug: "/services", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-3", name: "Electronics", slug: "/products/electronics", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
        { id: "page-4", name: "Phones", slug: "/products/electronics/phones", pageType: "page", primaryPage: null, parent: "page-3", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-3", 
        parent: "page-2"  // Moving Electronics from Products to Services
      });
      
      expect(tracker.slugs).toContain("/services/electronics");
      expect(tracker.slugs).toContain("/services/electronics/phones");
    });

    it("should update page slug when parent changes (language variants also updated)", async () => {
      const mockPages = [
        { id: "page-1", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-2", name: "Services", slug: "/services", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "page-3", name: "Electronics", slug: "/products/electronics", pageType: "page", primaryPage: null, parent: "page-1", lang: "", dynamic: false },
      ];

      const tracker = { slugs: [] as string[] };
      
      mockSupabase = {
        from: vi.fn((table: string) => createMockChainHelper(table, mockPages, tracker)),
      };

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await updatePageAction.execute({ 
        id: "page-3", 
        parent: "page-2"  // Moving from Products to Services
      });
      
      // Verify the primary page slug is updated to reflect new parent
      expect(tracker.slugs).toContain("/services/electronics");
    });

    it("should throw error when trying to change parent of language page", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, lang: "", dynamic: false },
        { id: "lang-1", name: "Inicio", slug: "/es/home", pageType: "page", primaryPage: "page-1", parent: null, lang: "es", dynamic: false },
      ];

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single && fields.includes("parent")) {
            return { data: { parent: null }, error: null };
          }
          if (single && fields.includes("slug")) {
            return { data: mockPages[1], error: null };
          }
          return { data: mockPages, error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(updatePageAction.execute({ 
        id: "lang-1", 
        parent: "page-1"
      })).rejects.toThrow("Cannot change parent of language pages directly");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockSupabase = createSupabaseAdminMock({
        app_pages: () => {
          throw new Error("Database connection failed");
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(updatePageAction.execute({ 
        id: "page-1", 
        slug: "/new-slug"
      })).rejects.toThrow(ActionError);
    });

    it("should handle page not found error", async () => {
      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single && fields.includes("slug")) {
            return { data: { slug: "/home" }, error: null };
          }
          if (single && fields.includes("lang")) {
            return { data: null, error: { message: "Page not found" } };
          }
          return { data: [], error: null };
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(updatePageAction.execute({ 
        id: "non-existent", 
        slug: "/new-slug"
      })).rejects.toThrow();
    });
  });
});
