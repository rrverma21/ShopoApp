# Seller Registration OTP Setup Guide

This document outlines the setup process for the two-factor OTP registration flow for sellers.

## Prerequisites
1. MSG91 Account with DLT approved templates.
2. Resend Account (or configured SMTP) for Email OTP.
3. Supabase Project with Edge Functions enabled.

## MSG91 Configuration
1. Login to MSG91 dashboard.
2. Go to **API Keys** and generate a new Auth Key.
3. Go to **DLT Registration** (India) and ensure your Sender ID is approved.
4. Register the following SMS Template:
   > "Your OTP for seller registration is: {#var1#}. Valid for 5 minutes. Do not share."
5. Note the `Template ID`.

## Environment Variables
Add the following to your `.env` file for local development, and to your Supabase Edge Function Secrets: