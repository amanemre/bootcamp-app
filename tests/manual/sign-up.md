# Sign-Up Feature — Test Cases

**Technique:** ISTQB Boundary-Value Analysis + Equivalence Partitioning
**Fields:** Username (required, unique, 6–20 chars) · Password (required, 10–15 chars, ≥1 uppercase, ≥1 lowercase, ≥1 special char, ≥1 number) · Email (required, unique) · Gender (required, dropdown: Male/Female) · Phone Number (optional) · Address (optional)

---

## Happy Path

---

### TC-001: Successful sign-up with all required fields only

**Preconditions:** The sign-up page is accessible. No existing account uses the username "alice99" or the email "alice@example.com".

**Steps:**
1. Navigate to the sign-up page.
2. Enter "alice99" in the Username field.
3. Enter "Secure@123x" in the Password field.
4. Enter "alice@example.com" in the Email field.
5. Select "Female" from the Gender dropdown.
6. Leave Phone Number and Address empty.
7. Click the Sign Up button.

**Expected Result:** The account is created. The user is redirected to the login page or dashboard. A success message is displayed. No account is created a second time for the same username or email.

**Severity:** Critical
**Status:** Draft

---

### TC-002: Successful sign-up with all fields including optional ones

**Preconditions:** The sign-up page is accessible. No existing account uses the username "bob2024" or the email "bob@example.com".

**Steps:**
1. Navigate to the sign-up page.
2. Enter "bob2024" in the Username field.
3. Enter "Hello!World9" in the Password field.
4. Enter "bob@example.com" in the Email field.
5. Select "Male" from the Gender dropdown.
6. Enter "+1-555-000-1234" in the Phone Number field.
7. Enter "123 Main Street, Springfield" in the Address field.
8. Click the Sign Up button.

**Expected Result:** The account is created with all provided data stored. The user is redirected to the login page or dashboard. A success message is displayed.

**Severity:** Critical
**Status:** Draft

---

## Boundary Values — Username

---

### TC-003: Sign-up with empty username

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave the Username field empty.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field stating that username is required.

**Severity:** Critical
**Status:** Draft

---

### TC-004: Sign-up with whitespace-only username

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Enter six space characters in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field. Whitespace-only input is not accepted as a valid username.

**Severity:** Major
**Status:** Draft

---

### TC-005: Sign-up with username at min−1 boundary (5 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Enter "abc12" (5 characters) in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field stating the username must be at least 6 characters.

**Severity:** Major
**Status:** Draft

---

### TC-006: Sign-up with username at minimum boundary (6 characters)

**Preconditions:** The sign-up page is accessible. No existing account uses the username "abc123".

**Steps:**
1. Navigate to the sign-up page.
2. Enter "abc123" (6 characters) in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The account is created. The 6-character username is accepted without error.

**Severity:** Major
**Status:** Draft

---

### TC-007: Sign-up with username at maximum boundary (20 characters)

**Preconditions:** The sign-up page is accessible. No existing account uses the username "abcdefghij1234567890".

**Steps:**
1. Navigate to the sign-up page.
2. Enter "abcdefghij1234567890" (20 characters) in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The account is created. The 20-character username is accepted without error.

**Severity:** Major
**Status:** Draft

---

### TC-008: Sign-up with username at max+1 boundary (21 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Enter "abcdefghij12345678901" (21 characters) in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field stating the username must not exceed 20 characters.

**Severity:** Major
**Status:** Draft

---

### TC-009: Sign-up with very long username (100 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Enter a 100-character string in the Username field.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field. The input is either rejected or truncated to the maximum allowed length of 20 characters.

**Severity:** Major
**Status:** Draft

---

## Boundary Values — Password

---

### TC-010: Sign-up with empty password

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Leave the Password field empty.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating that password is required.

**Severity:** Critical
**Status:** Draft

---

### TC-011: Sign-up with whitespace-only password

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter ten space characters in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field. Whitespace-only input is not accepted as a valid password.

**Severity:** Critical
**Status:** Draft

---

### TC-012: Sign-up with password at min−1 boundary (9 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure@1x" (9 characters, meets all complexity rules) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must be at least 10 characters.

**Severity:** Critical
**Status:** Draft

---

### TC-013: Sign-up with password at minimum boundary (10 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure@12x" (10 characters, meets all complexity rules) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The account is created. The 10-character password is accepted without error.

**Severity:** Critical
**Status:** Draft

---

### TC-014: Sign-up with password at maximum boundary (15 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure@12xyzAB!" (15 characters, meets all complexity rules) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The account is created. The 15-character password is accepted without error.

**Severity:** Critical
**Status:** Draft

---

### TC-015: Sign-up with password at max+1 boundary (16 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure@12xyzAB!9" (16 characters, meets all complexity rules) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must not exceed 15 characters.

