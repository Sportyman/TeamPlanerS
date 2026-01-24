
# TeamPlaner - Development Log & Documentation

## Overview
**TeamPlaner** is a Progressive Web App (PWA) designed for managing water sports clubs for people with disabilities.
Developer: Shay Kalimi - @Shay.A.i

## Status (v5.6.0)
*   **Registration Status:** Implemented `/registration-status` page for post-signup UX.
*   **Notifications:** Added real-time Firestore-based notification bell for admins.
*   **Membership Requests:** Upgraded to deep-review modal with role and rank assignment before approval.

## Firestore Schema Update
*   New collection: `notifications`
    *   `clubId`: ID of the targeted club.
    *   `message`: Text content.
    *   `type`: INFO/SUCCESS/WARN.
    *   `timestamp`: ISO String.
    *   `read`: Boolean.
