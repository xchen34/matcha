const { normalizeEmail } = require("../utils/emailService");
const pool = require("../db");

class AuthService {
  /*  ========== Migration  ========== */
  async ensurePendingEmailColumn() {
    await pool.query(
      `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255)
      `,
    );

    await pool.query(
      `
      CREATE INDEX IF NOT EXISTS idx_users_pending_email 
      ON users(pending_email)
      `,
    );
  }

  /*  ========== User Finders  ========== */
  async findUserByIdForEmailChange(userId) {
    const result = await pool.query(
      `
      SELECT id, email, email_verified, password_hash 
      FROM users 
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );

    return result.rows[0];
  }

  async findUserByEmail(email) {
    email = normalizeEmail(email);

    const result = await pool.query(
      `
      SELECT id, email, email_verified 
      FROM users 
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email],
    );

    return result.rows[0];
  }

  async findUserForLogin(identifier) {
    const result = await pool.query(
      `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.password_hash,
             u.email_verified, u.created_at, p.gender, p.birth_date, p.city
      FROM users u
      LEFT JOIN profiles p 
        ON p.user_id = u.id
      WHERE 
        u.deleted_at IS NULL
        AND (
          LOWER(u.username) = LOWER($1)
          OR LOWER(u.email) = LOWER($1)
        )
      LIMIT 1
      `,
      [identifier],
    );

    return result.rows[0];
  }

  async findUserForDeletion(userId, email) {
    const result = await pool.query(
      `
      SELECT id, password_hash, email
      FROM users
      WHERE 
        deleted_at IS NULL
        AND (
          ($1::bigint IS NOT NULL AND id = $1)
          OR ($2 <> '' AND LOWER(email) = LOWER($2))
        )
      ORDER BY 
        CASE 
          WHEN $1::bigint IS NOT NULL AND id = $1 
          THEN 0 
          ELSE 1 
        END
      LIMIT 1
      `,
      [Number.isInteger(userId) && userId > 0 ? userId : null, email],
    );

    return result.rows[0];
  }

  /*  ========== User State  ========== */
  async checkUserExists(userId) {
    const result = await pool.query(
      `
      SELECT 1
      FROM users 
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );

    return result.rowCount > 0;
  }

  async updateLastSeen(userId) {
    await pool.query(
      `
      UPDATE users 
      SET last_seen_at = NOW() 
      WHERE id = $1
      `,
      [userId],
    );
  }

  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const deletedEmail = `deleted+${userId}@deleted.local`;
      const deletedUsername = `deleted_user_${userId}`;

      await client.query(
        `
        UPDATE users
        SET
          deleted_at = COALESCE(deleted_at, NOW()),
          email = $1,
          username = $2,
          first_name = 'Deleted',
          last_name = 'User',
          pending_email = NULL,
          email_verification_token = NULL,
          email_verification_token_expiry = NULL,
          password_reset_token = NULL,
          password_reset_token_expiry = NULL,
          email_verified = FALSE
        WHERE id = $3
          AND deleted_at IS NULL
        `,
        [deletedEmail, deletedUsername, userId],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /*  ========== Password Reset  ========== */
  async setPasswordResetToken(userId, token, expiry) {
    await pool.query(
      `
      UPDATE users 
      SET 
        password_reset_token = $1, 
        password_reset_token_expiry = $2 
      WHERE id = $3
        AND deleted_at IS NULL
      `,
      [token, expiry, userId],
    );
  }

  async findUserByResetToken(token) {
    const result = await pool.query(
      `
      SELECT id FROM users 
      WHERE 
        password_reset_token = $1
        AND 
        deleted_at IS NULL
        AND
        password_reset_token_expiry > NOW() 
      LIMIT 1
      `,
      [token],
    );

    return result.rows[0];
  }

  async updatePassword(userId, passwordHash) {
    await pool.query(
      `
      UPDATE users 
      SET 
        password_hash = $1, 
        password_reset_token = NULL, 
        password_reset_token_expiry = NULL 
      WHERE id = $2
        AND deleted_at IS NULL
      `,
      [passwordHash, userId],
    );
  }

  /*  ========== Registration  ========== */
  async registerUser(userData, birthDate) {
    const client = await pool.connect();
    try {
      userData.email = normalizeEmail(userData.email);

      await client.query("BEGIN");
      const result = await client.query(
        `
        INSERT INTO users (email, username, first_name, last_name, password_hash, 
                        email_verification_token, email_verification_token_expiry)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, username, first_name, last_name, 
                email_verified, created_at
        `,
        [
          userData.email,
          userData.username,
          userData.first_name,
          userData.last_name,
          userData.passwordHash,
          userData.verificationToken,
          userData.tokenExpiry,
        ],
      );

      const userId = result.rows[0].id;
      await client.query(
        `
        INSERT INTO profiles (user_id, birth_date) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) 
        DO UPDATE 
        SET birth_date = EXCLUDED.birth_date
        `,
        [userId, birthDate],
      );
      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /*  ========== Email Verification & Change  ========== */
  async findUserByVerificationToken(token) {
    const result = await pool.query(
      `
      SELECT id, email, email_verified, pending_email 
      FROM users 
      WHERE 
        email_verification_token = $1 
        AND 
        email_verification_token_expiry > NOW() 
      LIMIT 1
      `,
      [token],
    );

    return result.rows[0];
  }

  async verifyEmail(userId) {
    await pool.query(
      `
      UPDATE users 
      SET 
        email_verified = TRUE, 
        email_verification_token = NULL, 
        email_verification_token_expiry = NULL 
      WHERE id = $1
      `,
      [userId],
    );
  }

  async verifyEmailChange(userId, nextEmail) {
    nextEmail = normalizeEmail(nextEmail);

    await pool.query(
      `
      UPDATE users 
      SET 
        email = $1, 
        pending_email = NULL, 
        email_verified = TRUE, 
        email_verification_token = NULL, 
        email_verification_token_expiry = NULL 
      WHERE id = $2
      `,
      [nextEmail, userId],
    );
  }

  async setPendingEmailAndToken(userId, newEmail, token, expiry) {
    newEmail = normalizeEmail(newEmail);

    await pool.query(
      `
      UPDATE users 
      SET 
        pending_email = $1, 
        email_verification_token = $2, 
        email_verification_token_expiry = $3 
      WHERE id = $4
      `,
      [newEmail, token, expiry, userId],
    );
  }

  async updateVerificationToken(userId, token, expiry) {
    await pool.query(
      `
      UPDATE users 
      SET 
        email_verification_token = $1, 
        email_verification_token_expiry = $2 
      WHERE id = $3
      `,
      [token, expiry, userId],
    );
  }

  /*  ========== Email Conflict Check  ========== */
  async checkEmailConflict(newEmail, userId) {
    const result = await pool.query(
      `
      SELECT id FROM users 
      WHERE 
        (
          LOWER(email) = LOWER($1) 
          OR 
          LOWER(COALESCE(pending_email, '')) = LOWER($1)
        ) 
        AND id <> $2 
      LIMIT 1
      `,
      [newEmail, userId],
    );

    return result.rowCount > 0;
  }
}

module.exports = new AuthService();
