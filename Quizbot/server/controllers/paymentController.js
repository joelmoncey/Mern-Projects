import crypto from 'node:crypto';
import Contribution from '../models/Contribution.js';
import User from '../models/User.js';
import { invalidateLeaderboardCache } from '../utils/cache.js';

export const STAR_TO_INR_RATE = Number(process.env.STAR_TO_INR) || 2;

export const CHAI_TIERS = [
  {
    id: 'cutting_chai',
    emoji: '☕',
    label: '1 Cutting Chai',
    stars: 10,
    cups: 1,
    tagline: 'Quick energy boost for daily quizzes',
  },
  {
    id: 'masala_chai',
    emoji: '🍵',
    label: '2 Masala Chais',
    stars: 25,
    cups: 2,
    tagline: 'Most popular supporter pick',
    popular: true,
  },
  {
    id: 'chai_snacks',
    emoji: '🫖',
    label: 'Chai & Samosa',
    stars: 50,
    cups: 5,
    tagline: 'Helps cover server & database bills',
  },
  {
    id: 'tea_patron',
    emoji: '🌟',
    label: 'Tea Stall Patron',
    stars: 100,
    cups: 10,
    tagline: 'Super supporter for free exam prep',
  },
];

function getBotToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '').trim();
}

async function callTelegramBotApi(method, payload) {
  const botToken = getBotToken();
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured on the server');
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(
      data.description || `Telegram Bot API ${method} failed (${response.status})`
    );
  }
  return data.result;
}

/**
 * Pure helper to calculate INR estimate & normalize contribution request.
 */
export function buildChaiInvoiceSpec({ stars, cupsCount, tierId, note }) {
  const matchedTier = CHAI_TIERS.find((t) => t.id === tierId) || null;
  const parsedStars = Number(
    stars !== undefined ? stars : matchedTier ? matchedTier.stars : 10
  );

  if (!Number.isInteger(parsedStars) || parsedStars < 1 || parsedStars > 2500) {
    return { error: 'Stars amount must be a whole number between 1 and 2500' };
  }

  const parsedCups = Math.max(
    1,
    Math.min(
      500,
      Number.isInteger(Number(cupsCount))
        ? Number(cupsCount)
        : matchedTier
          ? matchedTier.cups
          : Math.max(1, Math.round(parsedStars / 10))
    )
  );

  const approxInr = parsedStars * STAR_TO_INR_RATE;
  const tierLabel = matchedTier
    ? matchedTier.label
    : parsedCups === 1
      ? '1 Cup of Chai'
      : `${parsedCups} Cups of Chai`;

  return {
    stars: parsedStars,
    approxInr,
    cupsCount: parsedCups,
    tierId: matchedTier ? matchedTier.id : 'custom',
    tierLabel,
    note: String(note || '').trim().slice(0, 140),
  };
}

/**
 * GET /api/payments/chai/summary
 * Returns Buy Me a Chai pricing tiers, 1 Star = ₹2 conversion, community totals,
 * recent supporters, and the current user's supporter status.
 */
