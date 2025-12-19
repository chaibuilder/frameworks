import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../../../server/db";
import { getSupabaseAdmin } from "../../../supabase";
import { CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";
import { apiError } from "../lib";
import { BaseAction } from "./base-action";

interface BenchmarkResult {
  supabase: {
    duration: number;
    rowCount: number;
  };
  drizzle: {
    duration: number;
    rowCount: number;
  };
  iterations: number;
  winner: "supabase" | "drizzle" | "tie";
  diffMs: number;
  percentageFaster: number;
}

type BenchmarkQueryActionData = {
  iterations?: number;
};

export class BenchmarkQueryAction extends BaseAction<BenchmarkQueryActionData, BenchmarkResult> {
  protected getValidationSchema() {
    return z.object({
      iterations: z.number().min(1).max(100).optional().default(10),
    });
  }

  async execute(data: BenchmarkQueryActionData): Promise<BenchmarkResult> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const iterations = data?.iterations ?? 10;

    // Warm up both connections
    await this.runSupabaseQuery(appId);
    await this.runDrizzleQuery(appId);

    // Benchmark Supabase
    const supabaseTimes: number[] = [];
    let supabaseRowCount = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = await this.runSupabaseQuery(appId);
      const end = performance.now();
      supabaseTimes.push(end - start);
      supabaseRowCount = result.length;
    }

    // Benchmark Drizzle
    const drizzleTimes: number[] = [];
    let drizzleRowCount = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = await this.runDrizzleQuery(appId);
      const end = performance.now();
      drizzleTimes.push(end - start);
      drizzleRowCount = result.length;
    }

    const supabaseAvg = supabaseTimes.reduce((a, b) => a + b, 0) / iterations;
    const drizzleAvg = drizzleTimes.reduce((a, b) => a + b, 0) / iterations;

    const winner = supabaseAvg < drizzleAvg ? "supabase" : drizzleAvg < supabaseAvg ? "drizzle" : "tie";
    const diffMs = Math.abs(supabaseAvg - drizzleAvg);
    const faster = Math.min(supabaseAvg, drizzleAvg);
    const slower = Math.max(supabaseAvg, drizzleAvg);
    const percentageFaster = slower > 0 ? ((slower - faster) / slower) * 100 : 0;

    return {
      supabase: {
        duration: Math.round(supabaseAvg * 100) / 100,
        rowCount: supabaseRowCount,
      },
      drizzle: {
        duration: Math.round(drizzleAvg * 100) / 100,
        rowCount: drizzleRowCount,
      },
      iterations,
      winner,
      diffMs: Math.round(diffMs * 100) / 100,
      percentageFaster: Math.round(percentageFaster * 100) / 100,
    };
  }

  private async runSupabaseQuery(appId: string) {
    const supabase = await getSupabaseAdmin();
    const { data } = await supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, designTokens, name, slug, blocks, links, partialBlocks")
      .eq("lang", "")
      .eq("app", appId);
    return data ?? [];
  }

  private async runDrizzleQuery(appId: string) {
    return db
      .select({
        id: schema.appPages.id,
        designTokens: schema.appPages.designTokens,
        name: schema.appPages.name,
        slug: schema.appPages.slug,
        links: schema.appPages.links,
        blocks: schema.appPages.blocks,
        partialBlocks: schema.appPages.partialBlocks,
      })
      .from(schema.appPages)
      .where(and(eq(schema.appPages.lang, ""), eq(schema.appPages.app, appId)));
  }
}
