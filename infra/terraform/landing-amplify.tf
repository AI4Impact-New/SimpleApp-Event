resource "aws_amplify_app" "landing" {
  name                 = "AI4Impact Landing"
  platform             = "WEB"
  iam_service_role_arn = aws_iam_role.amplify_hosting.arn
  build_spec           = file("${path.module}/../../amplify.yml")
  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "landing-page"
    AMPLIFY_LANDING_EXPORT    = "true"
    AMPLIFY_DIFF_DEPLOY       = "false"
  }
  lifecycle {
    ignore_changes = [repository, access_token, oauth_token, custom_rule]
  }
}
resource "aws_amplify_branch" "landing_main" {
  app_id            = aws_amplify_app.landing.id
  branch_name       = "main"
  framework         = "Web"
  stage             = "PRODUCTION"
  enable_auto_build = true
  environment_variables = {
    AMPLIFY_BACKEND_APP_ID = aws_amplify_app.landing.id
    USER_BRANCH            = "main"
  }
}
output "landing_page_url" {
  value = "https://main.${aws_amplify_app.landing.default_domain}"
}
output "landing_amplify_app_id" {
  value = aws_amplify_app.landing.id
}
