# Tawa Real-Time Chat System

A comprehensive real-time chat system built with Socket.IO for the Tawa local services marketplace.

## Features

### Core Chat Features

- **Real-time messaging** using Socket.IO
- **Chat rooms** for service-specific conversations
- **Message persistence** with MongoDB
- **Read receipts** and unread message counts
- **Typing indicators** for better UX
- **Message editing** (within 5 minutes)
- **Message deletion** (soft delete)
- **Reply to messages** functionality
- **File attachments** support (structure ready)

### Security Features

- **JWT authentication** for WebSocket connections
- **User authorization** for chat access
- **Input validation** and sanitization
- **Rate limiting** on HTTP endpoints

### Advanced Features

- **Online/offline status** tracking
- **Chat archiving** functionality
- **Pagination** for message history
- **Unread message notifications**
- **Service and booking integration**

## Architecture

### Models

#### Chat Model (`src/models/Chat.js`)

- Manages chat conversations between users
- Tracks participants, service context, and unread counts
- Supports chat archiving and last message tracking

#### Message Model (`src/models/Message.js`)

- Stores individual messages with rich metadata
- Supports different message types (text, image, file, system)
- Includes read receipts, editing history, and soft deletion

### Controllers

#### Chat Controller (`src/controllers/chatController.js`)

- **getUserChats**: Get all chats for authenticated user
- **createOrGetChat**: Create new chat or retrieve existing one
- **getChatMessages**: Get paginated messages for a chat
- **sendMessage**: Send a new message
- **editMessage**: Edit existing message (within time limit)
- **deleteMessage**: Soft delete a message
- **markChatAsRead**: Mark all messages in chat as read
- **getUnreadCount**: Get total unread message count
- **archiveChat**: Archive/deactivate a chat

### WebSocket Server

#### Socket Server (`src/socket/socketServer.js`)

- **Authentication**: JWT-based WebSocket authentication
- **Real-time events**: Handle all real-time chat operations
- **Room management**: Dynamic chat room joining/leaving
- **User tracking**: Online status and socket mapping
- **Event handling**: Message sending, typing indicators, read receipts

### Routes

#### Chat Routes (`src/routes/chats.js`)

- RESTful API endpoints for chat management
- All routes protected with authentication middleware
- Comprehensive CRUD operations for chats and messages

## API Endpoints

### Chat Management

```
GET    /api/chats                    - Get user's chats
POST   /api/chats                    - Create or get chat
GET    /api/chats/unread-count       - Get unread message count
PUT    /api/chats/:chatId/read       - Mark chat as read
PUT    /api/chats/:chatId/archive    - Archive chat
```

### Message Management

```
GET    /api/chats/:chatId/messages   - Get chat messages
POST   /api/chats/:chatId/messages   - Send message
PUT    /api/chats/:chatId/messages/:messageId - Edit message
DELETE /api/chats/:chatId/messages/:messageId - Delete message
```

## WebSocket Events

### Client to Server

```javascript
// Join a chat room
socket.emit('join_chat', { chatId: 'chat_id' });

// Leave a chat room
socket.emit('leave_chat', { chatId: 'chat_id' });

// Send a message
socket.emit('send_message', {
  chatId: 'chat_id',
  content: 'Hello!',
  messageType: 'text',
  attachments: [],
  replyTo: 'message_id' // optional
});

// Typing indicators
socket.emit('typing', { chatId: 'chat_id' });
socket.emit('stop_typing', { chatId: 'chat_id' });

// Mark messages as read
socket.emit('mark_read', {
  chatId: 'chat_id',
  messageIds: ['msg1', 'msg2']
});
```

### Server to Client

```javascript
// Connection events
socket.on('connect', () => {});
socket.on('disconnect', () => {});
socket.on('connect_error', (error) => {});

// Chat events
socket.on('joined_chat', (data) => {});
socket.on('left_chat', (data) => {});
socket.on('new_message', (data) => {});
socket.on('user_typing', (data) => {});
socket.on('user_stop_typing', (data) => {});
socket.on('messages_read', (data) => {});
socket.on('message_notification', (data) => {});

// User status events
socket.on('user_online', (data) => {});
socket.on('user_offline', (data) => {});
```

## Setup and Installation

### 1. Install Dependencies

```bash
npm install socket.io
```

### 2. Environment Variables

Add to your `.env` file:

```env
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

### 3. Database Indexes

The models include optimized indexes for:

- Chat participants and service lookup
- Message chat and timestamp ordering
- User message queries

### 4. Start the Server

```bash
npm start
```

## Usage Examples

### Creating a Chat

```javascript
// HTTP API
const response = await fetch('/api/chats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    serviceId: 'service_id',
    otherUserId: 'user_id',
    bookingId: 'booking_id' // optional
  })
});
```

### Connecting to WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5050', {
  auth: {
    token: 'your_jwt_token'
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});
```

### Sending Real-time Messages

```javascript
// Join a chat
socket.emit('join_chat', { chatId: 'chat_id' });

// Send a message
socket.emit('send_message', {
  chatId: 'chat_id',
  content: 'Hello, how can I help you?',
  messageType: 'text'
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

## Client Integration

### React Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent({ token, chatId }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:5050', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', { chatId });
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token, chatId]);

  const sendMessage = (content) => {
    socket.emit('send_message', {
      chatId,
      content,
      messageType: 'text'
    });
  };

  return (
    <div>
      {/* Chat UI */}
    </div>
  );
}
```

## Testing

### Using the Example Client

1. Open `chat-client-example.html` in a browser
2. Enter a valid JWT token
3. Enter a chat ID
4. Connect and start chatting

### API Testing with Postman

1. Set up authentication header: `Authorization: Bearer <token>`
2. Test all endpoints with proper request bodies
3. Verify real-time functionality with WebSocket connections

## Security Considerations

### Authentication

- All WebSocket connections require valid JWT tokens
- HTTP endpoints are protected with authentication middleware
- User authorization is verified for all chat operations

### Input Validation

- Message content is sanitized and length-limited
- File attachments are validated for type and size
- User permissions are checked for all operations

### Rate Limiting

- HTTP endpoints have rate limiting applied
- WebSocket events can be rate-limited if needed

## Performance Optimizations

### Database

- Efficient indexes on frequently queried fields
- Pagination for message history
- Soft deletion to maintain data integrity

### WebSocket

- Room-based message broadcasting
- Efficient user-socket mapping
- Connection pooling and cleanup

### Caching

- User online status caching
- Chat metadata caching (can be extended)

## Future Enhancements

### Planned Features

- **File upload integration** with cloud storage
- **Message encryption** for enhanced security
- **Push notifications** for mobile apps
- **Chat search** functionality
- **Message reactions** and emojis
- **Voice and video calls** integration
- **Chat moderation** tools
- **Message translation** services

### Scalability

- **Redis integration** for session management
- **Horizontal scaling** with multiple server instances
- **Message queuing** for high-traffic scenarios
- **CDN integration** for file attachments

## Troubleshooting

### Common Issues

1. **Connection Failed**

   - Check JWT token validity
   - Verify server is running on correct port
   - Check CORS configuration

2. **Messages Not Sending**

   - Verify user is participant in chat
   - Check message content validation
   - Ensure proper WebSocket connection

3. **Real-time Updates Not Working**
   - Check Socket.IO client version compatibility
   - Verify event names match server implementation
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting environment variable:

```env
DEBUG=socket.io:*
```

## Contributing

When adding new features to the chat system:

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Update documentation
5. Add tests for new functionality

## License

This chat system is part of the Tawa marketplace project and follows the same licensing terms.
