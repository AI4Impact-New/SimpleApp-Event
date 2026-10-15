# Cognito User Pool for AI4Impact

# Unique domain for hosted UI (Cognito domains are unique per account/region; default includes account ID to avoid conflicts)
locals {
  cognito_domain = var.cognito_domain != "" ? var.cognito_domain : "${var.project_name}-${data.aws_caller_identity.current.account_id}"
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = var.cognito_pool_name

  # Username attributes
  username_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # Auto-verified attributes
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Post-confirmation: add new sign-ups to the Terraform-managed Students group.
  lambda_config {
    post_confirmation = aws_lambda_function.cognito_post_confirm.arn
  }

  # Branded messages apply to student and employee accounts in this pool.
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    sms_message          = "Your AI4Impact verification code is {####}."
    email_subject        = "AI4Impact | Your verification code"
    email_message = templatefile("${path.module}/templates/cognito-email.html.tftpl", {
      title         = "Your next step starts here"
      preview       = "Use your AI4Impact verification code to continue."
      intro         = "Welcome to the inner circle, where curious minds build the future. Use the code below to continue the account action you requested."
      credentials   = "<strong>Your verification code</strong><br><span style='font-size:28px;font-family:monospace;letter-spacing:4px;'>{####}</span>"
      instructions  = "Return to the AI4Impact screen where you requested this code and enter it there. Keep this code private."
      signin_links  = "<p style='margin:0;font-size:15px;'><a href='https://main.${aws_amplify_app.landing.default_domain}' style='color:#008c7d;font-weight:bold;'>Explore AI4Impact</a></p>"
      security_note = "If you didn’t request this code, you can ignore this email. Never share your verification code with anyone."
      website_url   = "https://main.${aws_amplify_app.landing.default_domain}"
      logo_url      = "https://main.${aws_amplify_app.landing.default_domain}/email-logo.png"
    })
  }

  # App-managed AdminCreateUser currently creates employees only (users/service.py).
  # Student signup uses the verification template above. Student password invitations
  # require a recipient-aware custom trigger and a verified SES sender before rollout.
  # Do not use the employee invitation template for console-created student accounts.
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      sms_message   = "Welcome to AI4Impact. Username: {username}. Temporary password: {####}."
      email_subject = "Welcome to the inner circle | AI4Impact"
      email_message = templatefile("${path.module}/templates/cognito-email.html.tftpl", {
        title         = "Welcome to the inner circle"
        preview       = "Your AI4Impact account is ready. Let’s build what comes next."
        intro         = "You’re part of AI4Impact, where curious minds learn, create and build the future. We’re excited to have you on the team."
        credentials   = "<strong>Sign-in username</strong><br>{username}<br><br><strong>Temporary password</strong><br><span style='font-size:20px;font-family:monospace;'>{####}</span>"
        instructions  = "Your workspace is ready. Use the link below to sign in with these details, then follow the prompt to choose your own password."
        signin_links  = "<p style='margin:0;font-size:15px;'><a href='https://main.${aws_amplify_app.admin.default_domain}/login' style='color:#008c7d;font-weight:bold;'>Sign in to AI4Impact</a></p>"
        security_note = "Keep your temporary password private. If you weren’t expecting this invitation or need a fresh invitation, contact the AI4Impact team through your usual channel."
        website_url   = "https://main.${aws_amplify_app.admin.default_domain}/login"
        logo_url      = "https://main.${aws_amplify_app.landing.default_domain}/email-logo.png"
      })
    }
  }

  # Device tracking
  device_configuration {
    challenge_required_on_new_device = true
  }

  # Tags
  tags = {
    Name = var.cognito_pool_name
  }
}

# Cognito App Client
resource "aws_cognito_user_pool_client" "main" {
  name         = var.cognito_client_name
  user_pool_id = aws_cognito_user_pool.main.id

  # Required for mobile app (Amplify) sign-in with email/password; otherwise Cognito returns generic errors.
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  # OAuth settings (Hosted UI)
  # Callback URLs: where Cognito redirects after sign-in (Hosted UI).
  # Sign out URLs: where Cognito may redirect after sign-out; must match logout_uri/redirect_uri in app.
  supported_identity_providers = ["COGNITO"]
  callback_urls                = concat(["https://app.payintelli.com/callback", "http://localhost:3000/callback", "https://main.${aws_amplify_app.admin.default_domain}/callback"], [for origin in var.admin_custom_origins : "${origin}/callback"])
  logout_urls = concat([
    "https://app.payintelli.com/logout",
    "http://localhost:3000/logout",
    "https://app.payintelli.com/login",
    "http://localhost:3000/login",
    "https://main.${aws_amplify_app.admin.default_domain}/login",
    "https://main.${aws_amplify_app.admin.default_domain}/logout",
  ], flatten([for origin in var.admin_custom_origins : ["${origin}/login", "${origin}/logout"]]))

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"]

  # Token settings (in hours)
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  # Enable token refresh
  enable_token_revocation = true

  # Security
  prevent_user_existence_errors = "ENABLED"
}

# Cognito Identity Pool (for unauthenticated access if needed)
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = {
    Name = "${var.project_name}-identity-pool"
  }
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = local.cognito_domain
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito groups are managed with the rest of the infrastructure.

resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.main.id
}
resource "aws_cognito_user_group" "students" {
  name         = "Students"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_group" "marketing" {
  name         = "Marketing"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Enquiry contacts and follow-up only; no course, learner-account or infrastructure administration"
}
