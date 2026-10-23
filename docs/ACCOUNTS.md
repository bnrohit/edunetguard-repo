# EduNetGuard Accounts

EduNetGuard accounts are independent from the monitoring engine administrator login.

## Roles

### user

Created with `USER_JOIN_CODE`.

A user can:

- sign in to EduNetGuard
- open `/me`
- save their own favorite monitors
- keep a personalized operational dashboard

A normal user cannot open the EduNetGuard Admin Console.

### admin

Created with `ADMIN_JOIN_CODE`.

An admin can do everything a normal user can and can also:

- open `/admin`
- see the EduNetGuard account list
- open Monitor Management when that service is reachable

The monitoring engine still uses its own separate administrator login for changing monitor configuration.

## Registration workflow

1. Administrator chooses a shared `USER_JOIN_CODE`.
2. Administrator gives that code to an approved person.
3. The person opens EduNetGuard and selects **Sign In → Create Account**.
4. They choose their own username and password.
5. The backend validates the join code and stores only the user record and password hash.
6. They are signed in and can personalize `/me`.

The join code is not saved in the user record.

## Password storage

Passwords use:

- a random per-user salt
- Node.js `crypto.scrypt`
- timing-safe verification

The account file does not contain recoverable plaintext passwords.

## Sessions

Sessions are:

- signed with `AUTH_SECRET`
- stored in an HttpOnly cookie
- SameSite=Lax
- 12 hours by default
- marked Secure when `COOKIE_SECURE=true`

Changing `AUTH_SECRET` signs everyone out but does not delete accounts.

## Join-code rotation

Changing or clearing a join code does **not** disable existing accounts.

To close normal registration:

```env
USER_JOIN_CODE=
```

To close new administrator registration after your admin account exists:

```env
ADMIN_JOIN_CODE=
```

Then recreate the backend:

```bash
docker compose up -d --force-recreate backend
```

## Persistent storage

Accounts and favorites are stored in the Docker volume:

```text
edunetguard-user-data
```

Back it up along with `uptime-kuma-data`.
