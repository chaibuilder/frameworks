import { apiError } from "../lib";
import { CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";

/**
 * Interface for page tree node
 */
export interface PageTreeNode {
  id: string;
  pageType: string;
  primaryPage: string | null;
  parent: string | null;
  name: string;
  slug: string;
  children: PageTreeNode[];
  languagePages?: PageTreeNode[];
}

/**
 * Interface for page tree result
 */
export interface PageTreeResult {
  primaryTree: PageTreeNode[];
  languageTree: any[];
  totalPrimaryPages: number;
  totalLanguagePages: number;
}

/**
 * Utility class to build page trees from flat page data
 * Supports primary pages, language variants, and partial pages (globals/forms)
 */
export class PageTreeBuilder {
  private supabase: any;
  private appId: string;
  private enableLogging: boolean;

  /**
   * @param supabase - Supabase client instance
   * @param appId - Application ID to filter pages
   * @param enableLogging - Enable console logging for debugging (default: false)
   */
  constructor(supabase: any, appId: string, enableLogging: boolean = false) {
    this.supabase = supabase;
    this.appId = appId;
    this.enableLogging = enableLogging;
  }

  /**
   * Fetch and build complete page trees
   * @returns PageTreeResult containing primary, language, and partial trees
   */
  async getPagesTree(): Promise<PageTreeResult> {
    const { data: pages, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, name , slug, pageType, primaryPage, parent")
      .eq("app", this.appId);

    if (error) {
      throw apiError("ERROR_GETTING_PAGES", error);
    }

    // Separate primary and language pages
    const primaryPages = pages?.filter((page: any) => page.primaryPage === null) || [];
    const languagePages = pages?.filter((page: any) => page.primaryPage !== null) || [];

    // Build Primary Language Pages Tree
    const primaryTree = this.buildPrimaryTree(primaryPages);
    if (this.enableLogging) {
      console.log("\n=== PRIMARY LANGUAGE PAGES TREE ===");
      console.log(JSON.stringify(primaryTree, null, 2));
    }

    // Build Other Language Pages Tree
    const languageTree = this.buildLanguageTree(languagePages, primaryTree);
    if (this.enableLogging) {
      console.log("\n=== OTHER LANGUAGE PAGES TREE ===");
      console.log(JSON.stringify(languageTree, null, 2));
    }

    return {
      primaryTree,
      languageTree,
      totalPrimaryPages: primaryPages.length,
      totalLanguagePages: languagePages.length,
    };
  }

  /**
   * Build a hierarchical tree structure from primary pages
   * @param pages - Array of primary page objects
   * @returns Array of root PageTreeNode objects
   */
  buildPrimaryTree(pages: any[]): PageTreeNode[] {
    const pageMap = new Map<string, PageTreeNode>();

    // Create nodes for all pages
    pages.forEach((page) => {
      pageMap.set(page.id, {
        id: page.id,
        pageType: page.pageType,
        primaryPage: page.primaryPage,
        parent: page.parent,
        name: page.name,
        slug: page.slug,
        children: [],
      });
    });

    const rootNodes: PageTreeNode[] = [];

    // Build parent-child relationships
    pages.forEach((page) => {
      const node = pageMap.get(page.id);
      if (!node) return;

      if (page.parent === null) {
        // This is a root node
        rootNodes.push(node);
      } else {
        // This is a child node
        const parentNode = pageMap.get(page.parent);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  /**
   * Build a language pages tree based on the primary tree structure
   * @param languagePages - Array of language page objects
   * @param primaryTree - The primary pages tree
   * @returns Array of language page tree nodes
   */
  buildLanguageTree(languagePages: any[], primaryTree: PageTreeNode[]): any[] {
    // Group language pages by their primaryPage
    const languagePagesByPrimary = new Map<string, any[]>();

    languagePages.forEach((langPage) => {
      const primaryId = langPage.primaryPage;
      if (!languagePagesByPrimary.has(primaryId)) {
        languagePagesByPrimary.set(primaryId, []);
      }
      languagePagesByPrimary.get(primaryId)!.push(langPage);
    });

    // Build language tree based on primary tree structure
    const buildLanguageSubtree = (primaryNode: PageTreeNode): any[] => {
      const languagePagesForThisPrimary = languagePagesByPrimary.get(primaryNode.id) || [];

      return languagePagesForThisPrimary.map((langPage) => {
        const langNode: any = {
          id: langPage.id,
          pageType: langPage.pageType,
          primaryPage: langPage.primaryPage,
          parent: langPage.parent,
          name: langPage.name,
          slug: langPage.slug,
          children: [],
        };

        // For each child in the primary tree, find corresponding language pages
        primaryNode.children.forEach((primaryChild) => {
          const childLanguagePages = buildLanguageSubtree(primaryChild);
          langNode.children.push(...childLanguagePages);
        });

        return langNode;
      });
    };

    // Build the complete language tree
    const languageTree: any[] = [];
    primaryTree.forEach((primaryRoot) => {
      const languageVariants = buildLanguageSubtree(primaryRoot);
      languageTree.push(...languageVariants);
    });

    return languageTree;
  }

  /**
   * Find a page in the primary tree by ID
   * @param id - Page ID to search for
   * @param primaryTree - The primary pages tree to search in
   * @returns PageTreeNode if found, null otherwise
   */
  findPageInPrimaryTree(id: string, primaryTree: PageTreeNode[]): PageTreeNode | null {
    for (const node of primaryTree) {
      if (node.id === id) {
        return node;
      }
      // Search in children recursively
      if (node.children && node.children.length > 0) {
        const found = this.findPageInPrimaryTree(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Find a page in the language tree by ID
   * @param id - Page ID to search for
   * @param languageTree - The language pages tree to search in
   * @returns Language page node if found, null otherwise
   */
  findPageInLanguageTree(id: string, languageTree: any[]): any | null {
    for (const node of languageTree) {
      if (node.id === id) {
        return node;
      }
      // Search in children recursively
      if (node.children && node.children.length > 0) {
        const found = this.findPageInLanguageTree(id, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Collect all nested child IDs from a tree node
   * @param node - The node to collect children from
   * @returns Array of child IDs
   */
  collectNestedChildIds(node: PageTreeNode): string[] {
    const ids: string[] = [];

    for (const child of node.children) {
      ids.push(child.id);
      // Recursively collect from nested children
      const nestedIds = this.collectNestedChildIds(child);
      ids.push(...nestedIds);
    }

    return ids;
  }

  /**
   * Find all language pages for a given primary page ID
   * @param primaryPageId - Primary page ID to find variants for
   * @param languageTree - The language pages tree to search in
   * @returns Array of language page nodes
   */
  findLanguagePagesForPrimary(primaryPageId: string, languageTree: any[]): any[] {
    return languageTree.filter((langNode) => langNode.primaryPage === primaryPageId);
  }

  /**
   * Collect all nested language page IDs recursively
   * @param langNode - Language page node to collect children from
   * @returns Array of nested language page IDs
   */
  collectNestedLanguageIds(langNode: any): string[] {
    const ids: string[] = [];

    for (const child of langNode.children || []) {
      ids.push(child.id);
      // Recursively collect from nested children
      const nestedIds = this.collectNestedLanguageIds(child);
      ids.push(...nestedIds);
    }

    return ids;
  }
}
