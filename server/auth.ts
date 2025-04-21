import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import { db } from './db';
import { users, type User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Hash password using scrypt
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

// Compare password with hash
async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [hash, salt] = stored.split('.');
    const hashBuffer = Buffer.from(hash, 'hex');
    
    crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(hashBuffer, derivedKey));
    });
  });
}

export function setupAuth(app: Express) {
  // Create database session store
  const PgStore = connectPgSimple(session);
  const sessionStore = new PgStore({
    pool,
    createTableIfMissing: true,
  });

  // Configure session middleware
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'writing-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    }
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Find user in database
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      // Check password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register user
  app.post('/api/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if username exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, req.body.username));
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Create user
      const [user] = await db.insert(users).values({
        username: req.body.username,
        email: req.body.email || null,
        password: hashedPassword,
        fullName: req.body.fullName || null,
      }).returning();

      // Log user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (err) {
      next(err);
    }
  });

  // Login user
  app.post('/api/login', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info.message || 'Authentication failed' });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  // Logout user
  app.post('/api/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: 'Failed to logout' });
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/user', (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = req.user as User;
    return res.json({ id: user.id, username: user.username, email: user.email });
  });
}