#!/bin/bash
set -e
BASE=http://localhost:3003

# Login as staff
LOGIN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anggiadiputra@gmail.com","password":"password123"}')
echo "Login step 1: $LOGIN"

# Get OTP from dev mailer (skip — try with fake)
# Check users in DB for OTP
