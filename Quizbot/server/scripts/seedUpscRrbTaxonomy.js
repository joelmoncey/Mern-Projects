import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Hashtag from '../models/Hashtag.js';
import { upsertTaxonomyItems } from '../controllers/hashtagController.js';
import { UPSC_RRB_TAXONOMY_PRESET } from '../utils/sscTaxonomySeed.js';

async function runSeed() {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('Cannot seed UPSC + RRB taxonomy without MONGO_URI.');
      process.exit(1);
    }

    const result = await upsertTaxonomyItems(UPSC_RRB_TAXONOMY_PRESET);
    console.log(
      `[seed:upsc-rrb] Completed! Created: ${result.createdCount}, Updated: ${result.updatedCount}, Total Processed: ${result.totalProcessed}`
    );

    const summary = await Hashtag.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$examName',
          topicCount: { $sum: 1 },
          subExamSets: { $push: '$subExams' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log('[seed:upsc-rrb] Active Exam Taxonomy Summary in MongoDB:');
    for (const row of summary) {
      const uniqueSubExams = Array.from(
        new Set((row.subExamSets || []).flat().filter(Boolean))
      );
      console.log(
        `  - ${row._id}: ${row.topicCount} topics | Sub-Exams (${uniqueSubExams.length}): ${uniqueSubExams.join(', ')}`
      );
    }
  } catch (err) {
    console.error('[seed:upsc-rrb] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

runSeed();
