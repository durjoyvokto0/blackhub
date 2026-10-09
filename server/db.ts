import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Uploads directories for videos and thumbnails
export const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
export const VIDEOS_DIR = path.resolve(UPLOADS_DIR, 'videos');
export const THUMBNAILS_DIR = path.resolve(UPLOADS_DIR, 'thumbnails');

[UPLOADS_DIR, VIDEOS_DIR, THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Single PGlite instance for persistent PostgreSQL database
export const pg = new PGlite(path.join(DATA_DIR, 'blackhub.db'));

export async function initDatabase() {
  console.log('[Database] Initializing PostgreSQL schema with PGlite...');

  // Create tables according to Section 22 specification
  await pg.exec(`
    -- Roles table
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Permissions table
    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );

    -- Role permissions mapping
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Registered User',
      is_email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
      force_password_change BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      display_name VARCHAR(100),
      avatar_url TEXT,
      bio TEXT,
      subscribers_count INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User roles table
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id)
    );

    -- Admin recovery settings table
    CREATE TABLE IF NOT EXISTS admin_recovery_settings (
      id SERIAL PRIMARY KEY,
      admin_user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      recovery_email VARCHAR(255),
      is_recovery_email_verified BOOLEAN DEFAULT FALSE,
      recovery_token VARCHAR(255),
      recovery_token_expires_at TIMESTAMP,
      mfa_enabled BOOLEAN DEFAULT FALSE,
      mfa_secret VARCHAR(255),
      backup_codes TEXT, -- JSON array of hashed single-use codes
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(100) PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(45),
      user_agent TEXT,
      is_revoked BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Video categories table
    CREATE TABLE IF NOT EXISTS video_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Videos table
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES video_categories(id) ON DELETE SET NULL,
      thumbnail_url TEXT,
      video_url TEXT NOT NULL,
      duration INTEGER DEFAULT 0, -- in seconds
      access_level VARCHAR(20) DEFAULT 'free', -- 'free' or 'premium'
      status VARCHAR(30) DEFAULT 'published', -- draft, uploading, processing, pending_review, published, rejected, removed
      views_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Video tags table
    CREATE TABLE IF NOT EXISTS video_tags (
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      tag VARCHAR(50) NOT NULL
    );

    -- Source files table (for private object storage & admin original downloads)
    CREATE TABLE IF NOT EXISTS source_files (
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      original_filename VARCHAR(255) NOT NULL,
      storage_path TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_format VARCHAR(20) NOT NULL,
      checksum_sha256 VARCHAR(64),
      processing_status VARCHAR(50) DEFAULT 'ready', -- pending, processing, ready, failed
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Upload jobs table
    CREATE TABLE IF NOT EXISTS upload_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      progress INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'completed', -- queued, processing, completed, failed
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Moderation actions table
    CREATE TABLE IF NOT EXISTS moderation_actions (
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      moderator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL, -- approved, rejected, suspended_user, banned_user, removed_video
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Content reports table
    CREATE TABLE IF NOT EXISTS content_reports (
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      reporter_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reporter_email VARCHAR(255),
      reason VARCHAR(100) NOT NULL,
      details TEXT,
      status VARCHAR(30) DEFAULT 'pending', -- pending, reviewed, dismissed, resolved
      resolution_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Membership plans table (4 plans: 1, 3, 6, 12 months)
    CREATE TABLE IF NOT EXISTS membership_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      duration_months INTEGER NOT NULL,
      price_usd DECIMAL(10, 2) NOT NULL,
      price_crypto DECIMAL(18, 8) NOT NULL,
      crypto_symbol VARCHAR(20) NOT NULL DEFAULT 'USDT',
      is_active BOOLEAN DEFAULT TRUE,
      features TEXT, -- JSON array of features
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES membership_plans(id),
      status VARCHAR(30) DEFAULT 'active', -- active, expired, canceled, complimentary
      starts_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      payment_order_id INTEGER,
      granted_by_admin_id INTEGER,
      grant_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Crypto payment settings table
    CREATE TABLE IF NOT EXISTS crypto_payment_settings (
      id SERIAL PRIMARY KEY,
      is_enabled BOOLEAN DEFAULT TRUE,
      asset_symbol VARCHAR(20) NOT NULL DEFAULT 'USDT',
      network VARCHAR(50) NOT NULL DEFAULT 'TRC20',
      receiving_address VARCHAR(255) NOT NULL,
      accepted_currencies TEXT, -- JSON array of accepted assets
      required_confirmations INTEGER DEFAULT 2,
      verification_mode VARCHAR(20) DEFAULT 'auto', -- 'auto' or 'manual'
      payment_instructions TEXT,
      card_payments_enabled BOOLEAN DEFAULT FALSE, -- strictly disabled per requirements
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Payment orders table
    CREATE TABLE IF NOT EXISTS payment_orders (
      id SERIAL PRIMARY KEY,
      order_reference VARCHAR(50) UNIQUE NOT NULL, -- e.g. BH-2026-00051
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES membership_plans(id),
      amount_usd DECIMAL(10, 2) NOT NULL,
      amount_crypto DECIMAL(18, 8) NOT NULL,
      asset_symbol VARCHAR(20) NOT NULL,
      network VARCHAR(50) NOT NULL,
      receiving_address VARCHAR(255) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending', -- pending, under_verification, confirmed, rejected, expired
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Payment transactions table (with UNIQUE constraint on transaction_hash)
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id SERIAL PRIMARY KEY,
      payment_order_id INTEGER REFERENCES payment_orders(id) ON DELETE CASCADE,
      transaction_hash VARCHAR(255) UNIQUE NOT NULL, -- UNIQUE to prevent replay attacks!
      sender_address VARCHAR(255),
      received_amount DECIMAL(18, 8) NOT NULL,
      confirmations INTEGER DEFAULT 0,
      verification_source VARCHAR(50) DEFAULT 'blockchain_api', -- blockchain_api, admin_manual
      status VARCHAR(30) DEFAULT 'pending', -- pending, verified, rejected
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Payment verification logs table
    CREATE TABLE IF NOT EXISTS payment_verification_logs (
      id SERIAL PRIMARY KEY,
      payment_order_id INTEGER REFERENCES payment_orders(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL, -- auto_verified, manual_approved, manual_rejected
      reason TEXT,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin audit logs table
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_username VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50), -- user, video, payment, settings, plan
      target_id VARCHAR(50),
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info', -- info, success, warning, billing, security
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Video likes table
    CREATE TABLE IF NOT EXISTS video_likes (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, video_id)
    );

    -- Saved / favorite videos table
    CREATE TABLE IF NOT EXISTS saved_videos (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, video_id)
    );

    -- Watch history table
    CREATE TABLE IF NOT EXISTS watch_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      progress_seconds INTEGER DEFAULT 0,
      watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Comments table
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Rate limiting table for login security
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(100) NOT NULL, -- IP or username
      attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT FALSE
    );
  `);

  console.log('[Database] Schema created successfully. Seeding initial records...');
  await pg.query('DELETE FROM login_attempts');
  await seedDatabase();
}

async function seedDatabase() {
  // Check if roles exist
  const rolesCheck = await pg.query('SELECT COUNT(*) as count FROM roles');
  if (parseInt((rolesCheck.rows[0] as any).count) === 0) {
    await pg.query(`
      INSERT INTO roles (name, description) VALUES
      ('Visitor', 'Unauthenticated public visitor'),
      ('Registered User', 'Standard registered user with free video access'),
      ('Creator', 'Registered creator eligible for video uploads'),
      ('Premium Subscriber', 'Subscribed user with ad-free experience and premium video access'),
      ('Administrator', 'Platform administrator with management dashboard access');
    `);
  }

  // Check if initial administrator 'black999' exists
  const adminPasswordHash = await bcrypt.hash('Vokda@@99', 10);
  const adminCheck = await pg.query("SELECT id FROM users WHERE username = 'black999'");
  if (adminCheck.rows.length === 0) {
    const adminInsert = await pg.query(`
      INSERT INTO users (username, email, password_hash, role, is_email_verified, force_password_change)
      VALUES ('black999', 'admin@blackhub.internal', $1, 'Administrator', TRUE, FALSE)
      RETURNING id
    `, [adminPasswordHash]);

    const adminId = (adminInsert.rows[0] as any).id;

    await pg.query(`
      INSERT INTO user_profiles (user_id, display_name, bio)
      VALUES ($1, 'BlackHub Admin', 'Official System Administrator')
    `, [adminId]);

    // Admin recovery settings
    await pg.query(`
      INSERT INTO admin_recovery_settings (admin_user_id, recovery_email, is_recovery_email_verified, mfa_enabled)
      VALUES ($1, 'security@blackhub.internal', TRUE, FALSE)
    `, [adminId]);

    console.log('[Database] Seeded initial administrator: username="black999", password="Vokda@@99"');
  } else {
    // Ensure administrator password is set to Vokda@@99
    await pg.query(`
      UPDATE users 
      SET password_hash = $1, force_password_change = FALSE 
      WHERE username = 'black999'
    `, [adminPasswordHash]);
    console.log('[Database] Updated administrator "black999" password to "Vokda@@99"');
  }

  // Seed standard demo user & creator if not existing
  const demoUserCheck = await pg.query("SELECT id FROM users WHERE username = 'demouser'");
  if (demoUserCheck.rows.length === 0) {
    const demoPw = await bcrypt.hash('DemoPass123!', 10);
    const demoUser = await pg.query(`
      INSERT INTO users (username, email, password_hash, role, is_email_verified, force_password_change)
      VALUES ('demouser', 'user@blackhub.io', $1, 'Registered User', TRUE, FALSE)
      RETURNING id
    `, [demoPw]);
    await pg.query(`
      INSERT INTO user_profiles (user_id, display_name, bio)
      VALUES ($1, 'Alex Mercer', 'Tech and cinema enthusiast.')
    `, [(demoUser.rows[0] as any).id]);
  }

  const creatorCheck = await pg.query("SELECT id FROM users WHERE username = 'blackhub_studios'");
  let creatorId = 1;
  if (creatorCheck.rows.length === 0) {
    const creatorPw = await bcrypt.hash('CreatorPass123!', 10);
    const creator = await pg.query(`
      INSERT INTO users (username, email, password_hash, role, is_email_verified, force_password_change)
      VALUES ('blackhub_studios', 'studios@blackhub.io', $1, 'Creator', TRUE, FALSE)
      RETURNING id
    `, [creatorPw]);
    creatorId = (creator.rows[0] as any).id;
    await pg.query(`
      INSERT INTO user_profiles (user_id, display_name, bio, subscribers_count)
      VALUES ($1, 'BlackHub Originals', 'Premier 4K cinematic studio and original releases.', 142000)
    `, [creatorId]);
  } else {
    creatorId = (creatorCheck.rows[0] as any).id;
  }

  // Seed Membership Plans (Section 5: 1 month, 3 months, 6 months, 12 months)
  const plansCheck = await pg.query('SELECT COUNT(*) as count FROM membership_plans');
  if (parseInt((plansCheck.rows[0] as any).count) === 0) {
    await pg.query(`
      INSERT INTO membership_plans (name, duration_months, price_usd, price_crypto, crypto_symbol, features) VALUES
      ('Monthly Pass', 1, 14.99, 14.99, 'USDT', '["30 Days Unlimited Access", "100% Ad-Free Browsing & Streaming", "Access to All Premium 4K Videos", "High-Speed Streaming Servers", "Mobile, Tablet & Desktop Access"]'),
      ('Quarterly Pass', 3, 39.99, 39.99, 'USDT', '["90 Days Unlimited Access", "100% Ad-Free Browsing & Streaming", "Access to All Premium 4K Videos", "High-Speed Streaming Servers", "11% Savings Compared to Monthly", "VIP Member Badge"]'),
      ('Semiannual Pass', 6, 69.99, 69.99, 'USDT', '["180 Days Unlimited Access", "100% Ad-Free Browsing & Streaming", "Access to All Premium 4K Videos", "Priority VIP Streaming", "22% Savings Compared to Monthly", "Exclusive Early Releases"]'),
      ('Annual VIP Pass', 12, 119.99, 119.99, 'USDT', '["365 Days Unlimited Access", "100% Ad-Free Browsing & Streaming", "All Premium & Ultra 4K Content", "Original Source File Download Access", "33% Savings Compared to Monthly", "Exclusive VIP Gold Profile Badge", "Priority Customer Support"]');
    `);
    console.log('[Database] Seeded 4 membership plans (1, 3, 6, 12 months)');
  }

  // Seed Crypto Payment Settings (Section 14 & 15: Crypto only, card payments disabled)
  const cryptoSettingsCheck = await pg.query('SELECT COUNT(*) as count FROM crypto_payment_settings');
  if (parseInt((cryptoSettingsCheck.rows[0] as any).count) === 0) {
    await pg.query(`
      INSERT INTO crypto_payment_settings (
        is_enabled, asset_symbol, network, receiving_address,
        accepted_currencies, required_confirmations, verification_mode,
        payment_instructions, card_payments_enabled
      ) VALUES (
        TRUE, 'USDT', 'TRC20', 'TYDzpSLJgQW72m2a4x1G8bN5qVzXw9K3Rp',
        '["USDT (TRC20)", "USDT (ERC20)", "BTC (Bitcoin)", "ETH (Ethereum)", "LTC (Litecoin)"]',
        2, 'auto',
        'Send the exact amount to the provided receiving address using the specified network. Submitting the Transaction Hash will immediately initiate verification.',
        FALSE
      );
    `);
    console.log('[Database] Seeded crypto payment settings');
  }

  // Seed Video Categories
  const catCheck = await pg.query('SELECT COUNT(*) as count FROM video_categories');
  if (parseInt((catCheck.rows[0] as any).count) === 0) {
    await pg.query(`
      INSERT INTO video_categories (name, slug, description, icon) VALUES
      ('Trending & Cinema', 'cinema', 'High production blockbuster cinema and featured films', 'Film'),
      ('Action & Sci-Fi', 'action-scifi', 'High-adrenaline action sequences and futuristic visual effects', 'Zap'),
      ('Tech & Innovation', 'tech', 'Deep dives into engineering, cyber security, and tech art', 'Cpu'),
      ('Documentary', 'documentary', 'In-depth real-world investigations and nature epics', 'Globe'),
      ('Ultra 4K Showcase', '4k-ultra', 'Crystal clear 60FPS high dynamic range visual mastery', 'Eye'),
      ('Animation & CGI', 'animation', 'Spectacular animated shorts and 3D modeling showcases', 'Sparkles'),
      ('Gaming & Esports', 'gaming', 'Competitive tournaments and next-gen game cinematic reels', 'Gamepad2'),
      ('Music & Soundscapes', 'music', 'Original music scores, live acoustics, and dark electronic sets', 'Music');
    `);
  }

  // Seed Sample Videos (both Free and Premium) with reliable streaming sources
  const videoCheck = await pg.query('SELECT COUNT(*) as count FROM videos');
  if (parseInt((videoCheck.rows[0] as any).count) === 0) {
    const categories = await pg.query('SELECT id, slug FROM video_categories');
    const catMap: Record<string, number> = {};
    categories.rows.forEach((r: any) => {
      catMap[r.slug] = r.id;
    });

    const sampleVideos = [
      {
        title: 'Cyberpunk Noir: Midnight Neon Infiltration',
        slug: 'cyberpunk-noir-midnight-neon',
        description: 'An operative navigates rain-slicked mega-towers in a heavily guarded sector. Ultra-high definition dark cinematic composition with pulsating synth score.',
        category_id: catMap['action-scifi'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        duration: 734,
        access_level: 'free',
        views_count: 84210,
        likes_count: 5120,
        tags: ['Cyberpunk', 'Cinematic', 'Neon', 'Action']
      },
      {
        title: 'Deep Obsidian: 4K HDR Quantum Architecture',
        slug: 'deep-obsidian-quantum-architecture',
        description: 'EXCLUSIVE PREMIUM RELEASE. A visual journey into brutalist monochrome architecture, obsidian reflections, and atmospheric sound design.',
        category_id: catMap['4k-ultra'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: 596,
        access_level: 'premium',
        views_count: 142050,
        likes_count: 11400,
        tags: ['Premium', '4K', 'Architecture', 'VisualArt']
      },
      {
        title: 'The Neural Grid: Autonomous Robotics Showcase',
        slug: 'the-neural-grid-autonomous-robotics',
        description: 'Inside the secret labs building next-generation bipedal robotics and neural network locomotion in zero-tolerance environments.',
        category_id: catMap['tech'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        duration: 653,
        access_level: 'free',
        views_count: 67800,
        likes_count: 4210,
        tags: ['Robotics', 'AI', 'Technology', 'Future']
      },
      {
        title: 'Crimson Horizon: Interstellar Colony Origins',
        slug: 'crimson-horizon-interstellar-colony',
        description: 'EXCLUSIVE PREMIUM RELEASE. The flagship sci-fi feature depicting the perilous founding of outpost Alpha on the crimson surface of Kepler-452b.',
        category_id: catMap['cinema'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        duration: 888,
        access_level: 'premium',
        views_count: 198300,
        likes_count: 16800,
        tags: ['Premium', 'Space', 'SciFi', 'Cinema']
      },
      {
        title: 'Shadow Symphony: Dark Minimalist Modular Synth',
        slug: 'shadow-symphony-modular-synth',
        description: 'A 45-minute live studio capture of analog voltage-controlled synthesizers, heavy sub-bass waves, and hypnotic oscilloscope waveforms.',
        category_id: catMap['music'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
        duration: 940,
        access_level: 'free',
        views_count: 32400,
        likes_count: 2890,
        tags: ['Synth', 'Soundtrack', 'DarkWave', 'Music']
      },
      {
        title: 'Apex Dynasty: Championship Grand Finals 2026',
        slug: 'apex-dynasty-grand-finals-2026',
        description: 'The definitive recap and breakdown of the final championship series with hyper-motion replays, audio comms, and victory moments.',
        category_id: catMap['gaming'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        duration: 480,
        access_level: 'free',
        views_count: 91200,
        likes_count: 7600,
        tags: ['Esports', 'Gaming', 'Tournament', 'Pro']
      },
      {
        title: 'Black Ice Protocol: High-Speed Hypercar Aerodynamics',
        slug: 'black-ice-protocol-hypercar',
        description: 'EXCLUSIVE PREMIUM RELEASE. Precision wind-tunnel testing, active carbon aero blades, and telemetry diagnostics of the 1,800hp prototype.',
        category_id: catMap['4k-ultra'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 410,
        access_level: 'premium',
        views_count: 125400,
        likes_count: 9800,
        tags: ['Premium', 'Hypercar', 'Engineering', 'Speed']
      },
      {
        title: 'Monolith: The Hidden Monasteries of the Caucasus',
        slug: 'monolith-monasteries-caucasus',
        description: 'A quiet exploration of mountain stone sanctuaries perched thousands of meters above cloud inversions. Mastered in 4K with natural ambisonic sound.',
        category_id: catMap['documentary'] || 1,
        thumbnail_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        duration: 820,
        access_level: 'free',
        views_count: 53100,
        likes_count: 4120,
        tags: ['Documentary', 'Mountains', 'Nature', 'Travel']
      }
    ];

    for (const v of sampleVideos) {
      const vResult = await pg.query(`
        INSERT INTO videos (title, slug, description, creator_id, category_id, thumbnail_url, video_url, duration, access_level, status, views_count, likes_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', $10, $11)
        RETURNING id
      `, [v.title, v.slug, v.description, creatorId, v.category_id, v.thumbnail_url, v.video_url, v.duration, v.access_level, v.views_count, v.likes_count]);

      const vidId = (vResult.rows[0] as any).id;

      // Seed tags
      for (const t of v.tags) {
        await pg.query('INSERT INTO video_tags (video_id, tag) VALUES ($1, $2)', [vidId, t]);
      }

      // Seed source files (Section 13: Administrator can download original source files)
      await pg.query(`
        INSERT INTO source_files (video_id, original_filename, storage_path, file_size, mime_type, file_format, checksum_sha256, processing_status, uploaded_by)
        VALUES ($1, $2, $3, $4, 'video/mp4', 'mp4', $5, 'ready', $6)
      `, [
        vidId,
        `${v.slug}_master_raw.mp4`,
        v.video_url,
        145892010 + (vidId * 25410000),
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        creatorId
      ]);
    }

    console.log('[Database] Seeded 8 sample videos with tags and source file references');
  }
}
