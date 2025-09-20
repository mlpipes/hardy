# AWS SES Setup Guide for Hardy Auth

This guide will help you set up Amazon SES (Simple Email Service) for production email sending in Hardy Auth.

## 🎯 Overview

AWS SES is a reliable, scalable email service for transactional emails like:
- Email verification
- Password reset
- Two-factor authentication codes
- Organization invitations

## 📋 Prerequisites

- AWS Account
- A domain name you control
- Access to DNS settings for your domain

## 🔧 Step 1: AWS SES Configuration

### 1.1 Create AWS Account & Access SES
1. Log into AWS Console
2. Navigate to **Simple Email Service (SES)**
3. Select your preferred region (recommend `us-east-1` for global reach)

### 1.2 Verify Your Domain
1. Go to **Configuration > Verified identities**
2. Click **Create identity**
3. Select **Domain**
4. Enter your domain (e.g., `hardy-auth.com`)
5. Choose **Easy DKIM** (recommended)
6. Click **Create identity**

### 1.3 Add DNS Records
AWS will provide DNS records to add to your domain:

```dns
# DKIM Records (3 CNAME records)
ses-dkim-1._domainkey.yourapp.com. CNAME ses-dkim-1.xxxxxxx.dkim.amazonses.com
ses-dkim-2._domainkey.yourapp.com. CNAME ses-dkim-2.xxxxxxx.dkim.amazonses.com
ses-dkim-3._domainkey.yourapp.com. CNAME ses-dkim-3.xxxxxxx.dkim.amazonses.com

# Verification Record (TXT record)
_amazonses.yourapp.com. TXT "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 1.4 Request Production Access
Initially, SES is in "Sandbox Mode" (can only send to verified emails):

1. Go to **Account dashboard**
2. Click **Request production access**
3. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: Your app URL
   - **Use case description**:
     ```
     Healthcare authentication system sending transactional emails:
     - Email verification for new users
     - Password reset notifications
     - Two-factor authentication codes
     - Organization member invitations

     Expected volume: <your estimate> emails/day
     Bounce rate: <1%
     Complaint rate: <0.1%
     ```
4. Submit request (usually approved within 24-48 hours)

## 🔐 Step 2: AWS IAM Configuration

### 2.1 Create IAM User for SES
1. Go to **IAM Console**
2. Click **Users** > **Add users**
3. Username: `hardy-auth-ses`
4. Access type: **Programmatic access**
5. Click **Next: Permissions**

### 2.2 Create SES Policy
1. Click **Attach existing policies directly**
2. Click **Create policy**
3. Choose **JSON** tab and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics"
            ],
            "Resource": "*"
        }
    ]
}
```

4. Name: `HardyAuthSESPolicy`
5. Click **Create policy**
6. Attach this policy to your user

### 2.3 Get Access Keys
1. Complete user creation
2. **Download** or copy the Access Key ID and Secret Access Key
3. Store these securely (you won't see the secret again)

## ⚙️ Step 3: Hardy Auth Configuration

### 3.1 Environment Variables
Add to your `.env.local`:

```env
# AWS SES Configuration
AWS_ACCESS_KEY_ID="your_access_key_id_here"
AWS_SECRET_ACCESS_KEY="your_secret_access_key_here"
AWS_SES_REGION="us-east-1"
AWS_SES_FROM_EMAIL="noreply@yourapp.com"
```

### 3.2 Verify Configuration
Run this test to verify your setup:

```bash
# Start your app
npm run dev

# Register a new user or trigger email verification
# Check logs for: "✅ Email sent successfully to: user@example.com"
```

## 📧 Step 4: Email Templates & Best Practices

### 4.1 From Email Address
- Use a subdomain: `noreply@auth.yourapp.com`
- Don't use `no-reply` - use `noreply` (better deliverability)
- Consider: `verify@yourapp.com` or `auth@yourapp.com`

### 4.2 Email Content Guidelines
- Include clear sender identification
- Add unsubscribe links (for marketing emails)
- Use both HTML and text versions
- Keep subject lines under 50 characters
- Include security warnings for sensitive actions

### 4.3 Monitoring & Analytics
1. **SES Console** > **Reputation tracking**
   - Monitor bounce rate (<5%)
   - Monitor complaint rate (<0.1%)
   - Watch for blocks/reputation issues

2. **CloudWatch Metrics**
   - Set up alarms for high bounce/complaint rates
   - Monitor sending quotas

## 🚨 Step 5: Troubleshooting

### Common Issues:

**"Email address not verified"**
- Solution: Add individual email addresses to SES verified identities (sandbox mode)

**"MessageRejected: Email address not verified"**
- Solution: Request production access or verify recipient email

**"Bounce rate too high"**
- Solution: Clean email lists, use double opt-in, validate email addresses

**"Daily sending quota exceeded"**
- Solution: Request quota increase in SES console

### Test Commands:

```bash
# Test AWS credentials
aws ses get-send-quota --region us-east-1

# Test send email (replace with your verified email)
aws ses send-email \
  --from noreply@yourapp.com \
  --destination ToAddresses=test@yourapp.com \
  --message Subject={Data="Test"},Body={Text={Data="Test message"}} \
  --region us-east-1
```

## 📊 Step 6: Production Considerations

### 6.1 Sending Limits
- **Sandbox**: 200 emails/day, 1 email/second
- **Production**: Starts at 200/day, 1/second (can request increases)
- **Max send rate**: Can increase to 14 emails/second

### 6.2 Cost Optimization
- **First 62,000 emails/month**: Free (if sent from EC2)
- **After free tier**: $0.10 per 1,000 emails
- **No setup fees or minimum commitments**

### 6.3 Compliance
- **GDPR**: Include data processing information
- **CAN-SPAM**: Add unsubscribe for marketing emails
- **HIPAA**: Enable encryption in transit (SES provides this)

## ✅ Step 7: Verification Checklist

- [ ] Domain verified in SES
- [ ] DNS records added and propagated
- [ ] Production access approved
- [ ] IAM user created with minimal permissions
- [ ] Environment variables configured
- [ ] Test emails sending successfully
- [ ] Monitoring alerts set up
- [ ] Bounce/complaint handling implemented

## 🔗 Useful Links

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [SES Sending Limits](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/manage-sending-limits.html)
- [Email Authentication](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/email-authentication.html)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/best-practices.html)

---

**Need Help?** If you encounter issues during setup, check the AWS SES console for specific error messages and consult the troubleshooting section above.