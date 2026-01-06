import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "../../src/server/builder-api/src/actions/action-error";
import { PublishPageAction } from "../../src/server/builder-api/src/actions/publish-page";
import { db } from "../../src/server/db";

// Mock the db
vi.mock("../../src/server/db", () => ({
  db: {
    query: {
      apps: {
        findFirst: vi.fn(),
      },
      appPages: {
        findFirst: vi.fn(),
      },
      appPagesOnline: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(db)),
  },
  safeQuery: vi.fn((fn) => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.then((data: any) => ({ data, error: null }));
      }
      return Promise.resolve({ data: result, error: null });
    } catch (error: any) {
      return Promise.resolve({ data: null, error: error });
    }
  }),
  schema: {
    apps: { id: { name: "id" }, changes: { name: "changes" } },
    appsOnline: { id: { name: "id" } },
    appPages: { id: { name: "id" }, app: { name: "app" }, changes: { name: "changes" }, online: { name: "online" } },
    appPagesOnline: { id: { name: "id" }, app: { name: "app" }, partialBlocks: { name: "partialBlocks" }, primaryPage: { name: "primaryPage" } },
    appPagesRevisions: { id: { name: "id" } },
  },
}));

describe("PublishPageAction", () => {
  const mockAppId = "test-app-123";
  const mockUserId = "user-456";
  let publishPageAction: PublishPageAction;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      appId: mockAppId,
      userId: mockUserId,
    };
    publishPageAction = new PublishPageAction();
    publishPageAction.setContext(mockContext);
  });

  describe("execute", () => {
    it("should throw ActionError when context is not set", async () => {
      const action = new PublishPageAction();
      await expect(action.execute({ ids: ["page-1"] })).rejects.toThrow(ActionError);
      await expect(action.execute({ ids: ["page-1"] })).rejects.toThrow("Context not set");
    });

    it("should validate ids are required", async () => {
        // @ts-ignore
      await expect(publishPageAction.execute({ ids: [] })).rejects.toThrow();
    });

    it("should publish theme correctly", async () => {
      const mockApp = { id: mockAppId, name: "Test App" };

      // Mock db queries
      vi.mocked(db.query.apps.findFirst).mockResolvedValue(mockApp as any);
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.update).mockReturnThis();
      vi.mocked(db.query.appPages.findFirst).mockResolvedValue({} as any);

      const result = await publishPageAction.execute({ ids: ["THEME"] });

      expect(db.query.apps.findFirst).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
      expect(result.tags).toEqual([`website-settings-${mockAppId}`]);
    });

    it("should publish page correctly", async () => {
      const mockPage = { id: "page-1", app: mockAppId, slug: "home", primaryPage: null };

      // Mock db queries
      vi.mocked(db.query.appPages.findFirst).mockResolvedValue(mockPage as any);
      vi.mocked(db.query.appPagesOnline.findFirst).mockResolvedValue(null as any); // No existing online page
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPage])
        })
      } as any);
      vi.mocked(db.update).mockReturnThis();

      const result = await publishPageAction.execute({ ids: ["page-1"] });

      expect(db.query.appPages.findFirst).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(result.tags).toEqual([`page-${mockPage.id}`]);
    });

    it("should create revision if online page exists", async () => {
      const mockPage = { id: "page-1", app: mockAppId, slug: "home", primaryPage: null };
      const mockOnlinePage = { ...mockPage, version: 1 };

      // Mock db queries
      vi.mocked(db.query.appPages.findFirst).mockResolvedValue(mockPage as any);
      vi.mocked(db.query.appPagesOnline.findFirst).mockResolvedValue(mockOnlinePage as any);
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPage])
        })
      } as any);

      await publishPageAction.execute({ ids: ["page-1"] });

      expect(db.insert).toHaveBeenCalledTimes(2); // One for revision, one for online page
    });

    it("should handle mixed theme and page publishing", async () => {
      const mockApp = { id: mockAppId, name: "Test App" };
      const mockPage = { id: "page-1", app: mockAppId, slug: "home", primaryPage: null };

      // Mock db queries
      vi.mocked(db.query.apps.findFirst).mockResolvedValue(mockApp as any);
      vi.mocked(db.query.appPages.findFirst).mockResolvedValue(mockPage as any);
      vi.mocked(db.query.appPagesOnline.findFirst).mockResolvedValue(null as any);
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPage])
        })
      } as any);

      const result = await publishPageAction.execute({ ids: ["THEME", "page-1"] });

      expect(result.tags).toContain(`website-settings-${mockAppId}`);
      expect(result.tags).toContain(`page-${mockPage.id}`);
    });

    it("should throw error if site not found when publishing theme", async () => {
      vi.mocked(db.query.apps.findFirst).mockResolvedValue(null as any);

      await expect(publishPageAction.execute({ ids: ["THEME"] })).rejects.toThrow("Site not found");
    });

    it("should throw error if page not found when publishing page", async () => {
      vi.mocked(db.query.appPages.findFirst).mockResolvedValue(null as any);

      await expect(publishPageAction.execute({ ids: ["page-1"] })).rejects.toThrow("Page not found");
    });
  });
});
