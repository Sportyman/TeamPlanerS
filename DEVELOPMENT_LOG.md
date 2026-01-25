
# TeamPlaner - Development Log & Documentation

## Overview
**TeamPlaner** is a Progressive Web App (PWA) designed for managing water sports clubs for people with disabilities.
Developer: Shay Kalimi - @Shay.A.i

## Status (v6.0.0) - Build 20
*   **Reactive Identity Architecture:** Club people are no longer stored as an array in the Club document. They are derived reactively from the `memberships` collection joined with the `profiles` collection.
*   **Admin Visibility:** Club Admins and Staff now automatically appear in the participant list and pairing board because they hold active memberships.
*   **Real-time Listeners:** Replaced `getDoc` fetches with `onSnapshot` listeners for both memberships and notifications.
*   **Zero Ghosting:** Deleting a membership physically removes the person from the club list in real-time.

## Firestore Schema Usage
*   `profiles/{uid}`: Single source of identity (Name, Gender, Medical Notes).
*   `memberships/{clubId_uid}`: Links identity to a club with a specific role and status.
*   `notifications`: Global real-time collection for admin alerts.
