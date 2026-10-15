# Existing console identity is retained; only its frontend access is managed here.
resource "aws_iam_role" "amplify_hosting" {
  name               = "AI4Impact-AmplifyHosting"
  assume_role_policy = file("${path.module}/policies/amplify-trust.json")
}
resource "aws_iam_role_policy" "amplify_logs" {
  name   = "AmplifyHostingLogs"
  role   = aws_iam_role.amplify_hosting.name
  policy = file("${path.module}/policies/amplify-logs.json")
}
resource "aws_iam_user_policy" "frontend_hosting" {
  name   = "AI4ImpactFrontendHosting"
  user   = "GayathriAI4"
  policy = file("${path.module}/policies/frontend-access.json")
}

# Reusable inspection permissions for frontend integration and troubleshooting.
resource "aws_iam_group" "frontend_engineers" {
  name = "AI4ImpactFrontendEngineers"
}
resource "aws_iam_policy" "frontend_backend_read" {
  # Restore environment visibility only after credentials leave function configuration.
  depends_on  = [aws_lambda_function.events, aws_lambda_function.attendance, aws_lambda_function.polls, aws_lambda_function.materials, aws_lambda_function.analytics, aws_lambda_function.users, aws_lambda_function.courses, aws_lambda_function.learning, aws_lambda_function.notifications]
  name        = "AI4ImpactFrontendBackendRead"
  description = "Project API, Lambda, Cognito, logs, metrics and media configuration inspection"
  policy      = file("${path.module}/policies/frontend-backend-read.json")
}
resource "aws_iam_group_policy_attachment" "frontend_backend_read" {
  group      = aws_iam_group.frontend_engineers.name
  policy_arn = aws_iam_policy.frontend_backend_read.arn
}
resource "aws_iam_user_group_membership" "gayathri_frontend" {
  user   = "GayathriAI4"
  groups = [aws_iam_group.frontend_engineers.name]
}

# Gayathri can connect hosting domains, create public zones and edit web/validation
# records. Domain registration/purchases, zone deletion and mail/delegation record
# changes are intentionally outside this domain-attachment permission set.
resource "aws_iam_policy" "amplify_custom_domain_access" {
  name        = "AmplifyCustomDomainAccess"
  description = "AI4Impact Amplify domain attachment, public DNS setup and certificate inspection"
  policy      = file("${path.module}/policies/amplify-custom-domain-access.json")
}
resource "aws_iam_user_policy_attachment" "gayathri_custom_domain_access" {
  user       = "GayathriAI4"
  policy_arn = aws_iam_policy.amplify_custom_domain_access.arn
}
