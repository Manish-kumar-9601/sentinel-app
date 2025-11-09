# Services Directory

This directory contains core application services that provide centralized, reusable functionality.

---

## 📦 Available Services

### StorageService

**File:** `StorageService.ts`  
**Purpose:** Centralized storage management for AsyncStorage and SecureStore

**Features:**

- ✅ Type-safe storage operations
- ✅ Centralized storage keys (`STORAGE_KEYS`)
- ✅ Secure storage for auth data (SecureStore)
- ✅ Error handling and logging
- ✅ Data migration support
- ✅ JSDoc documentation

**Usage:**

```typescript
import { StorageService, STORAGE_KEYS } from "@/services/StorageService";

// Get auth token
const token = await StorageService.getAuthToken();

// Set user data
await StorageService.setUserData({
  id: "123",
  name: "John Doe",
  email: "john@example.com",
});
```

**Documentation:**

- Quick Reference: `../STORAGE_QUICK_REFERENCE.md`
- Migration Guide: `../STORAGE_MIGRATION_GUIDE.md`
- Audit Report: `../STORAGE_STATE_AUDIT.md`

---

## 🔧 Other Services

### sosService

**File:** `sosService.js`  
**Purpose:** Emergency SOS functionality

---

## 📖 Service Guidelines

### When to Create a Service

Create a service when:

- Functionality is used across multiple components
- Complex business logic needs centralization
- External API integration required
- State needs to be managed outside React components
- Need to abstract platform-specific code

### Service Best Practices

1. **Single Responsibility** - Each service should have one clear purpose
2. **Type Safety** - Use TypeScript for new services
3. **Error Handling** - Always handle and log errors gracefully
4. **Documentation** - Include JSDoc comments for all public methods
5. **Testing** - Write unit tests for service methods
6. **Exports** - Export types along with service instances

### Example Service Structure

```typescript
/**
 * Service description
 * @module ServiceName
 */

// ==================== TYPES ====================
export interface ServiceType {
  // ...
}

// ==================== CONSTANTS ====================
export const SERVICE_CONSTANTS = {
  // ...
} as const;

// ==================== SERVICE CLASS ====================
class ServiceNameClass {
  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   */
  async methodName(param: string): Promise<void> {
    try {
      // Implementation
      console.log("✅ [ServiceName] Success message");
    } catch (error) {
      console.error("❌ [ServiceName] Error message:", error);
      throw error;
    }
  }
}

// ==================== SINGLETON EXPORT ====================
export const ServiceName = new ServiceNameClass();
export default ServiceName;
```

---

## 🚀 Future Services (Planned)

### APIService (Recommended)

Centralize all API calls with:

- Request/response interceptors
- Automatic token refresh
- Error handling
- Retry logic
- Type-safe endpoints

### NotificationService (Recommended)

Centralize push notifications:

- Permission handling
- Token management
- Notification display
- Deep linking

### AnalyticsService (Recommended)

Centralize analytics:

- Event tracking
- User properties
- Screen tracking
- Error tracking

---

## 📚 Related Documentation

- **Utils:** `../utils/` - Helper functions and utilities
- **Context:** `../context/` - React context providers
- **Hooks:** `../hooks/` - Custom React hooks

---

**Last Updated:** November 9, 2025
