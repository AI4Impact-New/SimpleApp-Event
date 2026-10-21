# GitHub connection is completed with the consulting organization account in Amplify.
resource "aws_amplify_app" "admin" {
  name                 = "AI4Impact Admin"
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify_hosting.arn
  build_spec           = file("${path.module}/../../amplify.yml")
  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "admin-dashboard"
  }
  lifecycle {
    ignore_changes = [repository, access_token, oauth_token]
  }
}
resource "aws_amplify_branch" "admin_main" {
  app_id            = aws_amplify_app.admin.id
  branch_name       = "main"
  framework         = "Next.js - SSR"
  stage             = "PRODUCTION"
  enable_auto_build = true
  environment_variables = {
    NEXT_PUBLIC_API_URL               = trimsuffix(aws_apigatewayv2_stage.main.invoke_url, "/")
    NEXT_PUBLIC_COGNITO_USER_POOL_ID  = aws_cognito_user_pool.main.id
    NEXT_PUBLIC_COGNITO_APP_CLIENT_ID = aws_cognito_user_pool_client.main.id
    NEXT_PUBLIC_COGNITO_REGION        = var.aws_region
    NEXT_PUBLIC_COGNITO_DOMAIN        = aws_cognito_user_pool_domain.main.domain
    NEXT_PUBLIC_APP_URL               = "https://admin.ai4impact.in"
  }
}
output "admin_console_url" {
  value = "https://main.${aws_amplify_app.admin.default_domain}"
}
output "admin_amplify_app_id" {
  value = aws_amplify_app.admin.id
}
