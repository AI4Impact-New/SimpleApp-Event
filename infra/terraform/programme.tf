variable "resend_templates_enabled" {
  type    = bool
  default = false
}
# Non-AI Programme+ API routes and durable, isolated delivery channels.
variable "programme_notifications_enabled" {
  type    = bool
  default = false
}
variable "transactional_reply_to" {
  type    = string
  default = ""
}
resource "aws_secretsmanager_secret" "resend_webhook" {
  name                    = "${var.project_name}/resend-webhook"
  recovery_window_in_days = 30
}
resource "aws_apigatewayv2_route" "programme" {
  for_each           = toset(["ANY /programme/{proxy+}"])
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.learning.id}"
}
resource "aws_apigatewayv2_route" "programme_public" {
  for_each           = toset(["GET /public/webinars", "POST /public/webinars/{id}/registrations", "POST /public/webinars/{id}/metrics", "POST /webhooks/resend", "OPTIONS /public/{proxy+}", "OPTIONS /programme/{proxy+}"])
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = each.value
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.learning.id}"
}
resource "aws_iam_role_policy" "learning_webhook_secret" {
  name = "resend-webhook-verification"
  role = aws_iam_role.learning.name
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = aws_secretsmanager_secret.resend_webhook.arn
  }] })
}
resource "aws_kms_key" "programme_queue" {
  description             = "Programme notification queue encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}
resource "aws_sqs_queue" "programme_dlq" {
  for_each                  = toset(["email", "push"])
  name                      = "${var.project_name}-programme-${each.key}-dlq"
  kms_master_key_id         = aws_kms_key.programme_queue.arn
  message_retention_seconds = 1209600
}
resource "aws_sqs_queue" "programme" {
  for_each                   = toset(["email", "push"])
  name                       = "${var.project_name}-programme-${each.key}"
  kms_master_key_id          = aws_kms_key.programme_queue.arn
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 420
  receive_wait_time_seconds  = 20
  redrive_policy             = jsonencode({ deadLetterTargetArn = aws_sqs_queue.programme_dlq[each.key].arn, maxReceiveCount = 5 })
}
resource "aws_sqs_queue_redrive_allow_policy" "programme" {
  for_each             = aws_sqs_queue.programme_dlq
  queue_url            = each.value.id
  redrive_allow_policy = jsonencode({ redrivePermission = "byQueue", sourceQueueArns = [aws_sqs_queue.programme[each.key].arn] })
}
resource "aws_iam_role" "programme_worker" {
  name               = "${var.project_name}-programme-worker"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "programme_vpc" {
  role       = aws_iam_role.programme_worker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy_attachment" "programme_db" {
  role       = aws_iam_role.programme_worker.name
  policy_arn = aws_iam_policy.lambda_secrets.arn
}
resource "aws_iam_role_policy" "programme_delivery" {
  role = aws_iam_role.programme_worker.name
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes"], Resource = [for q in aws_sqs_queue.programme : q.arn] },
    { Effect = "Allow", Action = ["kms:Decrypt", "kms:GenerateDataKey"], Resource = aws_kms_key.programme_queue.arn },
    { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = aws_secretsmanager_secret.resend_api_key.arn }
  ] })
}
locals {
  programme_worker_environment = merge(local.lambda_env, {
    PROGRAMME_NOTIFICATIONS_ENABLED = tostring(var.programme_notifications_enabled)
    TRANSACTIONAL_EMAIL_ENABLED     = tostring(var.transactional_email_enabled)
    RESEND_TEMPLATES_ENABLED        = tostring(var.resend_templates_enabled)
    TRANSACTIONAL_FROM_EMAIL        = "noreply@ai4impact.in"
    TRANSACTIONAL_REPLY_TO          = var.transactional_reply_to
    RESEND_API_KEY_SECRET_ARN       = aws_secretsmanager_secret.resend_api_key.arn
    EXPO_PROJECT_ID                 = var.expo_project_id
    EXPO_ACCESS_TOKEN               = var.expo_push_access_token
    EMAIL_RATE_PER_SECOND           = tostring(var.programme_email_rate)
    RELAY_BATCH_SIZE                = tostring(var.programme_relay_batch_size)
    EMAIL_QUEUE_URL                 = aws_sqs_queue.programme["email"].id
    PUSH_QUEUE_URL                  = aws_sqs_queue.programme["push"].id
  })
  programme_workers = { dispatch = 1, send = 2 * var.programme_sender_concurrency + 1, receipts = 1 }
}
resource "aws_cloudwatch_log_group" "programme" {
  for_each          = local.programme_workers
  name              = "/aws/lambda/${var.project_name}-programme-${each.key}"
  retention_in_days = 30
}
resource "aws_lambda_function" "programme_worker" {
  for_each                       = local.programme_workers
  function_name                  = "${var.project_name}-programme-${each.key}"
  role                           = aws_iam_role.programme_worker.arn
  runtime                        = var.python_runtime
  handler                        = "programme.worker.${each.key}"
  filename                       = "../../lambdas/learning.zip"
  source_code_hash               = filebase64sha256("../../lambdas/learning.zip")
  memory_size                    = 256
  timeout                        = 60
  reserved_concurrent_executions = each.value
  vpc_config {
    subnet_ids         = [aws_subnet.private["a"].id, aws_subnet.private["b"].id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  environment { variables = local.programme_worker_environment }
  depends_on = [aws_iam_role_policy_attachment.programme_vpc, aws_iam_role_policy_attachment.programme_db, aws_iam_role_policy.programme_delivery, aws_cloudwatch_log_group.programme, null_resource.build_lambdas]
}
resource "aws_lambda_event_source_mapping" "programme" {
  for_each                           = aws_sqs_queue.programme
  event_source_arn                   = each.value.arn
  function_name                      = aws_lambda_function.programme_worker["send"].arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
  enabled                            = var.programme_notifications_enabled
  scaling_config { maximum_concurrency = var.programme_sender_concurrency }
}
resource "aws_cloudwatch_event_rule" "programme" {
  name                = "${var.project_name}-programme-dispatch"
  schedule_expression = "rate(1 minute)"
  state               = var.programme_notifications_enabled ? "ENABLED" : "DISABLED"
}
resource "aws_cloudwatch_event_target" "programme" {
  for_each = toset(["dispatch", "receipts"])
  rule     = aws_cloudwatch_event_rule.programme.name
  arn      = aws_lambda_function.programme_worker[each.key].arn
}
resource "aws_lambda_permission" "programme_tick" {
  for_each      = toset(["dispatch", "receipts"])
  statement_id  = "AllowProgrammeTick"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.programme_worker[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.programme.arn
}
resource "aws_cloudwatch_metric_alarm" "programme_dlq" {
  for_each            = aws_sqs_queue.programme_dlq
  alarm_name          = "${var.project_name}-programme-${each.key}-deadletters"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = each.value.name }
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "programme_age" {
  for_each            = aws_sqs_queue.programme
  alarm_name          = "${var.project_name}-programme-${each.key}-backlog-age"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 300
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = each.value.name }
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_log_metric_filter" "programme_delivery_failures" {
  name           = "${var.project_name}-programme-delivery-failures"
  log_group_name = aws_cloudwatch_log_group.programme["send"].name
  pattern        = "{ $.event = \"notification_transition\" && ($.status = \"failed\" || $.status = \"uncertain\" || $.code = \"credentials_invalid\") }"
  metric_transformation {
    name          = "DeliveryFailures"
    namespace     = "${var.project_name}/Programme"
    value         = "1"
    default_value = 0
  }
}
resource "aws_cloudwatch_metric_alarm" "programme_delivery_failures" {
  alarm_name          = "${var.project_name}-programme-delivery-failures"
  namespace           = "${var.project_name}/Programme"
  metric_name         = "DeliveryFailures"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "programme_worker_errors" {
  for_each            = local.programme_workers
  alarm_name          = "${var.project_name}-programme-${each.key}-errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.programme_worker[each.key].function_name }
  alarm_actions       = [aws_sns_topic.operations.arn]
}
variable "programme_sender_concurrency" {
  type    = number
  default = 2
  validation {
    condition     = var.programme_sender_concurrency >= 2 && var.programme_sender_concurrency <= 10
    error_message = "Use 2-10 concurrent invocations per channel; load-test database capacity before increasing."
  }
}
variable "programme_relay_batch_size" {
  type    = number
  default = 1000
  validation {
    condition     = var.programme_relay_batch_size >= 10 && var.programme_relay_batch_size <= 5000
    error_message = "Relay batch size must be between 10 and 5000."
  }
}
variable "programme_email_rate" {
  type    = number
  default = 2
  validation {
    condition     = var.programme_email_rate >= 1 && var.programme_email_rate <= 50
    error_message = "Set a rate between 1 and 50 only after verifying the account's provider quota."
  }
}
