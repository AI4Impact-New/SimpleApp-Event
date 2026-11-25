# Secret values are provisioned by configure_razorpay.py, never Terraform state.
resource "aws_secretsmanager_secret" "razorpay" {
  name                    = "${var.project_name}/razorpay"
  recovery_window_in_days = 30
}
variable "razorpay_enabled" {
  type    = bool
  default = false
}
variable "course_gst_enabled" {
  description = "Charge 18% GST on new standard course checkout orders after applying migration 025."
  type        = bool
  default     = false
}
resource "aws_iam_role_policy" "learning_payments" {
  name = "razorpay-secret"
  role = aws_iam_role.learning.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = aws_secretsmanager_secret.razorpay.arn
  }] })
}
resource "aws_apigatewayv2_route" "razorpay_webhook" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /webhooks/razorpay"
  target    = "integrations/${aws_apigatewayv2_integration.learning.id}"
}
resource "aws_cloudwatch_event_rule" "payments" {
  name                = "${var.project_name}-payments-reconcile"
  schedule_expression = "rate(2 minutes)"
}
resource "aws_cloudwatch_event_target" "payments" {
  rule  = aws_cloudwatch_event_rule.payments.name
  arn   = aws_lambda_function.learning.arn
  input = jsonencode({ source = "ai4impact.payments.reconcile" })
}
resource "aws_lambda_permission" "payments_schedule" {
  statement_id   = "PaymentReconciliation"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.learning.function_name
  principal      = "events.amazonaws.com"
  source_arn     = aws_cloudwatch_event_rule.payments.arn
  source_account = data.aws_caller_identity.current.account_id
}
resource "aws_cloudwatch_metric_alarm" "payments_backlog" {
  alarm_name          = "${var.project_name}-payment-webhook-backlog"
  alarm_description   = "Payment events unprocessed for over 15 minutes; inspect Razorpay authentication and worker logs"
  namespace           = "AI4Impact/Payments"
  metric_name         = "WebhookBacklogAge"
  dimensions          = { Service = "checkout" }
  statistic           = "Maximum"
  period              = 300
  threshold           = 900
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
