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
