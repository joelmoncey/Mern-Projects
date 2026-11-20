import mongoose from 'mongoose';

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getDbStatus() {
  return READY_STATE_LABELS[mongoose.connection.readyState] || 'unknown';
}

/**
 * Fallback resolver for mongodb+srv:// URIs when Node's local c-ares DNS
 * refuses SRV queries on Windows. Uses Google DNS-over-HTTPS to expand the
 * SRV and TXT records into a standard mongodb:// seedlist URI.
 */
async function resolveSrvUriViaDoH(srvUri) {
  const parsed = new URL(srvUri);
  const host = parsed.hostname;

  const [srvRes, txtRes] = await Promise.all([
    fetch(`https://dns.google/resolve?name=_mongodb._tcp.${host}&type=SRV`),
    fetch(`https://dns.google/resolve?name=${host}&type=TXT`),
  ]);

  if (!srvRes.ok) {
    throw new Error(`DoH SRV lookup failed with HTTP ${srvRes.status}`);
  }

  const srvJson = await srvRes.json();
  const srvAnswers = (srvJson.Answer || [])
    .filter((a) => a.type === 33 && typeof a.data === 'string')
    .map((a) => {
      const parts = a.data.trim().split(/\s+/);
      const port = parts[2] || '27017';
      const target = (parts[3] || '').replace(/\.$/, '');
      return `${target}:${port}`;
    })
    .filter(Boolean);

  if (srvAnswers.length === 0) {
    throw new Error(`No SRV records found for ${host}`);
  }

  const params = new URLSearchParams(parsed.search);
  if (!params.has('tls') && !params.has('ssl')) {
    params.set('tls', 'true');
  }

  if (txtRes.ok) {
    const txtJson = await txtRes.json();
    const txtRecord = (txtJson.Answer || [])
      .filter((a) => a.type === 16 && typeof a.data === 'string')
      .map((a) => a.data.replace(/^"|"$/g, ''))
      .join('');

    if (txtRecord) {
      for (const [k, v] of new URLSearchParams(txtRecord).entries()) {
        if (!params.has(k)) {
          params.set(k, v);
        }
      }
    }
  }

  const auth =
    parsed.username || parsed.password
      ? `${parsed.username}:${parsed.password}@`
      : '';
  const dbPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/quiz-gram';

  return `mongodb://${auth}${srvAnswers.join(',')}${dbPath}?${params.toString()}`;
}

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      '[db] MONGO_URI is not set. Running without a MongoDB connection.'
    );
    return null;
  }

  const connectOptions = {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 8000,
  };

  try {
    const conn = await mongoose.connect(uri, connectOptions);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (
      uri.startsWith('mongodb+srv://') &&
      /querySrv|ESERVFAIL|ECONNREFUSED|ENOTFOUND/i.test(error.message)
    ) {
      console.warn(
        '[db] Local DNS SRV lookup failed; retrying via DNS-over-HTTPS seedlist...'
      );
      const standardUri = await resolveSrvUriViaDoH(uri);
      const conn = await mongoose.connect(standardUri, connectOptions);
      console.log(`[db] MongoDB connected: ${conn.connection.host}`);
      return conn;
    }

    console.error(`[db] MongoDB connection failed: ${error.message}`);
    throw error;
  }
}
