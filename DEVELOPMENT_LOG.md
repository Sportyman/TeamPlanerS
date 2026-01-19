
# TeamPlaner - Development Log & Documentation

## Overview
**TeamPlaner** is a Progressive Web App (PWA) designed for managing water sports clubs for people with disabilities (e.g., Kayaking, Sailing).
It allows managers to track attendance, manage inventory, and automatically generate pairings between volunteers/instructors and members based on rank, boat capacity, and complex social constraints.

**Developer Credit:** Shay Kalimi - @Shay.A.i

## Required Firestore Security Rules
Copy and paste these into your Firebase Console (Firestore -> Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global Config
    match /config/global {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User Profiles
    match /profiles/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    // Memberships
    match /memberships/{mid} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Clubs Data
    match /clubs/{clubId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Invites (New for Stage 2)
    match /invites/{inviteId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Tech Stack
*   **Framework:** React 18+ (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand (with Persist middleware for localStorage)
*   **Drag & Drop:** `@hello-pangea/dnd` (Fork of React Beautiful DnD)
*   **Routing:** React Router DOM (HashRouter)
*   **Icons:** Lucide React

## Key Features
1.  **Multi-Tenant Architecture:** Supports multiple clubs (Kayak, Sailing) with separate databases, settings, and inventories.
2.  **Role-Based Logic:** Distinguishes between Instructors, Volunteers, Members, and Guests.
3.  **Smart Pairing Algorithm:** "Cluster & Fill" approach.
4.  **Constraint Management:** Must Pair, Prefer Pair, Cannot Pair, Gender Preference.
5.  **Invite Mechanism:** Admins can create custom signup links with auto-approval logic.

## Current Status (v4.2.0)
*   **Stability:** High.
*   **Invites:** Implemented logic for club onboarding and links.
*   **Security:** Requires manual rule updates in Firebase.

---
*Last Updated: 2024-03-24*
