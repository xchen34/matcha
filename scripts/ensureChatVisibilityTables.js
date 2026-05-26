const pool = require("../db");

let initPromise = null;
let chatVisibilityTablesReady = false;

//在服务启动前确保两个“用户可见性”表存在，避免运行时缺表导致错误
async function ensureChatVisibilityTables() {
  if (chatVisibilityTablesReady) return;  //防止重复创建表 
  if (initPromise) return initPromise; //如果已经在创建表了，等待创建完成

  initPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_deleted_conversations (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, conversation_id)
      )
    `); //用户删除的会话表，记录用户删除了哪些会话 引用users表的id和chat_conversations表的id作为外键，删除用户或会话时自动删除相关记录

    //用户删除的消息表，记录用户删除了哪些消息 引用users表的id、chat_messages表的id和chat_conversations表的id作为外键，删除用户、消息或会话时自动删除相关记录
//外键的意思是当users表中的某个用户被删除时，chat_deleted_conversations表中所有引用该用户id的记录都会被自动删除；同样，当chat_conversations表中的某个会话被删除时，chat_deleted_conversations表中所有引用该会话id的记录也会被自动删除。这确保了数据的一致性和完整性，避免了孤立的记录存在。
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_deleted_messages (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id INT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, message_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS chat_deleted_conversations_user_idx
      ON chat_deleted_conversations(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS chat_deleted_messages_user_conversation_idx
      ON chat_deleted_messages(user_id, conversation_id)
    `);

    chatVisibilityTablesReady = true;
  })();

  return initPromise;
}

module.exports = { ensureChatVisibilityTables };


/**
 * references 关键字的语法是：
REFERENCES <referenced_table>(<referenced_column>) ON DELETE CASCADE
其中：
- `<referenced_table>` 是被引用的表名，比如 `users` 或 `chat_conversations`。
- `<referenced_column>` 是被引用表中的列名，通常是主键列，比如 `id`。
所以 `user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE` 的意思是：
- 定义了一个名为 `user_id` 的整数列，不能为空。
- 这个列是一个外键，引用了 `users` 表中的 `id` 列。
- 当 `users` 表中的某条记录被删除时，所有引用该记录的 `user_id` 也会被自动删除（级联删除）。
同样的，`conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE` 的意思是：
- 定义了一个名为 `conversation_id` 的整数列，不能为空。
- 这个列是一个外键，引用了 `chat_conversations` 表中的 `id` 列。
- 当 `chat_conversations` 表中的某条记录被删除时，所有引用该记录的 `conversation_id` 也会被自动删除（级联删除）。

 * - `user(id)` 这表示 `users` 是表名, id 是那张表里的列名
合起来就是：
这个字段引用 `users` 表里的 [id](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html) 列。
所以外键不是“另一个表的名字”，而是：
这个字段和另一个表里的某一列建立了引用关系。
你可以把它想成：
- 当前表里存一个数字
- 这个数字必须对应另一张表里的某条真实记录

delete cascade 的意思是：
当被引用的记录被删除时，自动删除所有引用它的记录。
比如：
- 如果一个用户被删除了，那么所有引用这个用户id的记录（比如这个用户删除的会话和消息记录）也会被自动删除。
- 如果一个会话被删除了，那么所有引用这个会话id的记录（比如这个会话里被用户删除的消息记录）也会被自动删除。
这样可以保持数据库的一致性，避免出现孤立的记录。

primary key 的意思是： 不能有重复值，不能为空，并且每行记录必须有一个唯一标识符。
- 这个字段（或字段组合）唯一标识表中的每一行记录。
- 在 `chat_deleted_conversations` 表中，`PRIMARY KEY (user_id, conversation_id)` 表示 `user_id` 和 `conversation_id` 的组合必须是唯一的，也就是说同一个用户不能删除同一个会话多次。
- 在 `chat_deleted_messages` 表中，`PRIMARY KEY (user_id, message_id)` 表示 `user_id` 和 `message_id` 的组合必须是唯一的，也就是说同一个用户不能删除同一条消息多次。
 * 

index 的意思是：创建索引可以加速查询性能，特别是在涉及到外键的查询中。
- `CREATE INDEX IF NOT EXISTS chat_deleted_conversations_user_idx ON chat_deleted_conversations(user_id)` 这行代码创建了一个名为 `chat_deleted_conversations_user_idx` 的索引，索引的列是 `user_id`。这个索引可以加速基于 `user_id` 的查询，比如查询某个用户删除了哪些会话。
- `CREATE INDEX IF NOT EXISTS chat_deleted_messages_user_conversation_idx ON chat_deleted_messages(user_id, conversation_id)` 这行代码创建了一个名为 `chat_deleted_messages_user_conversation_idx` 的索引，索引的列是 `user_id` 和 `conversation_id` 的组合。这个索引可以加速基于 `user_id` 和 `conversation_id` 的查询，比如查询某个用户在某个会话中删除了哪些消息。
 */