**Severity:** Critical
**Status:** Draft

---

### TC-016: Sign-up with very long password (50 characters)

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter a 50-character string that meets all complexity rules in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field. The input is rejected or truncated to the maximum allowed length of 15 characters.

**Severity:** Critical
**Status:** Draft

---

## Equivalence Partitions — Password Complexity

---

### TC-017: Sign-up with password missing uppercase letter

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "secure@12xy" (10 characters, no uppercase letter) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must contain at least one uppercase letter.

**Severity:** Critical
**Status:** Draft

---

### TC-018: Sign-up with password missing lowercase letter

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "SECURE@12XY" (11 characters, no lowercase letter) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must contain at least one lowercase letter.

**Severity:** Critical
**Status:** Draft

---

### TC-019: Sign-up with password missing special character

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure1234X" (11 characters, no special character) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must contain at least one special character.

**Severity:** Critical
**Status:** Draft

---

### TC-020: Sign-up with password missing number

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "Secure@Pass!" (12 characters, no number) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating the password must contain at least one number.

**Severity:** Critical
**Status:** Draft

---

### TC-021: Sign-up with password that fails all complexity rules

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "abcdefghij" (10 characters, lowercase only, no uppercase, no number, no special character) in the Password field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. Error messages appear on the Password field listing all unmet complexity requirements.

**Severity:** Critical
**Status:** Draft

---

## Equivalence Partitions — Email

---

### TC-022: Sign-up with empty email

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Leave the Email field empty.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Email field stating that email is required.

**Severity:** Critical
**Status:** Draft

---

### TC-023: Sign-up with email missing the @ symbol

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "userexample.com" (no @ symbol) in the Email field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Email field stating the email address format is invalid.

**Severity:** Major
**Status:** Draft

---

### TC-024: Sign-up with email missing domain extension

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "user@example" (no top-level domain) in the Email field.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Email field stating the email address format is invalid.

**Severity:** Major
**Status:** Draft

---

### TC-025: Sign-up with valid email from a non-standard domain

**Preconditions:** The sign-up page is accessible. No existing account uses the email "user@subdomain.org".

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Enter "user@subdomain.org" in the Email field.
4. Click the Sign Up button.

**Expected Result:** The account is created. The email address is accepted without error.

**Severity:** Major
**Status:** Draft

---

## Equivalence Partitions — Gender

---

### TC-026: Sign-up without selecting a gender

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Fill all required fields with valid values.
3. Leave the Gender dropdown at its default unselected state.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Gender field stating that a gender selection is required.

**Severity:** Major
**Status:** Draft

---

## Negative Cases

---

### TC-027: Sign-up with a duplicate username

**Preconditions:** An account with the username "alice99" already exists in the system.

**Steps:**
1. Navigate to the sign-up page.
2. Enter "alice99" in the Username field.
3. Fill all other required fields with valid values different from the existing account.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears stating the username "alice99" is already taken. No new account is created.

**Severity:** Critical
**Status:** Draft

---

### TC-028: Sign-up with a duplicate email

**Preconditions:** An account with the email "alice@example.com" already exists in the system.

**Steps:**
1. Navigate to the sign-up page.
2. Enter a unique username in the Username field.
3. Enter "alice@example.com" in the Email field.
4. Fill all other required fields with valid values.
5. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears stating the email address is already registered. No new account is created.

**Severity:** Critical
**Status:** Draft

---

### TC-029: Sign-up with all required fields empty

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave all fields empty.
3. Click the Sign Up button.

**Expected Result:** The form is not submitted. Separate error messages appear on each required field: Username, Password, Email, and Gender. No account is created.

**Severity:** Critical
**Status:** Draft

---

### TC-030: Sign-up without entering a username

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave the Username field empty.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Username field stating that username is required. All other fields retain their entered values.

**Severity:** Critical
**Status:** Draft

---

### TC-031: Sign-up without entering a password

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave the Password field empty.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Password field stating that password is required. All other fields retain their entered values.

**Severity:** Critical
**Status:** Draft

---

### TC-032: Sign-up without entering an email

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave the Email field empty.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Email field stating that email is required. All other fields retain their entered values.

**Severity:** Critical
**Status:** Draft

---

### TC-033: Sign-up without selecting a gender

**Preconditions:** The sign-up page is accessible.

**Steps:**
1. Navigate to the sign-up page.
2. Leave the Gender dropdown at its default unselected state.
3. Fill all other required fields with valid values.
4. Click the Sign Up button.

**Expected Result:** The form is not submitted. An error message appears on the Gender field stating that a selection is required. All other fields retain their entered values.

**Severity:** Major
**Status:** Draft
