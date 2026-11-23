import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { upsertTaxonomyItems } from '../controllers/hashtagController.js';
import { ALL_OFFICIAL_TAXONOMY_PRESET } from '../utils/sscTaxonomySeed.js';

async function runSeed() {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('Cannot seed official taxonomy without MONGO_URI.');
      process.exit(1);
    }

    const result = await upsertTaxonomyItems(ALL_OFFICIAL_TAXONOMY_PRESET);
    console.log(
      `[seed:ssc] Completed! Created: ${result.createdCount}, Updated: ${result.updatedCount}, Total Topics: ${result.totalProcessed}`
    );
  } catch (err) {
    console.error('[seed:ssc] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

runSeed();
