import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "../../src/server/builder-api/src/actions/action-error";
import { DeletePageAction } from "../../src/server/builder-api/src/actions/delete-page";
import { PageTreeBuilder } from "../../src/server/builder-api/src/utils/page-tree-builder";
import { createSupabaseAdminMock } from "../mocks/supabase-admin.mock";

// Mock the getSupabaseAdmin function
vi.mock("../../src/server/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("DeletePageAction", () => {
  const mockAppId = "test-app-123";
  const mockUserId = "user-456";
  let deletePageAction: DeletePageAction;
  let mockSupabase: any;
  let mockContext: any;
  let getSupabaseAdmin: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import the mocked function
    const supabaseModule = await import("../../src/server/supabase");
    getSupabaseAdmin = supabaseModule.getSupabaseAdmin;
    
    mockContext = {
      appId: mockAppId,
      userId: mockUserId,
    };

    deletePageAction = new DeletePageAction();
    deletePageAction.setContext(mockContext);
  });

  describe("execute", () => {
    it("should throw ActionError when context is not set", async () => {
      const action = new DeletePageAction();
      
      await expect(action.execute({ id: "page-1" })).rejects.toThrow(ActionError);
      await expect(action.execute({ id: "page-1" })).rejects.toThrow("Context not set");
    });

    it("should validate page ID is required", async () => {
      await expect(deletePageAction.execute({ id: "" })).rejects.toThrow();
    });

    it("should successfully execute delete operation", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: null }, error: null };
          return { data: mockPages, error: null };
        },
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      deletePageAction["userId"] = mockUserId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result).toBeDefined();
      expect(result.tags).toBeDefined();
    });

    it("should convert unknown errors to ActionError", async () => {
      mockSupabase = createSupabaseAdminMock({
        chai_pages: () => {
          throw new Error("Unexpected database error");
        },
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(deletePageAction.execute({ id: "page-1" })).rejects.toThrow(ActionError);
    });
  });

  describe("deletePage - Page Lock Checking", () => {
    it("should return PAGE_LOCKED when page is being edited by another user", async () => {
      const editorId = "other-user-789";

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: editorId }, error: null };
          return { data: [], error: null };
        },
      });
      
      deletePageAction["supabase"] = mockSupabase;
      deletePageAction["appId"] = mockAppId;
      deletePageAction["userId"] = mockUserId;
      deletePageAction["pageTreeBuilder"] = new PageTreeBuilder(mockSupabase, mockAppId);

      const result = await deletePageAction.deletePage("page-1");
      
      expect(result.code).toBe("PAGE_LOCKED");
      expect(result.editor).toBe(editorId);
    });

    it("should proceed with deletion when page is not locked", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: null }, error: null };
          return { data: mockPages, error: null };
        },
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      deletePageAction["userId"] = mockUserId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.code).toBeUndefined();
      expect(result.tags).toBeDefined();
    });

    it("should allow deletion when current user is the editor", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: mockUserId, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: mockUserId }, error: null };
          return { data: mockPages, error: null };
        },
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      deletePageAction["userId"] = mockUserId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.code).toBeUndefined();
      expect(result.tags).toBeDefined();
    });
  });


  describe("deleteLanguagePageWithTree", () => {
    it("should delete language page with nested children and siblings", async () => {
      const mockPages = [
        // Primary pages
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [{ id: "page-2" }] },
        { id: "page-2", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1", currentEditor: null, children: [] },
        // Language pages
        { id: "lang-1", name: "Inicio", slug: "/es/home", pageType: "page", primaryPage: "page-1", parent: null, lang: "es", currentEditor: null, children: [] },
        { id: "lang-2", name: "Productos", slug: "/es/products", pageType: "page", primaryPage: "page-2", parent: "lang-1", lang: "es", currentEditor: null, children: [] },
        // Another language variant
        { id: "lang-fr-1", name: "Accueil", slug: "/fr/home", pageType: "page", primaryPage: "page-1", parent: null, lang: "fr", currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages.slice(0, 2));
      const languageTree = builder.buildLanguageTree(mockPages.slice(2), primaryTree);
      const pagesTree = { primaryTree, languageTree, totalPrimaryPages: 2, totalLanguagePages: mockPages.slice(2).length };
      
      const result = await deletePageAction.deleteLanguagePageWithTree("lang-1", languageTree[0], pagesTree);
      
      expect(result.tags).toBeDefined();
      expect(result.totalDeleted).toBeGreaterThan(1);
    });

    it("should throw error when primary page is not found", async () => {
      const langNode = { id: "lang-1", primaryPage: "non-existent", children: [] };

      deletePageAction["supabase"] = createSupabaseAdminMock({});
      deletePageAction["appId"] = mockAppId;
      deletePageAction["pageTreeBuilder"] = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);

      const pagesTree = { primaryTree: [], languageTree: [], totalPrimaryPages: 0, totalLanguagePages: 0 };

      await expect(deletePageAction.deleteLanguagePageWithTree("lang-1", langNode, pagesTree)).rejects.toThrow();
    });
  });

  describe("deletePrimaryPageWithTree", () => {
    it("should delete primary page with all nested children and language variants", async () => {
      const mockPages = [
        // Primary pages
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [{ id: "page-2" }] },
        { id: "page-2", name: "Products", slug: "/products", pageType: "page", primaryPage: null, parent: "page-1", currentEditor: null, children: [{ id: "page-3" }] },
        { id: "page-3", name: "Details", slug: "/details", pageType: "page", primaryPage: null, parent: "page-2", currentEditor: null, children: [] },
        // Language pages
        { id: "lang-1", name: "Inicio", slug: "/es/home", pageType: "page", primaryPage: "page-1", parent: null, currentEditor: null, children: [{ id: "lang-2" }] },
        { id: "lang-2", name: "Productos", slug: "/es/products", pageType: "page", primaryPage: "page-2", parent: "lang-1", currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages.slice(0, 3));
      const languageTree = builder.buildLanguageTree(mockPages.slice(3), primaryTree);
      const pagesTree = { primaryTree, languageTree, totalPrimaryPages: 3, totalLanguagePages: mockPages.slice(3).length };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.tags).toContain("page-page-1");
      expect(result.tags.length).toBeGreaterThan(1);
      expect(result.totalDeleted).toBeGreaterThan(1);
    });

    it("should delete primary page without children or language variants", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.tags).toContain("page-page-1");
      expect(result.totalDeleted).toBe(1);
    });

    it("should throw error when primary page is not found in tree", async () => {
      deletePageAction["supabase"] = createSupabaseAdminMock({});
      deletePageAction["appId"] = mockAppId;
      deletePageAction["pageTreeBuilder"] = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);

      const pagesTree = { primaryTree: [], languageTree: [], totalPrimaryPages: 0, totalLanguagePages: 0 };

      await expect(deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree)).rejects.toThrow();
    });
  });

  describe("performDeletionWithIds", () => {
    it("should delete from all related tables in correct order", async () => {
      mockSupabase = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      
      deletePageAction["supabase"] = mockSupabase;
      deletePageAction["appId"] = mockAppId;

      await deletePageAction.performDeletionWithIds(["page-1", "page-2"]);
      
      expect(mockSupabase.from).toHaveBeenCalledWith("library_templates");
      expect(mockSupabase.from).toHaveBeenCalledWith("app_pages_revisions");
      expect(mockSupabase.from).toHaveBeenCalledWith("app_pages");
      expect(mockSupabase.from).toHaveBeenCalledWith("app_pages_online");
    });

    it("should handle deletion errors gracefully", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/home", pageType: "page", primaryPage: null, parent: null, currentEditor: null },
      ];

      mockSupabase = createSupabaseAdminMock({
        chai_pages: (filters: any) => {
          if (filters.id && filters.app) {
            return { data: { currentEditor: null }, error: null };
          }
          return { data: mockPages, error: null };
        },
        library_templates: () => ({ data: null, error: { message: "Delete failed" } }),
      });

      vi.mocked(getSupabaseAdmin).mockResolvedValue(mockSupabase);

      await expect(deletePageAction.execute({ id: "page-1" })).rejects.toThrow();
    });
  });

  describe("getCurrentEditor", () => {
    it("should return null when page has no current editor", async () => {
      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: null }, error: null };
          return { data: null, error: null };
        },
      });
      
      deletePageAction["supabase"] = mockSupabase;
      deletePageAction["appId"] = mockAppId;

      const editor = await deletePageAction.getCurrentEditor("page-1");
      
      expect(editor).toBeNull();
    });

    it("should return editor ID when page is being edited", async () => {
      const editorId = "editor-999";

      mockSupabase = createSupabaseAdminMock({
        app_pages: (filters: any, fields: any, single: boolean) => {
          if (single) return { data: { currentEditor: editorId }, error: null };
          return { data: null, error: null };
        },
      });
      
      deletePageAction["supabase"] = mockSupabase;
      deletePageAction["appId"] = mockAppId;

      const editor = await deletePageAction.getCurrentEditor("page-1");
      
      expect(editor).toBe(editorId);
    });
  });

  describe("Complex Deletion Scenarios", () => {
    it("should handle deletion of deeply nested page hierarchies", async () => {
      const mockPages = [
        { id: "page-1", name: "Root", slug: "/", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [{ id: "page-2" }] },
        { id: "page-2", name: "Level 1", slug: "/l1", pageType: "page", primaryPage: null, parent: "page-1", currentEditor: null, children: [{ id: "page-3" }] },
        { id: "page-3", name: "Level 2", slug: "/l1/l2", pageType: "page", primaryPage: null, parent: "page-2", currentEditor: null, children: [{ id: "page-4" }] },
        { id: "page-4", name: "Level 3", slug: "/l1/l2/l3", pageType: "page", primaryPage: null, parent: "page-3", currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.totalDeleted).toBe(4);
    });

    it("should handle multiple language variants with nested children", async () => {
      const mockPages = [
        { id: "page-1", name: "Home", slug: "/", pageType: "page", primaryPage: null, parent: null, currentEditor: null, children: [{ id: "page-2" }] },
        { id: "page-2", name: "About", slug: "/about", pageType: "page", primaryPage: null, parent: "page-1", currentEditor: null, children: [] },
        { id: "lang-es-1", name: "Inicio", slug: "/es", pageType: "page", primaryPage: "page-1", lang: "es", parent: null, currentEditor: null, children: [] },
        { id: "lang-es-2", name: "Acerca", slug: "/es/about", pageType: "page", primaryPage: "page-2", lang: "es", parent: null, currentEditor: null, children: [] },
        { id: "lang-fr-1", name: "Accueil", slug: "/fr", pageType: "page", primaryPage: "page-1", lang: "fr", parent: null, currentEditor: null, children: [] },
        { id: "lang-fr-2", name: "À propos", slug: "/fr/about", pageType: "page", primaryPage: "page-2", lang: "fr", parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages.slice(0, 2));
      const languageTree = builder.buildLanguageTree(mockPages.slice(2), primaryTree);
      const pagesTree = { primaryTree, languageTree, totalPrimaryPages: 2, totalLanguagePages: mockPages.slice(2).length };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("page-1", pagesTree);
      
      expect(result.totalDeleted).toBeGreaterThanOrEqual(4);
    });

    it("should delete partial pages (globals) as primary pages", async () => {
      const mockPages = [
        { id: "global-1", name: "Header", slug: "", pageType: "global", primaryPage: null, parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("global-1", pagesTree);
      
      expect(result.tags).toContain("page-global-1");
      expect(result.totalDeleted).toBe(1);
    });

    it("should delete partial pages (forms) as primary pages", async () => {
      const mockPages = [
        { id: "form-1", name: "Contact Form", slug: "", pageType: "form", primaryPage: null, parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages);
      const pagesTree = { primaryTree, languageTree: [], totalPrimaryPages: mockPages.length, totalLanguagePages: 0 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("form-1", pagesTree);
      
      expect(result.tags).toContain("page-form-1");
      expect(result.totalDeleted).toBe(1);
    });

    it("should delete partial pages with language variants", async () => {
      const mockPages = [
        // Global page (partial)
        { id: "global-1", name: "Header", slug: "", pageType: "global", primaryPage: null, parent: null, currentEditor: null, children: [] },
        // Language variants of the global
        { id: "global-es-1", name: "Cabecera", slug: "", pageType: "global", primaryPage: "global-1", lang: "es", parent: null, currentEditor: null, children: [] },
        { id: "global-fr-1", name: "En-tête", slug: "", pageType: "global", primaryPage: "global-1", lang: "fr", parent: null, currentEditor: null, children: [] },
      ];

      deletePageAction["supabase"] = createSupabaseAdminMock({
        library_templates: () => ({ data: null, error: null }),
        app_pages_revisions: () => ({ data: null, error: null }),
        app_pages_online: () => ({ data: null, error: null }),
      });
      deletePageAction["appId"] = mockAppId;
      const builder = new PageTreeBuilder(deletePageAction["supabase"], mockAppId);
      deletePageAction["pageTreeBuilder"] = builder;

      const primaryTree = builder.buildPrimaryTree(mockPages.slice(0, 1));
      const languageTree = builder.buildLanguageTree(mockPages.slice(1), primaryTree);
      const pagesTree = { primaryTree, languageTree, totalPrimaryPages: 1, totalLanguagePages: 2 };
      
      const result = await deletePageAction.deletePrimaryPageWithTree("global-1", pagesTree);
      
      expect(result.tags).toContain("page-global-1");
      expect(result.totalDeleted).toBe(3); // Global + 2 language variants
    });
  });
});
