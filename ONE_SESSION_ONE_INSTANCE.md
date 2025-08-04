# One Session = One Instance Modification

This document describes the modifications made to convert the Play with Docker clone from a **multiple instances per session** model to a **one session = one instance** model.

## 🎯 Objective

Simplify the architecture by ensuring each session has exactly one DIND (Docker-in-Docker) container, making the platform easier to understand, manage, and use.

## 🔄 Architecture Changes

### Before (Original)
```
Session Creation → User manually adds instances → Multiple containers per session
```

### After (Modified)
```
Session Creation → Auto-creates single instance → One container per session
```

## 📝 Code Changes Summary

### 1. **pwd/session.go**
- **Modified `SessionNew()`**: Now automatically creates a DIND instance when a session is created
- **Modified `SessionDeployStack()`**: Uses existing instance instead of creating a new one
- **Impact**: Sessions are immediately ready to use without manual instance creation

### 2. **handlers/new_instance.go**
- **Modified `NewInstance()`**: Rejects requests if session already has an instance
- **Returns**: HTTP 409 Conflict with clear error message
- **Impact**: Prevents multiple instances per session

### 3. **pwd/instance.go**
- **Added `InstanceGetSingle()`**: Convenience method to get the single instance for a session
- **Enhanced error handling**: Warns if multiple instances found (should not happen)
- **Impact**: Simplified instance retrieval

### 4. **handlers/session_terminal.go** (New File)
- **Added `SessionTerminal()`**: Direct access to session's terminal
- **Added `SessionTerminalWS()`**: WebSocket connection for terminal
- **Impact**: Simplified terminal access without knowing instance names

### 5. **handlers/bootstrap.go**
- **Added new routes**:
  - `GET /sessions/{id}/terminal` - Get instance info
  - `WebSocket /sessions/{id}/ws` - Terminal connection
- **Impact**: Cleaner API for one-instance usage

### 6. **pwd/pwd.go** & **pwd/mock.go**
- **Added `InstanceGetSingle()`** to interface and mock
- **Impact**: Consistent API across implementations

## 🚀 Usage Examples

### Creating a Session (Now Auto-Creates Instance)
```bash
# Create session - instance is automatically created
curl -X POST http://localhost/sessions \
  -H "Content-Type: application/json" \
  -d '{"playground_id": "default"}'

# Response includes session with auto-created instance
{
  "session_id": "abc123",
  "hostname": "localhost"
}
```

### Direct Terminal Access
```bash
# Get instance info for session
curl http://localhost/sessions/abc123/terminal

# Connect to WebSocket terminal
ws://localhost/sessions/abc123/ws
```

### Attempting to Add Additional Instance (Fails)
```bash
# This will now return 409 Conflict
curl -X POST http://localhost/sessions/abc123/instances \
  -H "Content-Type: application/json" \
  -d '{"image": "franela/dind"}'

# Response:
{
  "error": "session_already_has_instance",
  "message": "This session already has an instance. Only one instance per session is allowed."
}
```

## 🎉 Benefits Achieved

### 1. **Simplified Architecture**
- Direct 1:1 mapping between sessions and containers
- No complex instance management logic needed
- Predictable resource consumption

### 2. **Enhanced User Experience**
- Immediate access to Docker environment upon session creation
- No need to understand "adding instances"
- Faster time-to-productivity

### 3. **Easier Resource Management**
- Each session = 1 container = predictable resources
- Simplified monitoring and capacity planning
- Clearer resource limits per user

### 4. **Reduced Complexity**
- Fewer API endpoints to understand
- Simplified networking (no multi-container session networks)
- Easier debugging and troubleshooting

### 5. **Better for Learning**
- Focus on Docker concepts rather than platform complexity
- Clearer mental model for beginners
- Simplified tutorials and documentation

## 🔄 Migration Path

### For Frontend/UI Changes
1. Remove "Add Instance" buttons from UI
2. Connect directly to session WebSocket: `/sessions/{id}/ws`
3. Use `/sessions/{id}/terminal` for instance information
4. Update user flows to expect immediate terminal access

### For API Consumers
1. Update session creation to expect immediate instance availability
2. Use new simplified terminal endpoints
3. Remove instance creation calls
4. Handle 409 errors gracefully for legacy instance creation attempts

## 🛡️ Backward Compatibility

- Original instance routes still exist but return errors for new instances
- Existing sessions with multiple instances continue to work
- Gradual migration possible without breaking existing functionality

## 🔧 Configuration

No configuration changes required. The system will:
- Use default DIND image (`franela/dind`)
- Apply playground settings (privileged mode, volume size, etc.)
- Create instances with hostname `node1`
- Use session network for isolation

## 📊 Performance Impact

### Positive Impacts
- **Faster session startup**: Instance created immediately
- **Reduced API calls**: No separate instance creation needed
- **Lower latency**: Direct session-to-terminal connection

### Resource Usage
- **Same memory per session**: Still one DIND container
- **Slightly higher initial CPU**: Instance created during session creation
- **No network overhead**: Single container per session network

## 🐛 Troubleshooting

### Session Creation Fails
- Check Docker daemon connectivity
- Verify sufficient resources for DIND container
- Check network creation permissions

### Terminal Connection Issues
- Ensure session exists and is ready
- Verify WebSocket endpoint accessibility
- Check instance health status

### Legacy Instance Creation Errors
- Expected behavior: Returns 409 Conflict
- Solution: Use session directly instead of creating instances

## 🔮 Future Enhancements

1. **Custom Instance Types**: Allow specifying DIND image during session creation
2. **Resource Profiles**: Predefined CPU/memory configurations per session
3. **Session Templates**: Pre-configured environments for different use cases
4. **Health Monitoring**: Enhanced monitoring for session-instance pairs
5. **Auto-scaling**: Dynamic resource allocation based on usage

---

**Result**: A significantly simplified Docker playground that's easier to use, understand, and maintain while preserving all core functionality.
