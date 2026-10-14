# Cognito User Pool for PayIntelli Academy

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

  # Admin create user (disabled for security)
  admin_create_user_config {
    allow_admin_create_user_only = false
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
  callback_urls                = ["https://app.payintelli.com/callback", "http://localhost:3000/callback"]
  logout_urls = [
    "https://app.payintelli.com/logout",
    "http://localhost:3000/logout",
    "https://app.payintelli.com/login",
    "http://localhost:3000/login",
  ]

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
