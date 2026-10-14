resource "aws_iam_role" "notifications" {
  name               = "${var.project_name}-notifications-role"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "notifications_vpc" {
  role       = aws_iam_role.notifications.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_cloudwatch_log_group" "notifications" {
  name              = "/aws/lambda/${var.project_name}-notifications"
  retention_in_days = 30
}
resource "aws_lambda_function" "notifications" {
  function_name                  = "${var.project_name}-notifications"
  role                           = aws_iam_role.notifications.arn
  runtime                        = var.python_runtime
  handler                        = "notifications.handler.handler"
  filename                       = "../../lambdas/notifications.zip"
  source_code_hash               = filebase64sha256("../../lambdas/notifications.zip")
  memory_size                    = 256
  timeout                        = 60
  reserved_concurrent_executions = 1
  vpc_config {
    subnet_ids         = [aws_subnet.private["a"].id, aws_subnet.private["b"].id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  environment { variables = merge(local.lambda_env, { EXPO_ACCESS_TOKEN = var.expo_push_access_token, EXPO_PROJECT_ID = var.expo_project_id }) }
  depends_on = [aws_iam_role_policy_attachment.notifications_db_secret, aws_iam_role_policy_attachment.notifications_vpc, aws_cloudwatch_log_group.notifications, null_resource.build_lambdas]
}
resource "aws_cloudwatch_event_rule" "notifications" {
  name                = "${var.project_name}-push-outbox"
  schedule_expression = "rate(1 minute)"
}
resource "aws_cloudwatch_event_target" "notifications" {
  rule      = aws_cloudwatch_event_rule.notifications.name
  target_id = "notifications"
  arn       = aws_lambda_function.notifications.arn
}
resource "aws_lambda_permission" "notifications_schedule" {
  statement_id  = "AllowPushSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifications.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.notifications.arn
}

resource "aws_iam_role_policy_attachment" "notifications_db_secret" {
  role       = aws_iam_role.notifications.name
  policy_arn = aws_iam_policy.lambda_secrets.arn
}
