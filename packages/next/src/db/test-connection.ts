import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Test Drizzle ORM database connection
 * This script verifies that the database connection is working properly
 */
async function testConnection() {
  // Use the connection string directly
  const connectionString = process.env.DATABASE_URL || 
    "postgresql://postgres.tsudpsotygrakdaqaals:PBmwM864zVU7I7pI@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
  
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    console.log("🔄 Testing Drizzle ORM connection...");
    
    // Test 1: Basic connection test
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log("✅ Database connection successful!");
    console.log("📅 Current database time:", result[0]);

    // Test 2: Check if we can query tables
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log("\n📊 Available tables in database:");
    tablesResult.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // Test 3: Query app_users table
    try {
      const usersCount = await db.execute(sql`SELECT COUNT(*) as count FROM app_users`);
      console.log(`\n📈 app_users table: ${usersCount[0]?.count || 0} records`);
      
      const users = await db.execute(sql`SELECT * FROM app_users LIMIT 5`);
      if (users.length > 0) {
        console.log("\n👥 Sample app_users:");
        users.forEach((user: any) => {
          console.log(`  - ID: ${user.id}, Created: ${user.createdAt}`);
        });
      } else {
        console.log("  (No users found - table is empty)");
      }

      const appsCount = await db.execute(sql`SELECT COUNT(*) as count FROM apps`);
      console.log(`\n📈 apps table: ${appsCount[0]?.count || 0} records`);
      
      const pagesCount = await db.execute(sql`SELECT COUNT(*) as count FROM app_pages`);
      console.log(`📈 app_pages table: ${pagesCount[0]?.count || 0} records`);
    } catch (error) {
      console.log("\n⚠️  Note: Some tables might not exist yet. Run migrations first.");
    }

    console.log("\n✨ All connection tests passed!");
    
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("Error details:", error);
    process.exit(1);
  } finally {
    // Close the connection
    await client.end();
    console.log("\n🔌 Connection closed.");
  }
}

// Run the test
testConnection();
