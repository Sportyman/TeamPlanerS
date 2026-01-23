
# TeamPlaner - Development Log & Documentation

## Overview
**TeamPlaner** is a Progressive Web App (PWA) designed for managing water sports clubs for people with disabilities.
Developer: Shay Kalimi - @Shay.A.i

## Required Firestore Security Rules (Updated v14)
Copy and paste these into your Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return exists(/databases/$(database)/documents/config/global) && 
             request.auth.token.email.lower() in get(/databases/$(database)/documents/config/global).data.superAdmins;
    }

    match /profiles/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    
    match /memberships/{mid} {
      allow read: if request.auth != null; 
      allow write: if request.auth != null;
    }
    
    match /clubs/{clubId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /config/global {
      allow read: if request.auth != null;
      allow write: if isSuperAdmin();
    }
    
    match /invites/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Status (v5.5.0)
*   **Permissions:** Implemented accessLevel checks in `memberships`.
*   **Refactor:** Completed `clubId_uid` standard for document IDs.
*   **Auth Flow:** Standardized. Users must have a profile and active status.
