# BoardBuddy Authentication & Approval Flow Test Instructions

This document provides step-by-step instructions to verify that the registration, Super Admin approval gate, and login authentication function accurately and reliably.

---

## Overview of Auth & Gate Architecture

1. **Registration Flow**:
   - Applicant submits full name, Gmail address, password, reviewee category, institution, and required student ID / certificate file.
   - Server creates a Supabase Auth account with `email_confirm: true` (no email confirmation link required).
   - Profile is saved with `verification_status = 'PENDING_VERIFICATION'`.
   - The UI immediately shows a modal stating: *"Please wait for the Super Admin to approve your account."*

2. **Pending Login Block**:
   - An unapproved student attempting to sign in with valid credentials is rejected with HTTP `403 Forbidden`:
     `"Please wait for the Super Admin to approve your account."`
   - No auth session or JWT token is issued to unapproved users.

3. **Super Admin Verification**:
   - Super Admin accesses **Admin Dashboard > Registration Verification**.
   - Reviewer previews the applicant's uploaded document and OCR metadata.
   - Admin clicks **Approve**.
   - Server updates `profiles.verification_status = 'APPROVED'`.

4. **Approved Login**:
   - The approved student signs in with their email and password.
   - `signInWithPassword` verifies credentials with Supabase Auth.
   - Server checks `verification_status === 'APPROVED'` and grants access with a valid session token.

5. **Invalid Password Protection**:
   - Entering an incorrect password triggers `signInWithPassword` failure in Supabase Auth.
   - Server logs `[Login Auth Error]: Invalid login credentials` and returns HTTP `401 Unauthorized` (`"Invalid email or password."`).
   - No session is issued, and no bypass or fallback occurs.

---

## Step-by-Step Verification Procedure

### Test 1: Register New Student
1. Open BoardBuddy landing page and click **Register**.
2. Fill in:
   - Full Name: `Test Student`
   - Gmail Address: `test.student.2026@gmail.com`
   - Password: `Password123!`
   - Category: `Graduating Education Student`
   - Institution: `Philippine Normal University`
   - Upload: A valid JPG/PNG Student ID
   - Privacy Policy: Checked
3. Click **Register Account**.
4. **Expected Result**: Modal displays *"Registration Submitted"* with message *"Please wait for the Super Admin to approve your account."*

### Test 2: Attempt Login Before Admin Approval
1. Open Login modal.
2. Enter email `test.student.2026@gmail.com` and password `Password123!`.
3. Click **Sign In**.
4. **Expected Result**: Login is blocked with amber notice: *"Please wait for the Super Admin to approve your account."* (HTTP 403 response).

### Test 3: Attempt Login with Wrong Password
1. In Login modal, enter email `test.student.2026@gmail.com` and password `WrongPassword999`.
2. Click **Sign In**.
3. **Expected Result**: Login fails with error: *"Invalid email or password."* (HTTP 401 response). Check server console for `[Login Auth Error]` log.

### Test 4: Super Admin Approval
1. Log in as Super Admin (`boardbuddy.team@gmail.com` or configured admin email).
2. Go to **Admin Dashboard** -> **Registration Verification** tab.
3. Locate `test.student.2026@gmail.com` under the **Pending** tab.
4. Click **Approve**.
5. **Expected Result**: Student status changes to **Approved**.

### Test 5: Login as Approved Student
1. Log out of Super Admin account.
2. In Login modal, enter email `test.student.2026@gmail.com` and password `Password123!`.
3. Click **Sign In**.
4. **Expected Result**: Login succeeds immediately and redirects student to the main BoardBuddy study portal.
