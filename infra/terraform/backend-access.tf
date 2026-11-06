# Project backend operators can deploy code; direct destructive APIs are blocked.
# Code deployment still has the execution role's DB/service powers (see runbook).
resource "aws_iam_group" "backend_engineers" {
  name = "AI4ImpactBackendEngineers"
}
resource "aws_iam_policy" "backend_access" {
  for_each    = toset(["compute", "data", "operations", "guardrails", "boundary"])
  name        = "AI4ImpactBackend${title(each.key)}"
  description = "AI4Impact backend engineering ${each.key}; scoped services and non-deletion guardrails"
  policy      = file("${path.module}/policies/backend-${each.key}.json")
}
resource "aws_iam_group_policy_attachment" "backend_access" {
  for_each   = toset(["compute", "data", "operations", "guardrails"])
  group      = aws_iam_group.backend_engineers.name
  policy_arn = aws_iam_policy.backend_access[each.key].arn
}
# Membership is additive so existing/future unrelated memberships are not removed.
resource "aws_iam_user_group_membership" "anish_backend" {
  user   = "AnishAI4"
  groups = [aws_iam_group.backend_engineers.name]
}

# Import the existing identity; console password and access keys stay unmanaged.
resource "aws_iam_user" "anish_backend" {
  name                 = "AnishAI4"
  permissions_boundary = aws_iam_policy.backend_access["boundary"].arn
  tags = {
    Team          = "AI4ImpactBackend"
    Role          = "BackendEngineer"
    AccessProfile = "AI4ImpactBackendEngineers"
  }
  lifecycle {
    prevent_destroy = true
  }
}
