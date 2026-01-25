
# TeamPlaner - Development Log & Documentation

## Overview
**TeamPlaner** is a Progressive Web App (PWA) designed for managing water sports clubs for people with disabilities.
Developer: Shay Kalimi - @Shay.A.i

## Status (v5.8.0)
*   **Super Admin VIP:** Global admins now bypass PENDING status and can enter any club immediately.
*   **Anti-Ghosting:** Added `hardReset` function and improved cloud sync to clear local cache when cloud data is deleted.
*   **Notification Fix:** Improved bell notification listener to catch real-time Firestore changes.
*   **Routing Lock:** Users in PENDING status are strictly locked to the `/registration-status` page.

## Firestore Schema Update
*   Collection: `notifications`
    *   `clubId`: ID of the targeted club.
    *   `message`: Text content.
    *   `type`: INFO/SUCCESS/WARN.
    *   `timestamp`: ISO String.
    *   `read`: Boolean.
