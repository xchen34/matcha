const { Server } = require("socket.io"); //socket.io库提供了Server类，用于创建WebSocket服务器实例
const { REALTIME_EVENTS } = require("./events"); //导入定义的实时事件常量，方便在代码中使用统一的事件名称，避免硬编码字符串
const {
  parseTokenFromHandshake,
  registerRealtimeSocketHandlers,
} = require("./handlers"); //导入处理函数，parseTokenFromHandshake用于从socket连接的握手数据中提取认证token，registerRealtimeSocketHandlers用于注册具体的事件处理逻辑
const { verifyRealtimeToken } = require("./authToken"); //导入验证函数，verifyRealtimeToken用于验证从握手数据中提取的token是否合法，并返回相关的用户信息（如userId）以供后续使用

let ioInstance = null;  //ioInstance变量用于存储Socket.IO服务器实例，确保全局只有一个实例被创建和使用，避免重复初始化和资源浪费

function initRealtime(server) {  //initRealtime函数用于初始化Socket.IO服务器，接受一个HTTP服务器实例作为参数，绑定Socket.IO到该服务器上，并设置相关的中间件和事件处理逻辑
  if (ioInstance) return ioInstance;  //如果ioInstance已经存在，说明Socket.IO服务器已经初始化过了，直接返回现有的实例，避免重复创建

  ioInstance = new Server(server, {  //创建Socket.IO服务器实例，绑定到传入的HTTP服务器上，并配置CORS选项，允许来自http://localhost:5173的请求，并支持GET、POST方法和携带凭证（如cookie）
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {  //使用ioInstance.use方法注册一个中间件函数，在每次有新的socket连接时执行，负责验证连接的合法性, socket参数代表当前连接的socket对象，next参数是一个回调函数，用于在验证完成后继续处理连接或返回错误
    const token = parseTokenFromHandshake(socket); //调用parseTokenFromHandshake函数从socket连接的握手数据中提取认证token，通常是从cookie或查询参数中获取，如果没有找到token，说明连接不合法，调用next并传入错误对象，拒绝连接
    const claims = verifyRealtimeToken(token); //调用verifyRealtimeToken函数验证提取的token是否合法，如果验证失败或token无效，说明连接不合法，调用next并传入错误对象，拒绝连接
    if (!claims?.userId) { //如果验证成功但没有返回有效的userId，说明连接不合法，调用next并传入错误对象，拒绝连接。claims如果不是null或undefined且具有userId属性，则继续执行后续逻辑，否则返回错误
      return next(new Error("Unauthorized socket"));
    }

    socket.data.userId = claims.userId; //如果验证成功且返回了有效的userId，将其存储在socket.data.userId中，方便后续事件处理函数使用，标识当前连接的用户身份
    return next();
  });

  ioInstance.on("connection", (socket) => { //监听ioInstance的connection事件，每当有新的socket连接成功通过验证时触发，socket参数代表当前连接的socket对象
    registerRealtimeSocketHandlers(ioInstance, socket); //调用registerRealtimeSocketHandlers函数，传入ioInstance和当前连接的socket对象，注册具体的事件处理逻辑，定义当客户端发送特定事件时服务器应该如何响应
  });

  return ioInstance; //返回创建的Socket.IO服务器实例，供外部调用和使用
}

function getIO() { //getIO函数用于获取当前的Socket.IO服务器实例，如果尚未初始化则返回null，供其他模块调用以获取ioInstance进行事件广播等操作
  return ioInstance;
}

module.exports = {  //导出initRealtime函数用于初始化Socket.IO服务器，getIO函数用于获取当前的Socket.IO服务器实例，以及REALTIME_EVENTS常量供外部使用
  initRealtime,
  getIO,
  REALTIME_EVENTS,
};


/**
 * parseTokenFromHandshake 返回什么
在 realtime/handlers.js 里它返回：string：提取到的 token（优先 socket.handshake.auth.token，其次 Authorization: Bearer xxx）
null：都没拿到时返回 null

verifyRealtimeToken 返回什么
在 realtime/authToken.js 里它返回：{ userId, exp }：token 签名正确、没过期、sub 合法时
null：token 缺失/格式错/签名不对/JSON 解析失败/过期/sub 非法时
 * 
 * socket.on("事件名", handler)：监听某个事件（接收消息并处理）
socket.emit("事件名", 数据)：向对端发一个事件（发送消息）
另外还有 io.emit(...)（群发给所有连接）和 io.to("room").emit(...)（发给某个房间/某类用户）
 * socket.emit(...)：从“当前这个 socket 连接”发事件。常见两种语境：
前端：当前客户端发给服务端
后端：服务端只发给这个特定连接
io.emit(...)：从服务端发给“所有已连接客户端”（全体广播
 */