import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

let clientInstance = null;

function getSupabase() {
  if (!clientInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY ;

    if (!url || !key) {
      // Prevents deployment failure during Firebase CLI analysis
      console.warn("Supabase environment variables missing; using fallback during deployment analysis.");
      return createClient("https://placeholder.supabase.co", "placeholder-key");
    }

    clientInstance = createClient(url, key);
  }
  return clientInstance;
}

// Proxy wrapper keeps default export `supabase.from(...)` working seamlessly across your app
const supabase = new Proxy({}, {
  get(target, prop) {
    const instance = getSupabase();
    return typeof instance[prop] === "function"
      ? instance[prop].bind(instance)
      : instance[prop];
  }
});

export default supabase;