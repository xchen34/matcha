const pool = require("../db");

class UserService {
  async getAllUsers() {
    const result = await pool.query("SELECT id, name, email, created_at FROM users ORDER BY id DESC");
    return result.rows;
  }

  async getUserById(id) {
    const result = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [id]);
    return result.rows[0];
  }

  async createUser(name, email) {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
      [name, email]
    );
    return result.rows[0];
  }

  async updateUser(id, name, email) {
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at",
      [name, email, id]
    );
    return result.rows[0];
  }

  async deleteUser(id) {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    return result.rowCount > 0;
  }
}

module.exports = new UserService();
