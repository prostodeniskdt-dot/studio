# Firestore Rules - Regression Test Plan

This document outlines the key test cases that should be implemented to ensure the security and integrity of the Firestore database for the BarBoss application. These tests are critical for preventing regressions, especially after the complex permission issues encountered during initial development.

The tests should be written using the Firebase Emulator Suite and the Rules Unit Testing library.

## Test Suite: User and Bar Creation

This suite focuses on the critical path for new user registration, which was the source of the persistent "Missing or insufficient permissions" error.

### 1. New User Registration Flow

-   **Test Case 1.1: A new user CAN create their own user document.**
    -   **Action:** `create`
    -   **Path:** `/users/{userId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Data:** A valid user profile object.
    -   **Expected Result:** `ALLOWED`

-   **Test Case 1.2: A user CANNOT create a user document for another user.**
    -   **Action:** `create`
    -   **Path:** `/users/{otherUserId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Data:** A valid user profile object.
    -   **Expected Result:** `DENIED`

-   **Test Case 1.3: A new user CAN create their own bar document.**
    -   **Action:** `create`
    -   **Path:** `/bars/bar_{userId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Data:** `{ id: 'bar_{userId}', ownerUserId: '{userId}', ... }`
    -   **Expected Result:** `ALLOWED`

-   **Test Case 1.4: A user CANNOT create a bar document with a mismatched ID.**
    -   **Action:** `create`
    -   **Path:** `/bars/bar_maliciousId`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Data:** `{ id: 'bar_maliciousId', ownerUserId: '{userId}', ... }`
    -   **Expected Result:** `DENIED`

-   **Test Case 1.5: A user CANNOT create a bar and assign it to another user.**
    -   **Action:** `create`
    -   **Path:** `/bars/bar_{userId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Data:** `{ id: 'bar_{userId}', ownerUserId: '{otherUserId}', ... }`
    -   **Expected Result:** `DENIED`

### 2. Document Update Invariants

-   **Test Case 2.1: A user CAN update their own bar's non-critical data.**
    -   **Action:** `update`
    -   **Path:** `/bars/bar_{userId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Existing Data:** `{ id: 'bar_{userId}', ownerUserId: '{userId}', name: 'Old Name' }`
    -   **New Data:** `{ name: 'New Name' }`
    -   **Expected Result:** `ALLOWED`

-   **Test Case 2.2: A user CANNOT change the `ownerUserId` of their bar.**
    -   **Action:** `update`
    -   **Path:** `/bars/bar_{userId}`
    -   **Auth:** Authenticated as `{userId}`.
    -   **Existing Data:** `{ id: 'bar_{userId}', ownerUserId: '{userId}', ... }`
    -   **New Data:** `{ ownerUserId: '{otherUserId}' }`
    -   **Expected Result:** `DENIED`

## Test Suite: Bar Operations

This suite covers day-to-day operations within a bar.

-   **Test Case 3.1: The bar owner CAN add members to their bar.**
    -   **Action:** `create`
    -   **Path:** `/bars/bar_{ownerId}/members/{memberId}`
    -   **Auth:** Authenticated as `{ownerId}`.
    -   **Data:** `{ userId: '{memberId}', role: 'bartender' }`
    -   **Expected Result:** `ALLOWED`

-   **Test Case 3.2: Another user CANNOT add members to someone else's bar.**
    -   **Action:** `create`
    -   **Path:** `/bars/bar_{ownerId}/members/{memberId}`
    -   **Auth:** Authenticated as `{otherUserId}`.
    -   **Data:** `{ userId: '{memberId}', role: 'bartender' }`
    -   **Expected Result:** `DENIED`

-   **Test Case 3.3: A bar member (e.g., manager) can read data from subcollections (e.g., inventory sessions).**
    -   **Setup:** Document exists at `/bars/bar_{ownerId}/members/{managerId}`.
    -   **Action:** `get`
    -   **Path:** `/bars/bar_{ownerId}/inventorySessions/{sessionId}`
    -   **Auth:** Authenticated as `{managerId}`.
    -   **Expected Result:** `ALLOWED`