export async function getChaiSummary(req, res, next) {
  try {
    const [totalsAgg, recentPaid] = await Promise.all([
      Contribution.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: null,
            totalStars: { $sum: '$stars' },
            totalCups: { $sum: '$cupsCount' },
            supporterIds: { $addToSet: '$user' },
          },
        },
      ]),
      Contribution.find({ status: 'paid' })
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(8)
        .populate('user', 'firstName username isSupporter starsContributed')
        .lean(),
    ]);

    const agg = totalsAgg[0] || {};
    const totalStars = agg.totalStars || 0;
    const totalCups = agg.totalCups || 0;
    const totalSupporters = Array.isArray(agg.supporterIds)
      ? agg.supporterIds.length
      : 0;

    return res.status(200).json({
      starToInr: STAR_TO_INR_RATE,
      tiers: CHAI_TIERS.map((tier) => ({
        ...tier,
        approxInr: tier.stars * STAR_TO_INR_RATE,
      })),
      communityStats: {
        totalStars,
        totalApproxInr: totalStars * STAR_TO_INR_RATE,
        totalCups,
        totalSupporters,
      },
      recentSupporters: recentPaid.map((c) => ({
        _id: c._id,
        firstName: c.user?.firstName || 'Aspirant',
        username: c.user?.username || '',
        stars: c.stars,
        approxInr: c.approxInr || c.stars * STAR_TO_INR_RATE,
        cupsCount: c.cupsCount || 1,
        tierLabel: c.tierLabel || 'Buy Me a Chai',
        note: c.note || '',
        paidAt: c.paidAt || c.createdAt,
      })),
      mySupport: req.user
        ? {
            isSupporter: Boolean(req.user.isSupporter),
            starsContributed: req.user.starsContributed || 0,
            approxInr: (req.user.starsContributed || 0) * STAR_TO_INR_RATE,
          }
        : null,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payments/stars/invoice
 * Creates a pending Contribution and returns a native Telegram Stars invoice URL
 * via Bot API `createInvoiceLink` (currency: "XTR", provider_token: "").
 */
export async function createStarsInvoice(req, res, next) {
  try {
    const spec = buildChaiInvoiceSpec(req.body || {});
    if (spec.error) {
      return res.status(400).json({ error: spec.error });
    }

    const payloadId = `chai_${crypto.randomBytes(10).toString('hex')}`;

    const contribution = await Contribution.create({
      user: req.user._id,
      telegramId: req.user.telegramId,
      payloadId,
      stars: spec.stars,
      approxInr: spec.approxInr,
      cupsCount: spec.cupsCount,
      tierId: spec.tierId,
      tierLabel: spec.tierLabel,
      note: spec.note,
      status: 'pending',
    });

    const description = spec.note
      ? `${spec.tierLabel} (${spec.stars} Stars ≈ ₹${spec.approxInr}) · "${spec.note}"`
      : `${spec.tierLabel} (${spec.stars} Stars ≈ ₹${spec.approxInr}) · Keeps Quiz-Gram free & fast for exam aspirants!`;

    let invoiceUrl;
    try {
      invoiceUrl = await callTelegramBotApi('createInvoiceLink', {
        title: 'Buy Quiz-Gram a Chai ☕',
        description: description.slice(0, 255),
        payload: payloadId,
        provider_token: '',
        currency: 'XTR',
        prices: [
          {
            label: `${spec.tierLabel} (1★ = ₹${STAR_TO_INR_RATE})`,
            amount: spec.stars,
          },
        ],
      });
    } catch (tgErr) {
      contribution.status = 'failed';
      await contribution.save().catch(() => {});
      return res.status(502).json({
        error:
          tgErr.message ||
          'Could not create Telegram Stars invoice. Check TELEGRAM_BOT_TOKEN on server.',
      });
    }

    return res.status(201).json({
      invoiceUrl,
      payloadId,
      contributionId: contribution._id,
      stars: spec.stars,
      approxInr: spec.approxInr,
      starToInr: STAR_TO_INR_RATE,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payments/stars/status/:payloadId
 * Lets the Mini App check whether Telegram's webhook has confirmed payment
 * right after `openInvoice` resolves with status === 'paid'.
 */
export async function getStarsPaymentStatus(req, res, next) {
  try {
    const { payloadId } = req.params;
    const contribution = await Contribution.findOne({
      payloadId,
      user: req.user._id,
    }).lean();

    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    const freshUser = await User.findById(req.user._id)
      .select('isSupporter starsContributed supporterSince')
      .lean();

    return res.status(200).json({
      status: contribution.status,
      stars: contribution.stars,
      approxInr: contribution.approxInr,
      paidAt: contribution.paidAt,
      mySupport: {
        isSupporter: Boolean(freshUser?.isSupporter),
        starsContributed: freshUser?.starsContributed || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Marks a pending Contribution as paid atomically & upgrades the User's
 * Supporter badge + total Stars contributed (idempotent against webhook retries).
 */
export async function recordSuccessfulStarsPayment({
  payloadId,
  totalAmount,
  telegramPaymentChargeId = '',
  senderTelegramId = '',
}) {
  const now = new Date();
  const contrib = await Contribution.findOneAndUpdate(
    { payloadId, status: { $ne: 'paid' } },
    {
      $set: {
        status: 'paid',
        telegramPaymentChargeId,
        paidAt: now,
      },
    },
    { new: true }
  );

  if (!contrib) {
    const already = await Contribution.findOne({ payloadId }).lean();
    return { alreadyProcessed: Boolean(already), contribution: already };
  }

  const creditedStars =
    Number.isInteger(totalAmount) && totalAmount > 0
      ? totalAmount
      : contrib.stars;

  const user = await User.findById(contrib.user);
  if (user) {
    user.starsContributed = (user.starsContributed || 0) + creditedStars;
    user.isSupporter = true;
    if (!user.supporterSince) {
      user.supporterSince = now;
    }
    await user.save();
  }

  invalidateLeaderboardCache();

  // Send a warm thank-you message in Telegram chat (best effort)
  const chatId = senderTelegramId || contrib.telegramId;
  if (chatId && getBotToken()) {
    callTelegramBotApi('sendMessage', {
      chat_id: chatId,
      text: `☕ Thank you for buying Quiz-Gram a Chai!\n\nYour ${creditedStars} ⭐ (≈ ₹${creditedStars * STAR_TO_INR_RATE}) contribution is confirmed, and your ☕ Supporter badge is now live on your Profile and the Weekly Leaderboard!`,
    }).catch(() => {});
  }

  return { alreadyProcessed: false, contribution: contrib };
}

/**
 * POST /api/telegram/webhook
 * Handles Telegram Bot API updates for Telegram Stars payments:
 * 1. `pre_checkout_query` -> Must be answered within 10s with `answerPreCheckoutQuery(ok: true)`
 * 2. `message.successful_payment` -> Credits Supporter badge & saves Contribution in MongoDB
 */
export async function handleTelegramWebhook(req, res) {
  try {
    const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    if (expectedSecret) {
      const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (providedSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Invalid webhook secret token' });
      }
    }

    const update = req.body || {};

    // 1. Pre-checkout validation (MUST respond within 10 seconds)
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      const payloadId = String(query.invoice_payload || '').trim();
      const currency = String(query.currency || '').toUpperCase();

      let ok = currency === 'XTR' && payloadId.startsWith('chai_');
      let errorMessage = '';

      if (ok) {
        const contrib = await Contribution.findOne({ payloadId }).lean();
        if (!contrib) {
          ok = false;
          errorMessage = 'Invoice expired or not found. Please try again.';
        } else if (contrib.status === 'paid') {
          ok = false;
          errorMessage = 'This Chai invoice was already paid.';
        }
      } else {
        errorMessage = 'Unsupported currency or invalid invoice payload.';
      }

      await callTelegramBotApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: query.id,
        ok,
        ...(ok ? {} : { error_message: errorMessage }),
      }).catch((err) => {
        console.error('[telegram-webhook] answerPreCheckoutQuery error:', err.message);
      });

      return res.status(200).json({ ok: true });
    }

    // 2. Final confirmed payment
    const payment = update.message?.successful_payment;
    if (payment && String(payment.currency || '').toUpperCase() === 'XTR') {
      const payloadId = String(payment.invoice_payload || '').trim();
      const senderTelegramId = update.message?.from?.id
        ? String(update.message.from.id)
        : '';

      await recordSuccessfulStarsPayment({
        payloadId,
        totalAmount: Number(payment.total_amount),
        telegramPaymentChargeId: String(payment.telegram_payment_charge_id || ''),
        senderTelegramId,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[telegram-webhook] error:', error.message);
    // Always return 200 to Telegram webhook so transient issues don't cause retry storms
    return res.status(200).json({ ok: true });
  }
}
