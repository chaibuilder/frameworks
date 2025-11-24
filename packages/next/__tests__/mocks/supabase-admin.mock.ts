import { vi } from "vitest";

/**
 * Mock response builder for Supabase queries
 */
export class SupabaseMockBuilder {
  private data: any = null;
  private error: any = null;

  static create() {
    return new SupabaseMockBuilder();
  }

  withData(data: any) {
    this.data = data;
    return this;
  }

  withError(error: any) {
    this.error = error;
    return this;
  }

  build() {
    return { data: this.data, error: this.error };
  }
}

/**
 * Create a reusable Supabase Admin mock
 * @param responses - Map of table names to their mock responses
 */
export function createSupabaseAdminMock(responses: Record<string, any> = {}) {
  const createQueryBuilder = (tableName: string) => {
    const state = {
      filters: {} as Record<string, any>,
      selectFields: "*",
      single: false,
      isDelete: false,
    };

    const builder: any = {
      select(fields: string = "*") {
        state.selectFields = fields;
        return builder;
      },

      eq(field: string, value: any) {
        state.filters[field] = value;
        return builder;
      },

      in(field: string, values: any[]) {
        state.filters[`${field}_in`] = values;
        return builder;
      },

      single() {
        state.single = true;
        return builder;
      },

      delete() {
        state.isDelete = true;
        return builder;
      },

      then(resolve: any, reject: any) {
        const tableResponse = responses[tableName];
        
        if (typeof tableResponse === "function") {
          const result = tableResponse(state.filters, state.selectFields, state.single);
          return Promise.resolve(result).then(resolve, reject);
        }

        const defaultResponse = tableResponse || { data: null, error: null };
        return Promise.resolve(defaultResponse).then(resolve, reject);
      },

      catch(reject: any) {
        return builder.then(undefined, reject);
      },
    };

    return builder;
  };

  const mock = {
    from: vi.fn((tableName: string) => createQueryBuilder(tableName)),
  };

  return mock;
}

/**
 * Create a simple Supabase Admin mock with default responses
 */
export function createSimpleSupabaseAdminMock(defaultData: any = null, defaultError: any = null) {
  return createSupabaseAdminMock({
    default: { data: defaultData, error: defaultError },
  });
}

/**
 * Mock the getSupabaseAdmin function
 */
export function mockGetSupabaseAdmin(mockInstance: any) {
  return vi.fn().mockResolvedValue(mockInstance);
}

/**
 * Create a full Supabase Admin mock with custom table handlers
 */
export function createFullSupabaseAdminMock(tableHandlers: Record<string, (filters: any, fields: string, single: boolean) => any>) {
  return createSupabaseAdminMock(tableHandlers);
}
