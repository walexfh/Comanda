import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString ? new Pool({ connectionString }) : null as any;

export const db: NodePgDatabase<typeof schema> = (connectionString 
  ? drizzle(pool, { schema }) 
  : new Proxy({} as any, {
      get() {
        throw new Error("DATABASE_URL must be set. Did you forget to provision a database in your Environment Variables?");
      }
    })) as unknown as NodePgDatabase<typeof schema>;

export * from "./schema";
