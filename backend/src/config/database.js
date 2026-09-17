const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/app/backend/uploads') ? '/app/backend/uploads/data' : path.join(__dirname, '../../data'));
const DB_FILE = path.join(DATA_DIR, 'db_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbMode = 'uninitialized'; // 'mongodb' | 'embedded'

// -------------------------------------------------------------
// Model Schemas untuk Mongoose (BSON)
// -------------------------------------------------------------
const UserAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['administrator', 'fasilitator'], default: 'administrator' },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date, default: Date.now },
  security_logs: [{
    action: String,
    ip: String,
    user_agent: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  session_code: { type: String, default: 'SOS-2026' },
  initial_seeded: { type: Boolean, default: false }
}, { timestamps: true });

const QnaThreadSchema = new mongoose.Schema({
  session_id: { type: String, required: true },
  question: {
    content: { type: String, required: true },
    author: { type: String, default: null },
    is_anon: { type: Boolean, default: false },
    response_type: { type: String, enum: ['free_text', 'structured'], default: 'free_text' },
    fields: [{
      field_id: { type: String, required: true },
      type: { type: String, enum: ['short_text', 'long_text', 'radio', 'checkbox', 'file'], required: true },
      label: { type: String, required: true },
      upload_text: { type: String, default: '' },
      options: [{ type: String }],
      required: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      logic: {
        parent_id: String,
        operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'all_selected', 'filled', 'not_empty', 'empty'] },
        trigger_value: mongoose.Schema.Types.Mixed,
        action: { type: String, enum: ['show', 'hide', 'require', 'skip_to'] }
      }
    }],
    submitted_at: { type: Date, default: Date.now }
  },
  upvotes: [{ type: String }],
  answers: [{
    answer_id: { type: String, default: () => uuidv4() },
    content: { type: String, default: '' }, // Untuk jawaban teks bebas
    structured_answers: [{
      field_id: String,
      value: mongoose.Schema.Types.Mixed,
      file_info: {
        filename: String,
        originalname: String,
        size: Number,
        mimetype: String,
        is_cloud_link: { type: Boolean, default: false },
        url: { type: String, default: '' }
      }
    }],
    answered_by: { type: String, required: true },
    answered_at: { type: Date, default: Date.now },
    is_facilitator: { type: Boolean, default: false }
  }],
  status: { type: String, enum: ['open', 'answered', 'hidden'], default: 'open' }
}, { timestamps: true });

// -------------------------------------------------------------
// Embedded File-Backed Store Fallback (Zero-Config)
// -------------------------------------------------------------
class EmbeddedStore {
  constructor() {
    this.data = {
      users_admin: [],
      sessions: [],
      qna_threads: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.qna_threads) this.data.qna_threads = [];
        if (!this.data.sessions) this.data.sessions = [];
        if (!this.data.users_admin) this.data.users_admin = [];
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('Gagal membaca db_store.json lokal, membuat database baru:', err.message);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Gagal menyimpan db_store.json:', err.message);
    }
  }
}

const embeddedStore = new EmbeddedStore();

class EmbeddedModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  get items() {
    if (!embeddedStore.data[this.collectionName]) {
      embeddedStore.data[this.collectionName] = [];
    }
    return embeddedStore.data[this.collectionName];
  }

  async find(filter = {}) {
    embeddedStore.load();
    return this.items.filter((doc) => this._matches(doc, filter));
  }

  async findOne(filter = {}) {
    embeddedStore.load();
    const doc = this.items.find((doc) => this._matches(doc, filter));
    return doc || null;
  }

  async findById(id) {
    embeddedStore.load();
    const doc = this.items.find((d) => String(d._id) === String(id));
    return doc || null;
  }

  async create(data) {
    embeddedStore.load();
    const doc = {
      _id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    this.items.push(doc);
    embeddedStore.save();
    return doc;
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    embeddedStore.load();
    const idx = this.items.findIndex((d) => String(d._id) === String(id));
    if (idx === -1) return null;

    const current = this.items[idx];
    const updated = {
      ...current,
      ...(update.$set || update),
      updatedAt: new Date().toISOString()
    };

    // Handle $push
    if (update.$push) {
      for (const [key, val] of Object.entries(update.$push)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        updated[key].push(val);
      }
    }

    // Handle $addToSet
    if (update.$addToSet) {
      for (const [key, val] of Object.entries(update.$addToSet)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        if (!updated[key].includes(val)) {
          updated[key].push(val);
        }
      }
    }

    // Handle $pull
    if (update.$pull) {
      for (const [key, val] of Object.entries(update.$pull)) {
        if (Array.isArray(updated[key])) {
          updated[key] = updated[key].filter((item) => item !== val);
        }
      }
    }

    this.items[idx] = updated;
    embeddedStore.save();
    return updated;
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await this.findOne(filter);
    if (!existing) {
      if (options.upsert) {
        return this.create({ ...filter, ...(update.$set || update) });
      }
      return null;
    }
    return this.findByIdAndUpdate(existing._id, update, options);
  }

  async findByIdAndDelete(id) {
    embeddedStore.load();
    const idx = this.items.findIndex((d) => String(d._id) === String(id));
    if (idx === -1) return null;
    const removed = this.items.splice(idx, 1)[0];
    embeddedStore.save();
    return removed;
  }

  async countDocuments(filter = {}) {
    const list = await this.find(filter);
    return list.length;
  }

  _matches(doc, filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.$in && Array.isArray(v.$in)) {
          if (!v.$in.includes(doc[k])) return false;
          continue;
        }
        if (v.$ne !== undefined) {
          if (doc[k] === v.$ne) return false;
          continue;
        }
      }
      if (String(doc[k]) !== String(v)) {
        return false;
      }
    }
    return true;
  }
}

// Model Proxies
const MongooseModels = {
  UserAdmin: mongoose.model('UserAdmin', UserAdminSchema),
  Session: mongoose.model('Session', SessionSchema),
  QnaThread: mongoose.model('QnaThread', QnaThreadSchema)
};

const EmbeddedModels = {
  UserAdmin: new EmbeddedModel('users_admin'),
  Session: new EmbeddedModel('sessions'),
  QnaThread: new EmbeddedModel('qna_threads')
};

// Unified Model Proxy
function createModelProxy(modelName) {
  const dummyFn = function() {};
  return new Proxy(dummyFn, {
    get: (target, prop) => {
      const activeModel = dbMode === 'mongodb' ? MongooseModels[modelName] : EmbeddedModels[modelName];
      const val = activeModel[prop];
      if (typeof val === 'function') {
        return val.bind(activeModel);
      }
      return val;
    },
    construct: (target, args) => {
      const activeModel = dbMode === 'mongodb' ? MongooseModels[modelName] : EmbeddedModels[modelName];
      return new activeModel(...args);
    },
    apply: (target, thisArg, args) => {
      const activeModel = dbMode === 'mongodb' ? MongooseModels[modelName] : EmbeddedModels[modelName];
      return activeModel(...args);
    }
  });
}

const UserAdmin = createModelProxy('UserAdmin');
const Session = createModelProxy('Session');
const QnaThread = createModelProxy('QnaThread');

async function initDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri && mongoUri.trim()) {
    try {
      const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
      console.log(`[Database] Menghubungkan ke MongoDB di ${maskedUri}...`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10
      });
      dbMode = 'mongodb';
      console.log('✅ [Database] Berhasil terhubung ke MongoDB native!');
      return dbMode;
    } catch (err) {
      console.warn('⚠️ [Database] Gagal terhubung ke MongoDB:', err.message);
    }
  }

  // Fallback otomatis ke Embedded Storage
  dbMode = 'embedded';
  console.log(`🚀 [Database] Menggunakan File-Backed Embedded Database (${DB_FILE})`);
  return dbMode;
}

module.exports = {
  initDatabase,
  getDbMode: () => dbMode,
  UserAdmin,
  Session,
  QnaThread
};
