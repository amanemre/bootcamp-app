# Test Case: Login Fails with Invalid Credentials

**Severity:** Critical
**Status:** Draft

## Preconditions

A valid user account exists in the system. The application is running and the login page is accessible.

## Steps

1. Navigate to the login page.
2. Enter a valid username in the username field.
3. Enter an incorrect password in the password field.
4. Click the Submit button.

## Expected Result

The login attempt is rejected. An error message appears on the page informing the user that the credentials are incorrect. The user remains on the login page and no authenticated session is created.
