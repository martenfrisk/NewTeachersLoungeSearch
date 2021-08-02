import { MongoClient } from 'mongodb'
import { MongoDB, MongoURI } from './Env'

if (!MongoURI) {
  throw new Error(
    'Please define the MongoURI environment variable inside .env.local'
  )
}

if (!MongoDB) {
  throw new Error(
    'Please define the MongoDB environment variable inside .env.local'
  )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached
if (global !== undefined) {
  cached = global?.mongo

  
  if (!cached) {
    cached = global.mongo = { conn: null, promise: null }
  }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }

    // @ts-ignore
    cached.promise = MongoClient.connect(MongoURI, opts).then((client) => {
      return {
        client,
        db: client.db(MongoDB),
      }
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}